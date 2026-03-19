import React, { useState, useEffect } from 'react'
import { sb, Business, Product, INDUSTRIES, COUNTRIES, EMOJIS, grad, logo, tier, tierIcon, tierColor } from '../lib/db'
import { useApp } from '../context/ctx'

const GRADS = ['gr1','gr2','gr3','gr4','gr5','gr6','gr7','gr8']

export default function ProfilePage({ viewId, onBack, onChat, onTrust }: { viewId?: string|null; onBack?: () => void; onChat?: (id: string) => void; onTrust?: () => void }) {
  const { user, myBiz, refreshBiz, toast } = useApp()
  const isOwn = !viewId || viewId === myBiz?.id
  const [biz, setBiz] = useState<Business|null>(null)
  const [tab, setTab] = useState<'products'|'about'>('products')
  const [editing, setEditing] = useState(false)
  const [isConn, setIsConn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOwn) { setBiz(myBiz); setLoading(false); return }
    sb.from('businesses').select('*,products(*)').eq('id', viewId!).single().then(({ data }) => { setBiz(data); setLoading(false) })
    if (myBiz && viewId) sb.from('connections').select('id').eq('from_biz_id', myBiz.id).eq('to_biz_id', viewId).single().then(({ data }) => setIsConn(!!data))
  }, [viewId, myBiz?.id])

  const doConnect = async () => {
    if (!myBiz || !biz) { toast('Create a profile first', 'info'); return }
    if (isConn) { toast('Already connected!', 'info'); return }
    await sb.from('connections').insert([{ from_biz_id: myBiz.id, to_biz_id: biz.id }, { from_biz_id: biz.id, to_biz_id: myBiz.id }])
    await sb.rpc('get_or_create_chat', { biz_a: myBiz.id, biz_b: biz.id })
    setIsConn(true)
    toast('Connected with ' + biz.name + '!')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
  if (editing && isOwn) return <BizForm existing={biz || undefined} onSaved={async () => { setEditing(false); await refreshBiz(); toast(biz ? 'Profile updated!' : 'Profile created!') }} onCancel={() => setEditing(false)} />
  if (isOwn && !myBiz) return <BizForm onSaved={async () => { await refreshBiz(); toast('Profile created!') }} />
  if (!biz) return <div style={{ padding: '80px 20px', textAlign: 'center', color: '#7A92B0' }}>Business not found</div>

  return (
    <div style={{ paddingBottom: 16 }}>
      <div className={grad(biz.id)} style={{ height: 170, position: 'relative' }}>
        {onBack && <button onClick={onBack} style={{ position: 'absolute', top: 14, left: 14, width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.35)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>}
        {isOwn && <button onClick={() => setEditing(true)} style={{ position: 'absolute', top: 14, right: 14, padding: '6px 13px', borderRadius: 10, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>✏️ Edit</button>}
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -34 }}>
          <div style={{ width: 68, height: 68, borderRadius: 17, background: 'linear-gradient(135deg,#1E7EF7,#6C63FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', border: '3px solid #0A1628', boxShadow: '0 6px 20px rgba(30,126,247,0.35)' }}>{biz.logo}</div>
          {isOwn && <span style={{ fontSize: 11, color: '#1E7EF7', fontWeight: 700, cursor: 'pointer', marginBottom: 4 }} onClick={onTrust}>Trust Score →</span>}
        </div>

        <div style={{ marginTop: 9 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 19, fontWeight: 800 }}>{biz.name}</div>
          <div style={{ fontSize: 12.5, color: '#7A92B0', marginTop: 3 }}>{biz.industry} · {biz.city}, {biz.country}</div>
        </div>

        <div style={{ display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap' }}>
          {biz.kyc_verified && <span className="badge badge-kyc">✅ KYC</span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 7, fontSize: 10, fontWeight: 700, background: 'rgba(245,166,35,0.15)', color: tierColor(biz.trust_tier) }}>{tierIcon(biz.trust_tier)} {biz.trust_tier} · {biz.trust_score}</span>
          {biz.certified && <span className="badge badge-cert">🏅 Certified</span>}
          <span className="badge badge-type">{biz.type}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, margin: '12px 0' }}>
          {[{v: biz.followers, l:'Followers'},{v: 0, l:'Connections'},{v: biz.products?.length||0, l:'Products'}].map(s => (
            <div key={s.l} style={{ background: '#152236', borderRadius: 11, padding: '9px 7px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#1E7EF7' }}>{s.v}</div>
              <div style={{ fontSize: 9.5, color: '#7A92B0', marginTop: 1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {!isOwn && (
          <div style={{ display: 'flex', gap: 7, marginBottom: 15 }}>
            <button onClick={doConnect} className={`btn btn-full ${isConn ? 'btn-ghost' : 'btn-blue'}`} style={{ flex: 1 }}>{isConn ? '✓ Connected' : '🤝 Connect'}</button>
            <button onClick={() => onChat?.(biz.id)} className="btn btn-accent" style={{ flex: 1 }}>💬 Message</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', margin: '0 0 14px' }}>
        {(['products','about'] as const).map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ flex: 1, textAlign: 'center', padding: '9px 4px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: tab === t ? '#1E7EF7' : '#7A92B0', borderBottom: `2px solid ${tab === t ? '#1E7EF7' : 'transparent'}` }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {tab === 'products' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, padding: '0 16px' }}>
          {(biz.products||[]).length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px 0', color: '#7A92B0', fontSize: 13 }}>
              {isOwn ? <button className="btn btn-accent btn-sm" onClick={() => setEditing(true)}>+ Add products</button> : 'No products listed'}
            </div>
          )}
          {(biz.products||[]).map(p => (
            <div key={p.id} style={{ background: '#152236', borderRadius: 13, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }} onClick={() => toast(p.name + ' — ' + p.price, 'info')}>
              <div style={{ height: 82, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, background: '#1A2D47' }}>{p.emoji}</div>
              <div style={{ padding: 9 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 11.5, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 10.5, color: '#4D9DFF', fontWeight: 700, marginTop: 2 }}>{p.price}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'about' && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ background: '#152236', borderRadius: 13, padding: 13, border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 12.5, color: '#7A92B0', lineHeight: 1.7 }}>{biz.description || 'No description yet.'}</p>
            <div style={{ marginTop: 12 }}>
              {[['Industry',biz.industry],['Type',biz.type],['City',biz.city],['Country',biz.country],...(biz.founded?[['Founded',biz.founded]]:[]),...(biz.website?[['Website',biz.website]]:[])].map(([l,v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 12 }}>
                  <span style={{ color: '#7A92B0' }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div style={{ height: 8 }} />
    </div>
  )
}

function BizForm({ existing, onSaved, onCancel }: { existing?: Business; onSaved: () => void; onCancel?: () => void }) {
  const { user, toast } = useApp()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(existing?.name||'')
  const [tagline, setTagline] = useState(existing?.tagline||'')
  const [desc, setDesc] = useState(existing?.description||'')
  const [ind, setInd] = useState(existing?.industry||'')
  const [type, setType] = useState(existing?.type||'B2B')
  const [city, setCity] = useState(existing?.city||'')
  const [country, setCountry] = useState(existing?.country||'')
  const [website, setWebsite] = useState(existing?.website||'')
  const [founded, setFounded] = useState(existing?.founded||'')
  const [products, setProducts] = useState<any[]>(existing?.products||[])
  const [pEmoji, setPEmoji] = useState('📦')
  const [pName, setPName] = useState('')
  const [pPrice, setPPrice] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const lgo = logo(name) || 'BK'

  const validate = () => {
    if (!name.trim()) { setErr('Business name required'); return false }
    if (!ind) { setErr('Select an industry'); return false }
    if (!city.trim()) { setErr('City required'); return false }
    if (!country) { setErr('Select a country'); return false }
    if (!desc.trim()) { setErr('Description required'); return false }
    setErr(''); return true
  }

  const save = async () => {
    if (!validate() || !user) return
    setSaving(true)
    const data = { owner_id: user.id, name: name.trim(), tagline: tagline.trim(), description: desc.trim(), industry: ind, type, city: city.trim(), country, website: website.trim(), founded: founded.trim(), logo: lgo, grad: GRADS[0], trust_score: existing?.trust_score||45, trust_tier: existing?.trust_tier||'Bronze', kyc_verified: existing?.kyc_verified||false, certified: existing?.certified||false }
    if (existing) {
      await sb.from('businesses').update(data).eq('id', existing.id)
    } else {
      const { data: biz } = await sb.from('businesses').insert(data).select().single()
      if (biz && products.length) await sb.from('products').insert(products.map(p => ({ ...p, business_id: biz.id })))
    }
    setSaving(false)
    onSaved()
  }

  const addProd = () => {
    if (!pName.trim()) return
    if (existing) sb.from('products').insert({ business_id: existing.id, name: pName, price: pPrice, emoji: pEmoji }).then(() => {})
    setProducts(p => [...p, { name: pName, price: pPrice, emoji: pEmoji }])
    setPName(''); setPPrice('')
  }

  const removeProd = async (i: number) => {
    const p = products[i]
    if (p.id) await sb.from('products').delete().eq('id', p.id)
    setProducts(prev => prev.filter((_, j) => j !== i))
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="topbar">
        <div className="page-title">{existing ? 'Edit Profile' : 'Create Profile'}</div>
        {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
      </div>

      <div style={{ display: 'flex', margin: '0 16px 18px', background: '#152236', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.07)' }}>
        {['Business Info','Products'].map((l, i) => (
          <button key={i} onClick={() => { if (i === 1 && validate()) setStep(1); if (i === 0) setStep(0) }} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 9, background: step === i ? '#1E7EF7' : 'transparent', color: step === i ? '#fff' : '#7A92B0', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {step === 0 && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ width: 68, height: 68, borderRadius: 17, background: 'linear-gradient(135deg,#1E7EF7,#6C63FF)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff' }}>{lgo}</div>
            <div style={{ fontSize: 11, color: '#7A92B0', marginTop: 5 }}>Auto-generated from name</div>
          </div>
          <div className="field"><label>Business Name *</label><input placeholder="e.g. NexaTech Solutions" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="field"><label>Tagline</label><input placeholder="Short tagline" value={tagline} onChange={e => setTagline(e.target.value)} /></div>
          <div className="field"><label>Description *</label><textarea placeholder="Tell businesses who you are…" value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            <div className="field"><label>Industry *</label><select value={ind} onChange={e => setInd(e.target.value)}><option value="">Select…</option>{INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
            <div className="field"><label>Type</label><select value={type} onChange={e => setType(e.target.value)}><option value="B2B">B2B</option><option value="D2C">D2C</option><option value="B2B + D2C">B2B + D2C</option></select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            <div className="field"><label>City *</label><input placeholder="Dubai" value={city} onChange={e => setCity(e.target.value)} /></div>
            <div className="field"><label>Country *</label><select value={country} onChange={e => setCountry(e.target.value)}><option value="">Select…</option>{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            <div className="field"><label>Website</label><input placeholder="yoursite.com" value={website} onChange={e => setWebsite(e.target.value)} /></div>
            <div className="field"><label>Founded</label><input placeholder="2020" value={founded} onChange={e => setFounded(e.target.value)} /></div>
          </div>
          {err && <div className="form-err">{err}</div>}
          <button className="btn btn-blue btn-full" onClick={() => validate() && setStep(1)}>Next: Add Products →</button>
          <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save & Skip Products'}</button>
        </div>
      )}

      {step === 1 && (
        <div style={{ padding: '0 16px' }}>
          {products.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', background: '#152236', borderRadius: 11, marginBottom: 7, border: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontSize: 20 }}>{p.emoji}</span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 12.5 }}>{p.name}</div><div style={{ fontSize: 11, color: '#4D9DFF', fontWeight: 700 }}>{p.price}</div></div>
              <button onClick={() => removeProd(i)} style={{ background: 'none', border: 'none', color: '#FF4B6E', fontSize: 16, cursor: 'pointer' }}>×</button>
            </div>
          ))}
          {products.length === 0 && <div style={{ textAlign: 'center', color: '#7A92B0', fontSize: 13, padding: '16px 0' }}>No products yet</div>}

          <div style={{ background: '#1A2D47', borderRadius: 13, padding: 13, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 14 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Add a Product</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {EMOJIS.map(em => <div key={em} onClick={() => setPEmoji(em)} style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', background: pEmoji === em ? '#1E7EF7' : '#152236', border: `1px solid ${pEmoji === em ? '#1E7EF7' : 'rgba(255,255,255,0.07)'}` }}>{em}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="field" style={{ marginBottom: 0 }}><label>Name *</label><input placeholder="Product name" value={pName} onChange={e => setPName(e.target.value)} /></div>
              <div className="field" style={{ marginBottom: 0 }}><label>Price</label><input placeholder="$99/mo" value={pPrice} onChange={e => setPPrice(e.target.value)} /></div>
            </div>
            <button className="btn btn-accent btn-full btn-sm" onClick={addProd}>+ Add Product</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-blue" onClick={save} disabled={saving}>{saving ? 'Saving…' : existing ? 'Save Changes' : 'Create Profile'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
