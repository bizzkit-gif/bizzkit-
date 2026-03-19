import React, { useState, useEffect, useCallback } from 'react'
import { sb, Conference, INDUSTRIES, TIMES, indEmoji, fmtDate, tier, tierIcon, tierColor } from '../lib/db'
import { useApp } from '../context/ctx'

// ── CONFERENCE ────────────────────────────────────────────────────
export function ConferencePage() {
  const { myBiz, toast } = useApp()
  const [confs, setConfs] = useState<Conference[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list'|'book'|'create'>('list')
  const [expanded, setExpanded] = useState<string|null>(null)

  const load = useCallback(async () => {
    const { data } = await sb.from('conferences').select('*,conference_attendees(business_id)').order('date', { ascending: true })
    setConfs(data||[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = sb.channel('conf-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'conference_attendees' }, load).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  const myConfs = confs.filter(c => myBiz && c.conference_attendees?.some((a: any) => a.business_id === myBiz.id))
  const avail = confs.filter(c => !myBiz || !c.conference_attendees?.some((a: any) => a.business_id === myBiz.id))

  const join = async (c: Conference) => {
    if (!myBiz) { toast('Create a business profile first', 'info'); return }
    const count = c.conference_attendees?.length||0
    if (count >= c.max_attendees) { toast('Session is full!', 'error'); return }
    await sb.from('conference_attendees').insert({ conference_id: c.id, business_id: myBiz.id })
    toast('Joined "' + c.title + '"!')
    load()
  }

  const leave = async (c: Conference) => {
    if (!myBiz) return
    await sb.from('conference_attendees').delete().eq('conference_id', c.id).eq('business_id', myBiz.id)
    toast('Left conference')
    load()
  }

  if (view === 'book') return <BookForm onDone={() => { load(); setView('list'); toast('Conference booked!') }} onBack={() => setView('list')} />
  if (view === 'create') return <CreateForm onDone={() => { load(); setView('list'); toast('Conference created!') }} onBack={() => setView('list')} />

  return (
    <div style={{ paddingBottom: 16 }}>
      <div className="topbar">
        <div className="page-title">Conferences</div>
        {myBiz && <button className="btn btn-blue btn-sm" onClick={() => setView('create')}>+ Host</button>}
      </div>

      <div style={{ margin: '0 16px 15px', borderRadius: 17, padding: '17px 17px 15px', background: 'linear-gradient(135deg,#0C2340,#1A3D6E)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, marginBottom: 5 }}>Live Business Networking</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 13 }}>Book a curated group session with up to 15 verified business owners.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-blue btn-sm" onClick={() => setView('book')}>📅 Book Session</button>
        </div>
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>}

      {!loading && myConfs.length > 0 && (
        <>
          <div className="sec-hd"><h3>My Sessions</h3></div>
          {myConfs.map(c => <ConfCard key={c.id} c={c} myBizId={myBiz?.id} joined expanded={expanded===c.id} onToggle={() => setExpanded(expanded===c.id?null:c.id)} onLeave={() => leave(c)} />)}
          <div style={{ height: 8 }} />
        </>
      )}

      <div className="sec-hd"><h3>Available Sessions</h3><span className="see-all">{avail.length} open</span></div>

      {!loading && avail.length === 0 && <div className="empty"><div className="ico">📅</div><h3>No sessions right now</h3>{myBiz && <button className="btn btn-accent btn-sm" style={{ marginTop: 14 }} onClick={() => setView('create')}>+ Create one</button>}</div>}

      {avail.map(c => <ConfCard key={c.id} c={c} myBizId={myBiz?.id} joined={false} expanded={expanded===c.id} onToggle={() => setExpanded(expanded===c.id?null:c.id)} onJoin={() => join(c)} />)}
    </div>
  )
}

function ConfCard({ c, myBizId, joined, expanded, onToggle, onJoin, onLeave }: any) {
  const atts = c.conference_attendees||[]
  const spots = c.max_attendees - atts.length
  const pct = (atts.length/c.max_attendees)*100
  const days = Math.max(0, Math.ceil((new Date(c.date).getTime()-Date.now())/86400000))
  const isMine = myBizId && c.organizer_id === myBizId

  return (
    <div style={{ margin: '0 16px 10px', background: '#152236', borderRadius: 15, border: `1px solid ${joined?'rgba(30,126,247,0.35)':'rgba(255,255,255,0.07)'}`, overflow: 'hidden' }}>
      <div style={{ padding: '13px 13px 10px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(30,126,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{indEmoji(c.industry)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13.5, fontWeight: 700 }}>{c.title}</div>
              {joined && <span style={{ fontSize: 9, fontWeight: 800, background: '#1E7EF7', color: '#fff', padding: '2px 5px', borderRadius: 5 }}>JOINED</span>}
              {isMine && <span style={{ fontSize: 9, fontWeight: 800, background: '#FF6B35', color: '#fff', padding: '2px 5px', borderRadius: 5 }}>HOST</span>}
            </div>
            <div style={{ fontSize: 10.5, color: '#7A92B0', marginTop: 2 }}>{c.industry} · {c.location}</div>
            <div style={{ fontSize: 10.5, color: '#7A92B0', marginTop: 1 }}>📅 {fmtDate(c.date)} at {c.time}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: days<=3?'#FF6B35':'#1E7EF7' }}>{days}d</div>
            <div style={{ fontSize: 9.5, color: '#7A92B0' }}>away</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10.5 }}>
            <span style={{ color: '#7A92B0' }}>{atts.length} / {c.max_attendees} attendees</span>
            <span style={{ color: spots<=3?'#FF6B35':'#00D4A0', fontWeight: 700 }}>{spots} spot{spots!==1?'s':''} left</span>
          </div>
          <div className="prog-wrap"><div className="prog-fill" style={{ width: pct+'%', background: pct>80?'#FF6B35':'#00D4A0' }} /></div>
        </div>
      </div>
      <div style={{ padding: '0 13px 12px', display: 'flex', gap: 7 }}>
        {!joined && !isMine && <button className="btn btn-blue btn-full btn-sm" onClick={e => { e.stopPropagation(); onJoin?.() }}>Join — {spots} spots left</button>}
        {joined && !isMine && <><button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); onLeave?.() }}>Leave</button><button className="btn btn-blue btn-sm" style={{ flex: 2 }}>View Details</button></>}
        {isMine && <button className="btn btn-ghost btn-full btn-sm">Manage Conference</button>}
      </div>
    </div>
  )
}

function BookForm({ onDone, onBack }: any) {
  const { myBiz, toast } = useApp()
  const [day, setDay] = useState(10)
  const [time, setTime] = useState('10:00 AM')
  const [ind, setInd] = useState('')
  const [loc, setLoc] = useState('')
  const [saving, setSaving] = useState(false)
  const SLOTS = [8,10,15,18,23,25]
  const CAL = [null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]

  const book = async () => {
    if (!myBiz) { toast('Create a business profile first', 'info'); return }
    setSaving(true)
    const location = loc || myBiz.city + ', ' + myBiz.country
    const { data: conf } = await sb.from('conferences').insert({ organizer_id: myBiz.id, title: (ind||'Business') + ' Networking — ' + myBiz.city, date: '2026-06-' + String(day).padStart(2,'0'), time, industry: ind||'General', location, max_attendees: 15 }).select().single()
    if (conf) await sb.from('conference_attendees').insert({ conference_id: conf.id, business_id: myBiz.id })
    setSaving(false)
    onDone()
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="topbar">
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#7A92B0', fontSize: 16, cursor: 'pointer', padding: '4px 8px' }}>← Back</button>
        <div className="page-title">Book a Session</div>
        <div style={{ width: 60 }} />
      </div>
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 17 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}><label>Industry</label><select value={ind} onChange={e => setInd(e.target.value)}><option value="">All</option>{INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}><label>Location</label><input placeholder="City, Country" value={loc} onChange={e => setLoc(e.target.value)} /></div>
        </div>
        <div style={{ background: '#152236', borderRadius: 15, padding: 15, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 15 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 13 }}>June 2026</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: '#3A5070', padding: '3px 0' }}>{d}</div>)}
            {CAL.map((d, i) => {
              if (!d) return <div key={i} />
              const isSel = day === d, isSlot = SLOTS.includes(d)
              return (
                <div key={i} onClick={() => setDay(d)} style={{ textAlign: 'center', padding: '7px 2px', borderRadius: 7, fontSize: 11.5, cursor: 'pointer', background: isSel?'#1E7EF7':'transparent', color: isSel?'#fff':isSlot?'#1E7EF7':'#7A92B0', fontWeight: isSlot||isSel?700:400, position: 'relative' }}>
                  {d}
                  {isSlot && !isSel && <div style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, background: '#00D4A0', borderRadius: '50%' }} />}
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
          {TIMES.map(t => <div key={t} onClick={() => setTime(t)} style={{ padding: '7px 13px', borderRadius: 9, border: `1.5px solid ${time===t?'#1E7EF7':'rgba(255,255,255,0.07)'}`, fontSize: 11.5, fontWeight: 600, color: time===t?'#fff':'#7A92B0', background: time===t?'#1E7EF7':'#152236', cursor: 'pointer' }}>{t}</div>)}
        </div>
        <button className="btn btn-blue btn-full" onClick={book} disabled={saving}>{saving?'Booking…':'Book Conference Session'}</button>
      </div>
    </div>
  )
}

function CreateForm({ onDone, onBack }: any) {
  const { myBiz, toast } = useApp()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00 AM')
  const [ind, setInd] = useState('')
  const [loc, setLoc] = useState(myBiz ? myBiz.city + ', ' + myBiz.country : '')
  const [saving, setSaving] = useState(false)

  const create = async () => {
    if (!myBiz || !title || !date) { toast('Title and date required', 'error'); return }
    setSaving(true)
    const { data: conf } = await sb.from('conferences').insert({ organizer_id: myBiz.id, title, date, time, industry: ind||'General', location: loc||myBiz.city, max_attendees: 15 }).select().single()
    if (conf) await sb.from('conference_attendees').insert({ conference_id: conf.id, business_id: myBiz.id })
    setSaving(false)
    onDone()
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="topbar">
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#7A92B0', fontSize: 16, cursor: 'pointer', padding: '4px 8px' }}>← Back</button>
        <div className="page-title">Host a Conference</div>
        <div style={{ width: 60 }} />
      </div>
      <div style={{ padding: '0 16px' }}>
        <div className="field"><label>Session Title *</label><input placeholder="e.g. MENA Tech Founders Meetup" value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <div className="field"><label>Date *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="field"><label>Industry</label><select value={ind} onChange={e => setInd(e.target.value)}><option value="">All</option>{INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
        </div>
        <div className="field"><label>Location</label><input placeholder="City, Country" value={loc} onChange={e => setLoc(e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
          {TIMES.map(t => <div key={t} onClick={() => setTime(t)} style={{ padding: '7px 13px', borderRadius: 9, border: `1.5px solid ${time===t?'#1E7EF7':'rgba(255,255,255,0.07)'}`, fontSize: 11.5, fontWeight: 600, color: time===t?'#fff':'#7A92B0', background: time===t?'#1E7EF7':'#152236', cursor: 'pointer' }}>{t}</div>)}
        </div>
        <button className="btn btn-blue btn-full" onClick={create} disabled={saving||!title||!date}>{saving?'Creating…':'Create Conference'}</button>
      </div>
    </div>
  )
}

// ── GO RANDOM ─────────────────────────────────────────────────────
const MATCHES = [
  { id:'r1', name:'Aisha Al-Rashid', role:'Founder · Bloom Organics', loc:'Dubai, UAE', av:'🧑‍💼', score:88, tags:['Food & Bev','Organic','Export'], kyc:true },
  { id:'r2', name:'James Okafor', role:'CEO · BuildRight Africa', loc:'Lagos, Nigeria', av:'👨‍💼', score:72, tags:['Construction','B2B'], kyc:true },
  { id:'r3', name:'Mei Lin Zhang', role:'Director · SilkRoute Fashion', loc:'Shanghai, China', av:'👩‍💼', score:91, tags:['Fashion','OEM','Wholesale'], kyc:true },
  { id:'r4', name:'Carlos Mendez', role:'Founder · TechLab LATAM', loc:'Bogotá, Colombia', av:'🧑‍💻', score:65, tags:['SaaS','Tech'], kyc:false },
  { id:'r5', name:'Fatima Hassan', role:'MD · Gulf Pharma', loc:'Riyadh, KSA', av:'👩‍⚕️', score:96, tags:['Pharma','Distribution'], kyc:true },
  { id:'r6', name:'Raj Patel', role:'Co-founder · FinEdge India', loc:'Mumbai, India', av:'👨‍💻', score:83, tags:['FinTech','B2B'], kyc:true },
  { id:'r7', name:'Sofia Rossi', role:'CEO · LuxCraft Italy', loc:'Milan, Italy', av:'👩‍🎨', score:79, tags:['Luxury','Fashion'], kyc:true },
]

export function GoRandomPage() {
  const { myBiz, toast } = useApp()
  const [idx, setIdx] = useState(0)
  const [sessions, setSessions] = useState(0)
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [fading, setFading] = useState(false)

  const match = MATCHES[idx % MATCHES.length]

  const next = () => { setFading(true); setTimeout(() => { setIdx(i => i+1); setSessions(s => Math.min(3,s+1)); setFading(false) }, 200) }
  const connect = () => {
    if (!myBiz) { toast('Create a profile first', 'info'); return }
    if (connected.has(match.id)) { toast('Already connected!', 'info'); return }
    setConnected(s => new Set([...s, match.id]))
    toast('Connected with ' + match.name + '!')
  }

  return (
    <div style={{ paddingBottom: 16 }}>
      <div className="topbar"><div className="page-title">🎲 Go Random</div><div style={{ fontSize: 11, color: '#7A92B0' }}>Speed networking</div></div>
      <div style={{ textAlign: 'center', padding: '0 20px 14px', fontSize: 12, color: '#7A92B0', lineHeight: 1.5 }}>Get matched instantly with a verified business owner from anywhere</div>

      <div style={{ margin: '0 16px 14px', background: '#1A2D47', borderRadius: 20, padding: '18px 15px', border: '1px solid rgba(255,255,255,0.07)', transition: 'opacity 0.2s', opacity: fading?0:1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 15 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'rgba(30,126,247,0.2)', border: '2.5px solid #1E7EF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25 }}>{myBiz?myBiz.logo[0]:'👤'}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>You</div>
            <div style={{ fontSize: 10, color: '#7A92B0', textAlign: 'center' }}>{myBiz?.name||'Your Business'}</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0A1628', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#7A92B0', flexShrink: 0 }}>VS</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'rgba(255,107,53,0.15)', border: '2.5px solid #FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25 }} className={!connected.has(match.id)?'pulse':''}>{match.av}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>{match.name}</div>
            <div style={{ fontSize: 10, color: '#7A92B0', textAlign: 'center' }}>{match.role}</div>
          </div>
        </div>
        <div style={{ background: '#0A1628', borderRadius: 13, padding: '11px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                {match.kyc ? <><span className="kyc-dot" /><span style={{ fontSize: 10.5, fontWeight: 700, color: '#00D4A0' }}>KYC Verified</span></> : <span style={{ fontSize: 10.5, color: '#3A5070' }}>Not verified</span>}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {match.tags.map(t => <span key={t} style={{ background: 'rgba(30,126,247,0.12)', color: '#4D9DFF', fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 6 }}>{t}</span>)}
              </div>
              <div style={{ fontSize: 10.5, color: '#7A92B0', marginTop: 5 }}>📍 {match.loc}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: tierColor(tier(match.score)) }}>{match.score}</div>
              <div style={{ fontSize: 10, color: '#7A92B0' }}>Trust Score</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 9, padding: '0 16px', marginBottom: 9 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={next}>→ Next</button>
        <button className="btn btn-green" style={{ flex: 1.4 }} onClick={connect} disabled={connected.has(match.id)}>{connected.has(match.id)?'✓ Connected':'Connect ✓'}</button>
      </div>
      <div style={{ padding: '0 16px', marginBottom: 13 }}>
        <button className="btn btn-red btn-full btn-sm" onClick={() => { toast('Report submitted.','info'); next() }}>⚑ Report</button>
      </div>
      <div style={{ margin: '0 16px', background: '#152236', borderRadius: 13, padding: '11px 13px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Sessions this month</div>
          <div style={{ display: 'flex', gap: 5 }}>{Array.from({length:3}).map((_,i) => <div key={i} style={{ width: 26, height: 7, borderRadius: 4, background: i<sessions?'#3A5070':'#00D4A0' }} />)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#7A92B0' }}>{sessions} used · {Math.max(0,3-sessions)} left</div>
          <div style={{ fontSize: 11, color: '#1E7EF7', fontWeight: 700, cursor: 'pointer', marginTop: 3 }} onClick={() => toast('Upgrade to Growth for unlimited sessions!','info')}>Upgrade →</div>
        </div>
      </div>
    </div>
  )
}

// ── TRUST ─────────────────────────────────────────────────────────
export function TrustPage() {
  const { myBiz, refreshBiz, toast } = useApp()
  const [certModal, setCertModal] = useState(false)

  if (!myBiz) return <div className="empty"><div className="ico">🛡️</div><h3>Trust & Verification</h3><p>Create a business profile to build your Trust Score.</p></div>

  const nextThresh = myBiz.trust_score<50?50:myBiz.trust_score<75?75:myBiz.trust_score<90?90:100
  const nextName = nextThresh===50?'Silver':nextThresh===75?'Gold':nextThresh===90?'Platinum':'Max'

  const doKYC = async () => {
    if (myBiz.kyc_verified) { toast('Already verified!','info'); return }
    const ns = Math.min(100, myBiz.trust_score+15)
    await sb.from('businesses').update({ kyc_verified: true, trust_score: ns, trust_tier: tier(ns) }).eq('id', myBiz.id)
    await refreshBiz()
    toast('✅ KYC complete! +15 Trust Score')
  }

  const doCert = async () => {
    const ns = Math.min(100, myBiz.trust_score+12)
    await sb.from('businesses').update({ certified: true, trust_score: ns, trust_tier: tier(ns) }).eq('id', myBiz.id)
    await refreshBiz()
    setCertModal(false)
    toast('🏅 Certified! +12 Trust Score')
  }

  const breakdown = [
    { label:'Profile Completeness', pct: myBiz.description&&myBiz.tagline?95:60 },
    { label:'KYC Verified', pct: myBiz.kyc_verified?100:0 },
    { label:'Business Certified', pct: myBiz.certified?100:0 },
    { label:'Products Listed', pct: Math.min(100,(myBiz.products?.length||0)*20) },
  ]

  const tiers = [
    { name:'Bronze', range:'0–49', icon:'🥉' },
    { name:'Silver', range:'50–74', icon:'🥈' },
    { name:'Gold', range:'75–89', icon:'🥇' },
    { name:'Platinum', range:'90–100', icon:'💎' },
  ]

  const boosts = [
    { icon:'📝', label:'Complete your profile', pts:5, action: null, done:!!(myBiz.description&&myBiz.tagline) },
    { icon:'🪪', label:'KYC Verification', pts:15, action: doKYC, done:myBiz.kyc_verified },
    { icon:'🏅', label:'Business Certification ($19.99)', pts:12, action: () => setCertModal(true), done:myBiz.certified },
    { icon:'📦', label:'Add 5+ products', pts:10, action: null, done:(myBiz.products?.length||0)>=5 },
  ]

  return (
    <div style={{ paddingBottom: 16 }}>
      {certModal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1A2D47', borderRadius: 18, padding: 22, border: '1px solid rgba(255,255,255,0.07)', width: '100%' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, marginBottom: 8 }}>🏅 Business Certification</div>
            <div style={{ fontSize: 13, color: '#7A92B0', marginBottom: 18, lineHeight: 1.6 }}>Enhanced verification of your company registration.<br /><br /><span style={{ color: '#fff', fontWeight: 700 }}>One-time fee: $19.99</span></div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setCertModal(false)}>Cancel</button>
              <button className="btn btn-blue" style={{ flex: 1 }} onClick={doCert}>Pay & Certify</button>
            </div>
          </div>
        </div>
      )}

      <div className="topbar"><div className="page-title">Trust & Verification</div></div>

      <div style={{ margin: '0 16px 15px', borderRadius: 18, padding: 18, background: 'linear-gradient(135deg,#0C2340,#1A3D6E)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 50, height: 50, borderRadius: 13, background: 'linear-gradient(135deg,#1E7EF7,#6C63FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17, color: '#fff', flexShrink: 0 }}>{myBiz.logo}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 42, fontWeight: 800, color: '#1E7EF7', lineHeight: 1 }}>{myBiz.trust_score}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>Your Referral Score</div>
          </div>
          <div style={{ padding: '6px 11px', borderRadius: 9, background: 'rgba(245,166,35,0.2)', color: tierColor(myBiz.trust_tier), fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{tierIcon(myBiz.trust_tier)} {myBiz.trust_tier}</div>
        </div>
        {myBiz.trust_score < 100 && (
          <div style={{ marginTop: 13, position: 'relative', zIndex: 1 }}>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: (myBiz.trust_score/nextThresh*100)+'%', background: '#1E7EF7', borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9.5, color: 'rgba(255,255,255,0.3)' }}><span>0</span><span>+{nextThresh-myBiz.trust_score} pts to {nextName}</span><span>{nextThresh}</span></div>
          </div>
        )}
      </div>

      <div className="sec-hd"><h3>Score Breakdown</h3></div>
      <div style={{ padding: '0 16px', marginBottom: 14 }}>
        {breakdown.map(item => (
          <div key={item.label} style={{ marginBottom: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{item.label}</span>
              <span style={{ color: '#1E7EF7', fontWeight: 700 }}>{item.pct}%</span>
            </div>
            <div className="prog-wrap"><div className="prog-fill" style={{ width: item.pct+'%' }} /></div>
          </div>
        ))}
      </div>

      <div className="sec-hd"><h3>Trust Tiers</h3></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, padding: '0 16px', marginBottom: 14 }}>
        {tiers.map(t => (
          <div key={t.name} style={{ background: '#152236', borderRadius: 13, padding: 13, border: `1.5px solid ${t.name===myBiz.trust_tier?tierColor(t.name):'rgba(255,255,255,0.07)'}` }}>
            <div style={{ fontSize: 26, marginBottom: 5 }}>{t.icon}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: t.name===myBiz.trust_tier?tierColor(t.name):'#fff' }}>{t.name}</div>
            <div style={{ fontSize: 10.5, color: '#7A92B0', margin: '2px 0 5px' }}>Score {t.range}</div>
            {t.name===myBiz.trust_tier && <div style={{ display: 'inline-block', background: 'rgba(245,166,35,0.2)', color: '#F5A623', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5 }}>YOUR TIER</div>}
          </div>
        ))}
      </div>

      <div className="sec-hd"><h3>Boost Your Score</h3></div>
      <div style={{ margin: '0 16px', background: '#152236', borderRadius: 13, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        {boosts.map((b, i) => (
          <div key={b.label} onClick={() => !b.done && b.action?.()} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderBottom: i<boosts.length-1?'1px solid rgba(255,255,255,0.07)':'none', opacity: b.done?0.5:1, cursor: !b.done&&b.action?'pointer':'default' }}>
            <div style={{ fontSize: 17, flexShrink: 0 }}>{b.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, textDecoration: b.done?'line-through':'none', color: b.done?'#7A92B0':'#fff' }}>{b.label}</div>
              {b.done && <div style={{ fontSize: 10, color: '#00D4A0', fontWeight: 700, marginTop: 1 }}>✓ Complete</div>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: b.done?'#7A92B0':'#00D4A0', flexShrink: 0 }}>{b.done?'✓':'+'+b.pts+' pts'}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 8 }} />
    </div>
  )
}
