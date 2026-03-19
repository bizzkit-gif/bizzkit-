import React, { useState, useEffect, useCallback } from 'react'
import { supabase, Business, INDUSTRIES, getGrad } from '../lib/supabase'
import { useApp } from '../context/AppContext'

interface Props { onViewBusiness: (id: string) => void }

export default function FeedPage({ onViewBusiness }: Props) {
  const { myBusiness, user, toast } = useApp()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchBusinesses = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('businesses')
      .select('*, products(*)')
      .order('trust_score', { ascending: false })
    setBusinesses((data ?? []).filter(b => b.id !== myBusiness?.id))
    setLoading(false)
  }, [myBusiness?.id])

  const fetchSaved = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('saved_businesses').select('business_id').eq('user_id', user.id)
    setSaved(new Set(data?.map(s => s.business_id) ?? []))
  }, [user])

  const fetchConnections = useCallback(async () => {
    if (!myBusiness) return
    const { data } = await supabase.from('connections').select('to_biz_id').eq('from_biz_id', myBusiness.id)
    setConnected(new Set(data?.map(c => c.to_biz_id) ?? []))
  }, [myBusiness?.id])

  useEffect(() => { fetchBusinesses(); fetchSaved(); fetchConnections() }, [fetchBusinesses, fetchSaved, fetchConnections])

  const filtered = businesses.filter(b => {
    const mf = filter === 'All' || b.industry === filter
    const ms = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.industry.toLowerCase().includes(search.toLowerCase())
    return mf && ms
  })

  const trending = filtered.filter(b => b.trust_score >= 70).slice(0, 4)

  const handleSave = async (biz: Business) => {
    if (!user) { toast('Sign in to save businesses', 'info'); return }
    const isSaved = saved.has(biz.id)
    if (isSaved) {
      await supabase.from('saved_businesses').delete().eq('user_id', user.id).eq('business_id', biz.id)
      setSaved(s => { const n = new Set(s); n.delete(biz.id); return n })
      toast('Removed from saved')
    } else {
      await supabase.from('saved_businesses').insert({ user_id: user.id, business_id: biz.id })
      setSaved(s => new Set([...s, biz.id]))
      toast('Saved!')
    }
  }

  const handleConnect = async (biz: Business) => {
    if (!myBusiness) { toast('Create a business profile first', 'info'); return }
    if (connected.has(biz.id)) { toast('Already connected!', 'info'); return }
    await supabase.from('connections').insert([
      { from_biz_id: myBusiness.id, to_biz_id: biz.id },
      { from_biz_id: biz.id, to_biz_id: myBusiness.id },
    ])
    await supabase.from('businesses').update({ followers: (biz.followers ?? 0) + 1 }).eq('id', biz.id)
    await supabase.rpc('get_or_create_chat', { biz_a: myBusiness.id, biz_b: biz.id })
    setConnected(s => new Set([...s, biz.id]))
    toast('Connected with ' + biz.name + '!')
  }

  const tierColor = (score: number) => score >= 90 ? 'var(--blue)' : score >= 75 ? 'var(--gold)' : score >= 50 ? 'var(--gray)' : '#CD7C2F'

  const scrollStyle: React.CSSProperties = { display: 'flex', gap: 11, padding: '0 16px 4px', overflowX: 'auto', msOverflowStyle: 'none' }

  return (
    <div style={{ paddingBottom: 16 }}>
      <div className="topbar">
        <div className="topbar-logo">bizz<span>kit</span></div>
        <div style={{ display: 'flex', gap: 7 }}>
          <div className="icon-btn">🔔</div>
          {myBusiness && <div className="avatar-btn">{myBusiness.logo.slice(0, 2)}</div>}
        </div>
      </div>

      <div className="search-bar">
        <span style={{ fontSize: 15, color: 'var(--gray)' }}>🔍</span>
        <input placeholder="Search businesses, products…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <span style={{ cursor: 'pointer', color: 'var(--gray)', fontSize: 18 }} onClick={() => setSearch('')}>×</span>}
      </div>

      {!search && (
        <div style={{ margin: '0 16px 15px', borderRadius: 18, padding: '18px 18px 16px', background: 'linear-gradient(135deg,#0C2340,#1A3D6E)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle,rgba(30,126,247,.25),transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', color: 'var(--blue2)', textTransform: 'uppercase', marginBottom: 6 }}>Featured Exhibition</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.3, position: 'relative', zIndex: 1 }}>
            MENA Tech<br /><span style={{ color: 'var(--accent)' }}>Showcase 2026</span>
          </div>
          <button className="btn btn-blue btn-sm" onClick={() => toast('Opening MENA Tech Showcase 2026', 'info')} style={{ position: 'relative', zIndex: 1 }}>Explore Now</button>
        </div>
      )}

      <div className="chips-row">
        {['All', ...INDUSTRIES.slice(0, 7)].map(ind => (
          <div key={ind} className={`chip ${filter === ind ? 'active' : ''}`} onClick={() => setFilter(ind)}>{ind}</div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>
      ) : (
        <>
          {!search && trending.length > 0 && (
            <>
              <div className="section-header"><h3>Trending Businesses</h3><span className="see-all">See all</span></div>
              <div style={scrollStyle}>
                {trending.map(biz => (
                  <div key={biz.id} onClick={() => onViewBusiness(biz.id)} style={{ width: 158, flexShrink: 0, background: 'var(--card)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border)' }}>
                    <div className={getGrad(biz.id)} style={{ height: 74, display: 'flex', alignItems: 'flex-end', padding: '0 9px 8px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#fff', background: 'rgba(0,0,0,.3)', border: '2px solid rgba(255,255,255,.2)' }}>{biz.logo}</div>
                    </div>
                    <div style={{ padding: '9px 10px 11px' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 700, color: 'var(--white)', lineHeight: 1.2 }}>{biz.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 3 }}>{biz.industry} · {biz.city}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
                        {biz.kyc_verified ? <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span className="kyc-dot" /><span style={{ fontSize: 9.5, color: 'var(--green)' }}>KYC</span></div> : <span style={{ fontSize: 9.5, color: 'var(--gray2)' }}>Unverified</span>}
                        <div style={{ fontSize: 10, fontWeight: 700, color: tierColor(biz.trust_score), background: 'rgba(245,166,35,.12)', padding: '2px 6px', borderRadius: 6 }}>⭐ {biz.trust_score}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ height: 14 }} />
            </>
          )}

          <div className="section-header">
            <h3>{search ? `Results for "${search}"` : 'All Businesses'}</h3>
            <span className="see-all">{filtered.length} found</span>
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="emoji">🔍</div>
              <h3>No businesses found</h3>
              <p>Try a different search or filter</p>
            </div>
          )}

          {filtered.map(biz => {
            const isSaved = saved.has(biz.id)
            const isConn = connected.has(biz.id)
            return (
              <div key={biz.id} style={{ margin: '0 16px 11px', background: 'var(--card)', borderRadius: 16, padding: 13, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                  <div className={getGrad(biz.id)} onClick={() => onViewBusiness(biz.id)} style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#fff', flexShrink: 0, cursor: 'pointer' }}>{biz.logo}</div>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => onViewBusiness(biz.id)}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 700, color: 'var(--white)' }}>{biz.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--gray)', marginTop: 2 }}>{biz.industry} · {biz.city}, {biz.country}</div>
                  </div>
                  {biz.kyc_verified && <span className="badge badge-kyc" style={{ flexShrink: 0 }}>✅ KYC</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--gray)', marginBottom: 9, lineHeight: 1.5 }}>{biz.tagline}</div>
                {(biz.products?.length ?? 0) > 0 && (
                  <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 9 }}>
                    {biz.products!.slice(0, 3).map(p => (
                      <div key={p.id} style={{ width: 86, flexShrink: 0, borderRadius: 11, background: 'var(--card2)', padding: '9px 7px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{p.emoji}</div>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--white)', textAlign: 'center', lineHeight: 1.3 }}>{p.name}</div>
                        <div style={{ fontSize: 9.5, color: 'var(--blue2)', fontWeight: 700, marginTop: 2 }}>{p.price}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, paddingTop: 9, borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => handleSave(biz)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: isSaved ? 'var(--accent)' : 'var(--gray)', background: 'none', border: 'none', flex: 1, padding: '5px', borderRadius: 7, cursor: 'pointer' }}>
                    {isSaved ? '💾 Saved' : '🔖 Save'}
                  </button>
                  <button onClick={() => toast('RFQ sent to ' + biz.name, 'info')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--gray)', background: 'none', border: 'none', flex: 1, padding: '5px', borderRadius: 7, cursor: 'pointer' }}>
                    📋 RFQ
                  </button>
                  <button onClick={() => handleConnect(biz)} className={`btn btn-sm ${isConn ? 'btn-ghost' : 'btn-blue'}`} style={{ flexShrink: 0 }}>
                    {isConn ? '✓ Connected' : 'Connect'}
                  </button>
                </div>
              </div>
            )
          })}
        </>
      )}
      <div style={{ height: 8 }} />
    </div>
  )
}
