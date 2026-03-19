// ── ProfilePage ───────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import { supabase, Business, Product, INDUSTRIES, COUNTRIES, getGrad, getLogo, getTier, tierIcon, tierColor } from '../lib/supabase'
import { useApp } from '../context/AppContext'

const EMOJIS = ['📦','🛍️','💊','🍔','👕','⚡','🔧','💻','🏥','🌱','🤖','🔒','☁️','📊','🔗','🏭','🚗','✈️','🎯','💎']
const GRADS  = ['gr1','gr2','gr3','gr4','gr5','gr6','gr7','gr8']

interface ProfileProps {
  viewingId?: string | null
  onBack?: () => void
  onOpenChat?: (id: string) => void
}

export function ProfilePage({ viewingId, onBack, onOpenChat }: ProfileProps) {
  const { user, myBusiness, refreshMyBusiness, toast, setActiveTab } = useApp()
  const isOwn = !viewingId || viewingId === myBusiness?.id
  const [biz, setBiz] = useState<Business | null>(null)
  const [tab, setTab] = useState<'products'|'about'>('products')
  const [editing, setEditing] = useState(false)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchBiz = useCallback(async () => {
    if (isOwn) { setBiz(myBusiness); setLoading(false); return }
    const { data } = await supabase.from('businesses').select('*, products(*)').eq('id', viewingId!).single()
    setBiz(data)
    setLoading(false)
  }, [isOwn, myBusiness, viewingId])

  useEffect(() => { fetchBiz() }, [fetchBiz])

  useEffect(() => {
    if (!myBusiness || !biz || isOwn) return
    supabase.from('connections').select('id').eq('from_biz_id', myBusiness.id).eq('to_biz_id', biz.id).single()
      .then(({ data }) => setConnected(!!data))
  }, [myBusiness, biz, isOwn])

  const handleConnect = async () => {
    if (!myBusiness || !biz) { toast('Create a business profile first', 'info'); return }
    if (connected) { toast('Already connected!', 'info'); return }
    await supabase.from('connections').insert([
      { from_biz_id: myBusiness.id, to_biz_id: biz.id },
      { from_biz_id: biz.id, to_biz_id: myBusiness.id },
    ])
    await supabase.rpc('get_or_create_chat', { biz_a: myBusiness.id, biz_b: biz.id })
    setConnected(true)
    toast(`✅ Connected with ${biz.name}!`)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>

  if (editing && biz && isOwn) return <BusinessForm existing={biz} onSaved={async () => { setEditing(false); await refreshMyBusiness(); fetchBiz(); toast('✅ Profile updated!') }} onCancel={() => setEditing(false)} />
  if (isOwn && !myBusiness) return <BusinessForm onSaved={async () => { await refreshMyBusiness(); toast('🎉 Business profile created!') }} />
  if (!biz) return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--gray)' }}>Business not found</div>

  return (
    <div style={{ paddingBottom: 16 }}>
      <div className={getGrad(biz.id)} style={{ height: 170, position: 'relative' }}>
        {onBack && <button onClick={onBack} style={{ position: 'absolute', top: 14, left: 14, width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(10px)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>}
        {isOwn && <button onClick={() => setEditing(true)} style={{ position: 'absolute', top: 14, right: 14, padding: '6px 13px', borderRadius: 10, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>✏️ Edit</button>}
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -34 }}>
          <div style={{ width: 68, height: 68, borderRadius: 17, background: 'linear-gradient(135deg,var(--blue),#6C63FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#fff', border: '3px solid var(--dark)', boxShadow: '0 6px 20px rgba(30,126,247,.35)' }}>{biz.logo}</div>
          {isOwn && <span style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', marginBottom: 4 }} onClick={() => setActiveTab('trust')}>Trust Score →</span>}
        </div>
        <div style={{ marginTop: 9 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800 }}>{biz.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--gray)', marginTop: 3 }}>{biz.industry} · {biz.city}, {biz.country}</div>
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap' }}>
          {biz.kyc_verified && <span className="badge badge-kyc">✅ KYC</span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 7, fontSize: 10, fontWeight: 700, background: 'rgba(245,166,35,.15)', color: tierColor(biz.trust_tier) }}>{tierIcon(biz.trust_tier)} {biz.trust_tier} · {biz.trust_score}</span>
          {biz.certified && <span className="badge badge-cert">🏅 Certified</span>}
          <span className="badge badge-type">{biz.type}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, margin: '12px 0' }}>
          {[{ v: biz.followers, l: 'Followers' }, { v: 0, l: 'Connections' }, { v: biz.products?.length ?? 0, l: 'Products' }].map(s => (
            <div key={s.l} style={{ background: 'var(--card)', borderRadius: 11, padding: '9px 7px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: 'var(--blue)' }}>{s.v}</div>
              <div style={{ fontSize: 9.5, color: 'var(--gray)', marginTop: 1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {!isOwn && (
          <div style={{ display: 'flex', gap: 7, marginBottom: 15 }}>
            <button onClick={handleConnect} className={`btn btn-full ${connected ? 'btn-ghost' : 'btn-blue'}`} style={{ flex: 1 }}>
              {connected ? '✓ Connected' : '🤝 Connect'}
            </button>
            <button onClick={() => onOpenChat?.(biz.id)} className="btn btn-accent" style={{ flex: 1 }}>💬 Message</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', margin: '0 0 14px' }}>
        {(['products','about'] as const).map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ flex: 1, textAlign: 'center', padding: '9px 4px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: tab === t ? 'var(--blue)' : 'var(--gray)', borderBottom: `2px solid ${tab === t ? 'var(--blue)' : 'transparent'}` }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {tab === 'products' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, padding: '0 16px' }}>
          {(biz.products ?? []).length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px 0', color: 'var(--gray)', fontSize: 13 }}>
              {isOwn ? <button className="btn btn-accent btn-sm" onClick={() => setEditing(true)}>+ Add products</button> : 'No products listed'}
            </div>
          )}
          {(biz.products ?? []).map(p => (
            <div key={p.id} style={{ background: 'var(--card)', borderRadius: 13, overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer' }}
              onClick={() => toast(`${p.name} — ${p.price}`, 'info')}>
              <div style={{ height: 82, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, background: 'var(--card2)' }}>{p.emoji}</div>
              <div style={{ padding: 9 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--blue2)', fontWeight: 700, marginTop: 2 }}>{p.price}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'about' && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ background: 'var(--card)', borderRadius: 13, padding: 13, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12.5, color: 'var(--gray)', lineHeight: 1.7 }}>{biz.description || 'No description yet.'}</p>
            <div style={{ marginTop: 12 }}>
              {[['Industry', biz.industry], ['Type', biz.type], ['City', biz.city], ['Country', biz.country], ...(biz.founded ? [['Founded', biz.founded]] : []), ...(biz.website ? [['Website', biz.website]] : [])].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--gray)' }}>{l}</span>
                  <span style={{ color: 'var(--white)', fontWeight: 600 }}>{v}</span>
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

// ── Business Form ─────────────────────────────────────────────────
function BusinessForm({ existing, onSaved, onCancel }: { existing?: Business; onSaved: () => void; onCancel?: () => void }) {
  const { user, toast } = useApp()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(existing?.name ?? '')
  const [tagline, setTagline] = useState(existing?.tagline ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [industry, setIndustry] = useState(existing?.industry ?? '')
  const [type, setType] = useState(existing?.type ?? 'B2B')
  const [city, setCity] = useState(existing?.city ?? '')
  const [country, setCountry] = useState(existing?.country ?? '')
  const [website, setWebsite] = useState(existing?.website ?? '')
  const [founded, setFounded] = useState(existing?.founded ?? '')
  const [gradIdx, setGradIdx] = useState(0)
  const [products, setProducts] = useState<Partial<Product>[]>(existing?.products ?? [])
  const [newEmoji, setNewEmoji] = useState('📦')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const logo = getLogo(name) || 'BK'

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Required'
    if (!industry) e.industry = 'Required'
    if (!city.trim()) e.city = 'Required'
    if (!country) e.country = 'Required'
    if (!description.trim()) e.description = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate() || !user) return
    setSaving(true)
    const bizData = { owner_id: user.id, name: name.trim(), tagline: tagline.trim(), description: description.trim(), industry, type, city: city.trim(), country, website: website.trim(), founded: founded.trim(), logo, grad: GRADS[gradIdx], trust_score: existing?.trust_score ?? 45, trust_tier: existing?.trust_tier ?? 'Bronze', kyc_verified: existing?.kyc_verified ?? false, certified: existing?.certified ?? false }

    if (existing) {
      await supabase.from('businesses').update(bizData).eq('id', existing.id)
    } else {
      const { data: newBiz } = await supabase.from('businesses').insert(bizData).select().single()
      if (newBiz && products.length > 0) {
        await supabase.from('products').insert(products.map(p => ({ ...p, business_id: newBiz.id })))
      }
    }
    setSaving(false)
    onSaved()
  }

  const addProduct = () => {
    if (!newName.trim()) return
    if (existing) {
      supabase.from('products').insert({ business_id: existing.id, name: newName, price: newPrice, emoji: newEmoji }).then(() => {})
    }
    setProducts(p => [...p, { name: newName, price: newPrice, emoji: newEmoji, category: 'General' }])
    setNewName(''); setNewPrice('')
  }

  const removeProduct = async (idx: number) => {
    const p = products[idx]
    if (p.id) await supabase.from('products').delete().eq('id', p.id)
    setProducts(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="topbar">
        <div className="topbar-title">{existing ? 'Edit Profile' : 'Create Profile'}</div>
        {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
      </div>

      <div style={{ display: 'flex', margin: '0 16px 18px', background: 'var(--card)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
        {['Business Info', 'Products'].map((l, i) => (
          <button key={i} onClick={() => i === 1 ? (validate() && setStep(1)) : setStep(0)} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 9, background: step === i ? 'var(--blue)' : 'transparent', color: step === i ? '#fff' : 'var(--gray)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {step === 0 && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ width: 68, height: 68, borderRadius: 17, background: 'linear-gradient(135deg,var(--blue),#6C63FF)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#fff', boxShadow: '0 6px 20px rgba(30,126,247,.3)' }}>{logo}</div>
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 5 }}>Logo auto-generated from name</div>
          </div>

          <div className="field"><label>Business Name *</label><input className={errors.name ? 'error' : ''} placeholder="e.g. NexaTech Solutions" value={name} onChange={e => setName(e.target.value)} />{errors.name && <div className="error-msg">{errors.name}</div>}</div>
          <div className="field"><label>Tagline</label><input placeholder="Short tagline" value={tagline} onChange={e => setTagline(e.target.value)} /></div>
          <div className="field"><label>Description *</label><textarea className={errors.description ? 'error' : ''} placeholder="Tell businesses who you are…" value={description} onChange={e => setDescription(e.target.value)} />{errors.description && <div className="error-msg">{errors.description}</div>}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            <div className="field"><label>Industry *</label><select className={errors.industry ? 'error' : ''} value={industry} onChange={e => setIndustry(e.target.value)}><option value="">Select…</option>{INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}</select>{errors.industry && <div className="error-msg">{errors.industry}</div>}</div>
            <div className="field"><label>Type</label><select value={type} onChange={e => setType(e.target.value)}><option value="B2B">B2B</option><option value="D2C">D2C</option><option value="B2B + D2C">B2B + D2C</option></select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            <div className="field"><label>City *</label><input className={errors.city ? 'error' : ''} placeholder="Dubai" value={city} onChange={e => setCity(e.target.value)} />{errors.city && <div className="error-msg">{errors.city}</div>}</div>
            <div className="field"><label>Country *</label><select className={errors.country ? 'error' : ''} value={country} onChange={e => setCountry(e.target.value)}><option value="">Select…</option>{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select>{errors.country && <div className="error-msg">{errors.country}</div>}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            <div className="field"><label>Website</label><input placeholder="yoursite.com" value={website} onChange={e => setWebsite(e.target.value)} /></div>
            <div className="field"><label>Founded</label><input placeholder="2020" value={founded} onChange={e => setFounded(e.target.value)} /></div>
          </div>

          <button className="btn btn-blue btn-full" onClick={() => validate() && setStep(1)}>Next: Add Products →</button>
          <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : existing ? 'Save Changes' : 'Save & Skip Products'}</button>
        </div>
      )}

      {step === 1 && (
        <div style={{ padding: '0 16px' }}>
          {products.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', background: 'var(--card)', borderRadius: 11, marginBottom: 7, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 20 }}>{p.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--blue2)', fontWeight: 700 }}>{p.price}</div>
              </div>
              <button onClick={() => removeProduct(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 16, cursor: 'pointer' }}>×</button>
            </div>
          ))}
          {products.length === 0 && <div style={{ textAlign: 'center', color: 'var(--gray)', fontSize: 13, padding: '16px 0' }}>No products yet</div>}

          <div style={{ background: 'var(--card2)', borderRadius: 13, padding: 13, border: '1px solid var(--border)', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Add a Product / Service</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {EMOJIS.map(em => (
                <div key={em} onClick={() => setNewEmoji(em)} style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', background: newEmoji === em ? 'var(--blue)' : 'var(--card)', border: `1px solid ${newEmoji === em ? 'var(--blue)' : 'var(--border)'}` }}>{em}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="field" style={{ marginBottom: 0 }}><label>Name *</label><input placeholder="Product name" value={newName} onChange={e => setNewName(e.target.value)} /></div>
              <div className="field" style={{ marginBottom: 0 }}><label>Price</label><input placeholder="$99/mo" value={newPrice} onChange={e => setNewPrice(e.target.value)} /></div>
            </div>
            <button className="btn btn-accent btn-full btn-sm" onClick={addProduct}>+ Add Product</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-blue" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : existing ? 'Save Changes' : 'Create Profile ✓'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── GoRandomPage ──────────────────────────────────────────────────
const RAND_MATCHES = [
  { id: 'r1', name: 'Aisha Al-Rashid', role: 'Founder · Bloom Organics', loc: 'Dubai, UAE', av: '🧑‍💼', score: 88, tags: ['Food & Bev','Organic','Export'], kyc: true },
  { id: 'r2', name: 'James Okafor', role: 'CEO · BuildRight Africa', loc: 'Lagos, Nigeria', av: '👨‍💼', score: 72, tags: ['Construction','B2B'], kyc: true },
  { id: 'r3', name: 'Mei Lin Zhang', role: 'Director · SilkRoute Fashion', loc: 'Shanghai, China', av: '👩‍💼', score: 91, tags: ['Fashion','OEM','Wholesale'], kyc: true },
  { id: 'r4', name: 'Carlos Mendez', role: 'Founder · TechLab LATAM', loc: 'Bogotá, Colombia', av: '🧑‍💻', score: 65, tags: ['SaaS','Tech'], kyc: false },
  { id: 'r5', name: 'Fatima Hassan', role: 'MD · Gulf Pharma', loc: 'Riyadh, KSA', av: '👩‍⚕️', score: 96, tags: ['Pharma','Distribution'], kyc: true },
  { id: 'r6', name: 'Raj Patel', role: 'Co-founder · FinEdge India', loc: 'Mumbai, India', av: '👨‍💻', score: 83, tags: ['FinTech','B2B'], kyc: true },
  { id: 'r7', name: 'Sofia Rossi', role: 'CEO · LuxCraft Italy', loc: 'Milan, Italy', av: '👩‍🎨', score: 79, tags: ['Luxury','Fashion'], kyc: true },
]

export function GoRandomPage() {
  const { myBusiness, toast } = useApp()
  const [idx, setIdx] = useState(0)
  const [sessions, setSessions] = useState(0)
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [indFilter, setIndFilter] = useState('All')
  const [fading, setFading] = useState(false)

  const filtered = RAND_MATCHES.filter(m =>
    indFilter === 'All' || m.tags.some(t => t.toLowerCase().includes(indFilter.toLowerCase()))
  )
  const match = filtered.length > 0 ? filtered[idx % filtered.length] : RAND_MATCHES[0]

  const next = () => {
    setFading(true)
    setTimeout(() => { setIdx(i => i + 1); setSessions(s => Math.min(3, s + 1)); setFading(false) }, 200)
  }

  const handleConnect = async () => {
    if (!myBusiness) { toast('Create a business profile first', 'info'); return }
    if (connected.has(match.id)) { toast('Already connected!', 'info'); return }
    setConnected(s => new Set([...s, match.id]))
    toast(`✅ Connected with ${match.name}! Check your messages.`)
  }

  const INDS = ['All','Technology','Fashion','Food & Bev','Energy','Finance']
  const LOCS = ['Global','UAE','UK','USA','India','Africa']

  return (
    <div style={{ paddingBottom: 16 }}>
      <div className="topbar"><div className="topbar-title">🎲 Go Random</div><div style={{ fontSize: 11, color: 'var(--gray)' }}>Speed networking</div></div>
      <div style={{ textAlign: 'center', padding: '0 20px 14px', fontSize: 12, color: 'var(--gray)', lineHeight: 1.5 }}>
        Matched with a verified business owner from anywhere in the world
      </div>
      <div className="chips-row">{INDS.map(i => <div key={i} className={`chip ${indFilter === i ? 'active' : ''}`} onClick={() => { setIndFilter(i); setIdx(0) }}>{i}</div>)}</div>

      <div style={{ margin: '0 16px 14px', background: 'var(--card2)', borderRadius: 20, padding: '18px 15px', border: '1px solid var(--border)', transition: 'opacity .2s', opacity: fading ? 0 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 15 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'rgba(30,126,247,.2)', border: '2.5px solid var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25 }}>
              {myBusiness ? myBusiness.logo[0] : '👤'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>You</div>
            <div style={{ fontSize: 10, color: 'var(--gray)', textAlign: 'center' }}>{myBusiness?.name ?? 'Your Business'}</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--dark)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--gray)', flexShrink: 0 }}>VS</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'rgba(255,107,53,.15)', border: '2.5px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25, ...(connected.has(match.id) ? { boxShadow: '0 0 0 3px rgba(0,212,160,.4)' } : {}) }} className={!connected.has(match.id) ? 'pulse' : ''}>{match.av}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>{match.name}</div>
            <div style={{ fontSize: 10, color: 'var(--gray)', textAlign: 'center' }}>{match.role}</div>
          </div>
        </div>
        <div style={{ background: 'var(--dark)', borderRadius: 13, padding: '11px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                {match.kyc ? <><span className="kyc-dot" /><span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--green)' }}>KYC Verified</span></> : <span style={{ fontSize: 10.5, color: 'var(--gray2)' }}>Not verified</span>}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {match.tags.map(t => <span key={t} style={{ background: 'rgba(30,126,247,.12)', color: 'var(--blue2)', fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 6 }}>{t}</span>)}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--gray)', marginTop: 5 }}>📍 {match.loc}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: tierColor(getTier(match.score)) }}>{match.score}</div>
              <div style={{ fontSize: 10, color: 'var(--gray)' }}>Trust Score</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 9, padding: '0 16px', marginBottom: 9 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={next}>→ Next</button>
        <button className={`btn btn-green`} style={{ flex: 1.4 }} onClick={handleConnect} disabled={connected.has(match.id)}>
          {connected.has(match.id) ? '✓ Connected' : 'Connect ✓'}
        </button>
      </div>
      <div style={{ padding: '0 16px', marginBottom: 13 }}>
        <button className="btn btn-red btn-full btn-sm" onClick={() => { toast('Report submitted. Thank you.', 'info'); next() }}>⚑ Report this user</button>
      </div>
      <div style={{ margin: '0 16px', background: 'var(--card)', borderRadius: 13, padding: '11px 13px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Sessions this month</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ width: 26, height: 7, borderRadius: 4, background: i < sessions ? 'var(--gray2)' : 'var(--green)' }} />)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--gray)' }}>{sessions} used · {Math.max(0, 3 - sessions)} left</div>
          <div style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', marginTop: 3 }} onClick={() => toast('Upgrade to Growth for unlimited sessions!', 'info')}>Upgrade →</div>
        </div>
      </div>
    </div>
  )
}

// ── TrustPage ─────────────────────────────────────────────────────
export function TrustPage() {
  const { myBusiness, refreshMyBusiness, toast } = useApp()
  const [showCertModal, setShowCertModal] = useState(false)

  if (!myBusiness) return (
    <div className="empty-state" style={{ height: '100%' }}>
      <div className="emoji">🛡️</div>
      <h3>Trust & Verification</h3>
      <p>Create a business profile to build your Trust Score.</p>
    </div>
  )

  const nextThresh = myBusiness.trust_score < 50 ? 50 : myBusiness.trust_score < 75 ? 75 : myBusiness.trust_score < 90 ? 90 : 100
  const nextName = nextThresh === 50 ? 'Silver' : nextThresh === 75 ? 'Gold' : nextThresh === 90 ? 'Platinum' : 'Max'
  const ptsToNext = nextThresh - myBusiness.trust_score

  const handleKYC = async () => {
    if (myBusiness.kyc_verified) { toast('Already KYC verified!', 'info'); return }
    const newScore = Math.min(100, myBusiness.trust_score + 15)
    await supabase.from('businesses').update({ kyc_verified: true, trust_score: newScore, trust_tier: getTier(newScore) }).eq('id', myBusiness.id)
    await refreshMyBusiness()
    toast('✅ KYC complete! +15 Trust Score')
  }

  const handleCertify = async () => {
    const newScore = Math.min(100, myBusiness.trust_score + 12)
    await supabase.from('businesses').update({ certified: true, trust_score: newScore, trust_tier: getTier(newScore) }).eq('id', myBusiness.id)
    await refreshMyBusiness()
    setShowCertModal(false)
    toast('🏅 Certified! +12 Trust Score')
  }

  const breakdown = [
    { label: 'Profile Completeness', pct: myBusiness.description && myBusiness.tagline ? 95 : 60 },
    { label: 'KYC Verified', pct: myBusiness.kyc_verified ? 100 : 0 },
    { label: 'Business Certified', pct: myBusiness.certified ? 100 : 0 },
    { label: 'Products Listed', pct: Math.min(100, (myBusiness.products?.length ?? 0) * 20) },
  ]

  const tiers = [
    { name: 'Bronze', range: '0–49', icon: '🥉', perks: ['Basic profile', 'Discovery listing', '3 Go Random/month'] },
    { name: 'Silver', range: '50–74', icon: '🥈', perks: ['KYC badge', '10 Go Random/month', 'Conference booking'] },
    { name: 'Gold', range: '75–89', icon: '🥇', perks: ['Priority ranking', 'Featured eligibility', 'Unlimited Go Random'] },
    { name: 'Platinum', range: '90–100', icon: '💎', perks: ['Bizzkit Verified ✓', 'Top of feed', 'Exclusive exhibitions'] },
  ]

  const boosts = [
    { icon: '📝', label: 'Complete your profile', pts: 5, action: null, done: !!(myBusiness.description && myBusiness.tagline) },
    { icon: '🪪', label: 'KYC Verification', pts: 15, action: handleKYC, done: myBusiness.kyc_verified },
    { icon: '🏅', label: 'Business Certification ($19.99)', pts: 12, action: () => setShowCertModal(true), done: myBusiness.certified },
    { icon: '📦', label: 'Add 5+ products', pts: 10, action: null, done: (myBusiness.products?.length ?? 0) >= 5 },
  ]

  return (
    <div style={{ paddingBottom: 16 }}>
      {showCertModal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--card2)', borderRadius: 18, padding: 22, border: '1px solid var(--border)', width: '100%' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, marginBottom: 8 }}>🏅 Business Certification</div>
            <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 18, lineHeight: 1.6 }}>Enhanced verification of your company registration.<br /><br /><span style={{ color: 'var(--white)', fontWeight: 700 }}>One-time fee: $19.99</span></div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCertModal(false)}>Cancel</button>
              <button className="btn btn-blue" style={{ flex: 1 }} onClick={handleCertify}>Pay & Certify</button>
            </div>
          </div>
        </div>
      )}

      <div className="topbar"><div className="topbar-title">Trust & Verification</div></div>

      <div style={{ margin: '0 16px 15px', borderRadius: 18, padding: 18, background: 'linear-gradient(135deg,#0C2340,#1A3D6E)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle,rgba(30,126,247,.2),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 50, height: 50, borderRadius: 13, background: 'linear-gradient(135deg,var(--blue),#6C63FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: '#fff', flexShrink: 0 }}>{myBusiness.logo}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, color: 'var(--blue)', lineHeight: 1 }}>{myBusiness.trust_score}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 1 }}>Your Referral Score</div>
          </div>
          <div style={{ padding: '6px 11px', borderRadius: 9, background: 'rgba(245,166,35,.2)', color: tierColor(myBusiness.trust_tier), fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{tierIcon(myBusiness.trust_tier)} {myBusiness.trust_tier}</div>
        </div>
        {myBusiness.trust_score < 100 && (
          <div style={{ marginTop: 13, position: 'relative', zIndex: 1 }}>
            <div style={{ height: 5, background: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(myBusiness.trust_score / nextThresh) * 100}%`, background: 'var(--blue)', borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9.5, color: 'rgba(255,255,255,.3)' }}><span>0</span><span>+{ptsToNext} pts to {nextName}</span><span>{nextThresh}</span></div>
          </div>
        )}
      </div>

      <div className="section-header"><h3>Score Breakdown</h3></div>
      <div style={{ padding: '0 16px', marginBottom: 14 }}>
        {breakdown.map(item => (
          <div key={item.label} style={{ marginBottom: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--white)', fontWeight: 600 }}>{item.label}</span>
              <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{item.pct}%</span>
            </div>
            <div className="prog-wrap"><div className="prog-fill" style={{ width: `${item.pct}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="section-header"><h3>Trust Tiers</h3></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, padding: '0 16px', marginBottom: 14 }}>
        {tiers.map(tier => (
          <div key={tier.name} style={{ background: 'var(--card)', borderRadius: 13, padding: 13, border: `1.5px solid ${tier.name === myBusiness.trust_tier ? tierColor(tier.name) : 'var(--border)'}` }}>
            <div style={{ fontSize: 26, marginBottom: 5 }}>{tier.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: tier.name === myBusiness.trust_tier ? tierColor(tier.name) : 'var(--white)' }}>{tier.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--gray)', margin: '2px 0 7px' }}>Score {tier.range}</div>
            {tier.name === myBusiness.trust_tier && <div style={{ display: 'inline-block', background: 'rgba(245,166,35,.2)', color: 'var(--gold)', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, marginBottom: 5 }}>YOUR TIER</div>}
            <div style={{ fontSize: 10, color: 'var(--gray)', lineHeight: 1.7 }}>{tier.perks.map(p => `• ${p}`).join('\n')}</div>
          </div>
        ))}
      </div>

      <div className="section-header"><h3>Boost Your Score</h3></div>
      <div style={{ margin: '0 16px', background: 'var(--card)', borderRadius: 13, border: '1px solid var(--border)', overflow: 'hidden' }}>
        {boosts.map((b, i) => (
          <div key={b.label} onClick={() => !b.done && b.action?.()} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderBottom: i < boosts.length - 1 ? '1px solid var(--border)' : 'none', opacity: b.done ? .5 : 1, cursor: !b.done && b.action ? 'pointer' : 'default' }}>
            <div style={{ fontSize: 17, flexShrink: 0 }}>{b.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: b.done ? 'var(--gray)' : 'var(--white)', textDecoration: b.done ? 'line-through' : 'none' }}>{b.label}</div>
              {b.done && <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, marginTop: 1 }}>✓ Complete</div>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: b.done ? 'var(--gray)' : 'var(--green)', flexShrink: 0 }}>{b.done ? '✓' : `+${b.pts} pts`}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 8 }} />
    </div>
  )
}
