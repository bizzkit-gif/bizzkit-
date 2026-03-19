import React, { useState, useEffect, useCallback } from 'react'
import { supabase, Conference, INDUSTRIES, CONF_TIMES, indEmoji, fmtDate } from '../lib/supabase'
import { useApp } from '../context/AppContext'

export default function ConferencePage() {
  const { myBusiness, toast } = useApp()
  const [conferences, setConferences] = useState<Conference[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'book' | 'create'>('list')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadConferences = useCallback(async () => {
    const { data } = await supabase
      .from('conferences')
      .select('*, conference_attendees(business_id, businesses(id,name,logo))')
      .order('date', { ascending: true })
    setConferences(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadConferences() }, [loadConferences])

  // Real-time attendee updates
  useEffect(() => {
    const channel = supabase
      .channel('conf-attendees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conference_attendees' },
        () => loadConferences())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadConferences])

  const myConfs = conferences.filter(c =>
    myBusiness && c.conference_attendees?.some(a => a.business_id === myBusiness.id)
  )
  const available = conferences.filter(c =>
    !myBusiness || !c.conference_attendees?.some(a => a.business_id === myBusiness.id)
  )

  const handleJoin = async (conf: Conference) => {
    if (!myBusiness) { toast('Create a business profile first', 'info'); return }
    const count = conf.conference_attendees?.length ?? 0
    if (count >= conf.max_attendees) { toast('Session is full!', 'error'); return }
    const { error } = await supabase.from('conference_attendees')
      .insert({ conference_id: conf.id, business_id: myBusiness.id })
    if (error) { toast('Could not join — ' + error.message, 'error'); return }
    toast(`✅ Joined "${conf.title}"!`)
    loadConferences()
  }

  const handleLeave = async (conf: Conference) => {
    if (!myBusiness) return
    await supabase.from('conference_attendees')
      .delete().eq('conference_id', conf.id).eq('business_id', myBusiness.id)
    toast('Left conference')
    loadConferences()
  }

  if (view === 'book') return <BookingForm onBooked={() => { loadConferences(); setView('list'); toast('🎉 Conference booked!') }} onCancel={() => setView('list')} />
  if (view === 'create') return <CreateForm onCreated={() => { loadConferences(); setView('list'); toast('✅ Conference created!') }} onCancel={() => setView('list')} />

  return (
    <div style={{ paddingBottom: 16 }}>
      <div className="topbar">
        <div className="topbar-title">Conferences</div>
        {myBusiness && <button className="btn btn-blue btn-sm" onClick={() => setView('create')}>+ Host</button>}
      </div>

      {/* Hero */}
      <div style={{ margin: '0 16px 15px', borderRadius: 17, padding: '17px 17px 15px', background: 'linear-gradient(135deg,#0C2340,#1A3D6E)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -25, right: -25, width: 110, height: 110, borderRadius: '50%', background: 'radial-gradient(circle,rgba(30,126,247,.22),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 5, position: 'relative', zIndex: 1 }}>Live Business Networking</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.5, marginBottom: 13, position: 'relative', zIndex: 1 }}>
          Book a curated group session with up to 15 verified business owners.
        </div>
        <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
          <button className="btn btn-blue btn-sm" onClick={() => setView('book')}>📅 Book Session</button>
          <button className="btn btn-ghost btn-sm" style={{ borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)' }}
            onClick={() => toast('Go to the Random tab for Go Random!', 'info')}>🎲 Go Random</button>
        </div>
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>}

      {!loading && (
        <>
          {myConfs.length > 0 && (
            <>
              <div className="section-header"><h3>My Sessions</h3></div>
              {myConfs.map(c => (
                <ConfCard key={c.id} conf={c} myBizId={myBusiness?.id} joined expanded={expandedId === c.id}
                  onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  onLeave={() => handleLeave(c)} />
              ))}
              <div style={{ height: 8 }} />
            </>
          )}

          <div className="section-header">
            <h3>Available Sessions</h3>
            <span className="see-all">{available.length} open</span>
          </div>

          {available.length === 0 && (
            <div className="empty-state">
              <div className="emoji">📅</div>
              <h3>No sessions right now</h3>
              <p>Be the first to host one!</p>
              {myBusiness && <button className="btn btn-accent btn-sm" style={{ marginTop: 14 }} onClick={() => setView('create')}>+ Create a Conference</button>}
            </div>
          )}

          {available.map(c => (
            <ConfCard key={c.id} conf={c} myBizId={myBusiness?.id} joined={false} expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              onJoin={() => handleJoin(c)} />
          ))}
        </>
      )}
    </div>
  )
}

// ── Conference Card ────────────────────────────────────────────────
function ConfCard({ conf, myBizId, joined, expanded, onToggle, onJoin, onLeave }: any) {
  const attendees = conf.conference_attendees ?? []
  const spots = conf.max_attendees - attendees.length
  const pct = (attendees.length / conf.max_attendees) * 100
  const days = Math.ceil((new Date(conf.date).getTime() - Date.now()) / 86400000)
  const isMine = myBizId && conf.organizer_id === myBizId

  return (
    <div style={{ margin: '0 16px 10px', background: 'var(--card)', borderRadius: 15, border: `1px solid ${joined ? 'rgba(30,126,247,.35)' : 'var(--border)'}`, overflow: 'hidden' }}>
      <div style={{ padding: '13px 13px 10px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(30,126,247,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
            {indEmoji(conf.industry)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 700 }}>{conf.title}</div>
              {joined && <span style={{ fontSize: 9, fontWeight: 800, background: 'var(--blue)', color: '#fff', padding: '2px 5px', borderRadius: 5 }}>JOINED</span>}
              {isMine && <span style={{ fontSize: 9, fontWeight: 800, background: 'var(--accent)', color: '#fff', padding: '2px 5px', borderRadius: 5 }}>HOST</span>}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--gray)', marginTop: 2 }}>{conf.industry} · {conf.location}</div>
            <div style={{ fontSize: 10.5, color: 'var(--gray)', marginTop: 1 }}>📅 {fmtDate(conf.date)} at {conf.time}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: days <= 3 ? 'var(--accent)' : 'var(--blue)' }}>{Math.max(0, days)}d</div>
            <div style={{ fontSize: 9.5, color: 'var(--gray)' }}>away</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10.5 }}>
            <span style={{ color: 'var(--gray)' }}>{attendees.length} / {conf.max_attendees} attendees</span>
            <span style={{ color: spots <= 3 ? 'var(--accent)' : 'var(--green)', fontWeight: 700 }}>{spots} spot{spots !== 1 ? 's' : ''} left</span>
          </div>
          <div className="prog-wrap"><div className="prog-fill" style={{ width: `${pct}%`, background: pct > 80 ? 'var(--accent)' : 'var(--green)' }} /></div>
        </div>
      </div>

      <div style={{ padding: '0 13px 12px', display: 'flex', gap: 7 }}>
        {!joined && !isMine && (
          <button className="btn btn-blue btn-full btn-sm" onClick={e => { e.stopPropagation(); onJoin?.() }}>
            Join Session — {spots} spots left
          </button>
        )}
        {joined && !isMine && (
          <div style={{ display: 'flex', gap: 7, width: '100%' }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); onLeave?.() }}>Leave</button>
            <button className="btn btn-blue btn-sm" style={{ flex: 2 }}>View Details</button>
          </div>
        )}
        {isMine && <button className="btn btn-ghost btn-full btn-sm" onClick={() => {}}>Manage Your Conference</button>}
      </div>
    </div>
  )
}

// ── Booking Form ───────────────────────────────────────────────────
function BookingForm({ onBooked, onCancel }: any) {
  const { myBusiness, toast } = useApp()
  const [day, setDay] = useState(10)
  const [time, setTime] = useState('10:00 AM')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const SLOT_DAYS = [8, 10, 15, 18, 23, 25]
  const calDays = [null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]

  const handleBook = async () => {
    if (!myBusiness) { toast('Create a business profile first', 'info'); return }
    setSubmitting(true)
    const title = `${industry || 'Business'} Networking — ${myBusiness.city}`
    const dateStr = `2026-06-${String(day).padStart(2, '0')}`
    const loc = location || `${myBusiness.city}, ${myBusiness.country}`

    const { data: conf, error } = await supabase.from('conferences').insert({
      organizer_id: myBusiness.id, title, date: dateStr, time, industry: industry || 'General', location: loc, max_attendees: 15
    }).select().single()

    if (error || !conf) { toast('Could not book — ' + (error?.message ?? 'unknown error'), 'error'); setSubmitting(false); return }

    await supabase.from('conference_attendees').insert({ conference_id: conf.id, business_id: myBusiness.id })
    onBooked(conf)
    setSubmitting(false)
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="topbar">
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 16, cursor: 'pointer', padding: '4px 8px' }}>← Back</button>
        <div className="topbar-title">Book a Session</div>
        <div style={{ width: 60 }} />
      </div>
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 17 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Industry</label>
            <select value={industry} onChange={e => setIndustry(e.target.value)}>
              <option value="">All Industries</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Location</label>
            <input placeholder="City, Country" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 15, padding: 15, border: '1px solid var(--border)', marginBottom: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>June 2026</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'var(--gray2)', padding: '3px 0' }}>{d}</div>
            ))}
            {calDays.map((d, i) => {
              if (!d) return <div key={i} />
              const isSel = day === d, isSlot = SLOT_DAYS.includes(d)
              return (
                <div key={i} onClick={() => setDay(d)}
                  style={{ textAlign: 'center', padding: '7px 2px', borderRadius: 7, fontSize: 11.5, cursor: 'pointer', background: isSel ? 'var(--blue)' : 'transparent', color: isSel ? '#fff' : isSlot ? 'var(--blue)' : 'var(--gray)', fontWeight: isSlot || isSel ? 700 : 400, position: 'relative' }}>
                  {d}
                  {isSlot && !isSel && <div style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, background: 'var(--green)', borderRadius: '50%' }} />}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
          {CONF_TIMES.map(t => (
            <div key={t} onClick={() => setTime(t)}
              style={{ padding: '7px 13px', borderRadius: 9, border: `1.5px solid ${time === t ? 'var(--blue)' : 'var(--border)'}`, fontSize: 11.5, fontWeight: 600, color: time === t ? '#fff' : 'var(--gray)', background: time === t ? 'var(--blue)' : 'var(--card)', cursor: 'pointer' }}>
              {t}
            </div>
          ))}
        </div>

        <button className="btn btn-blue btn-full" onClick={handleBook} disabled={submitting}>
          {submitting ? 'Booking…' : 'Book Conference Session'}
        </button>
      </div>
    </div>
  )
}

// ── Create Conference Form ──────────────────────────────────────────
function CreateForm({ onCreated, onCancel }: any) {
  const { myBusiness, toast } = useApp()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00 AM')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState(myBusiness ? `${myBusiness.city}, ${myBusiness.country}` : '')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!myBusiness || !title || !date) { toast('Title and date are required', 'error'); return }
    setSubmitting(true)
    const { data: conf, error } = await supabase.from('conferences').insert({
      organizer_id: myBusiness.id, title, date, time, industry: industry || 'General',
      location: location || `${myBusiness.city}, ${myBusiness.country}`, max_attendees: 15
    }).select().single()
    if (error || !conf) { toast('Error: ' + (error?.message ?? 'unknown'), 'error'); setSubmitting(false); return }
    await supabase.from('conference_attendees').insert({ conference_id: conf.id, business_id: myBusiness.id })
    onCreated(conf)
    setSubmitting(false)
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="topbar">
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 16, cursor: 'pointer', padding: '4px 8px' }}>← Back</button>
        <div className="topbar-title">Host a Conference</div>
        <div style={{ width: 60 }} />
      </div>
      <div style={{ padding: '0 16px' }}>
        <div className="field"><label>Session Title *</label><input placeholder="e.g. MENA Tech Founders Meetup" value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <div className="field"><label>Date *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="field"><label>Industry</label>
            <select value={industry} onChange={e => setIndustry(e.target.value)}>
              <option value="">All</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Location</label><input placeholder="City, Country" value={location} onChange={e => setLocation(e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
          {CONF_TIMES.map(t => (
            <div key={t} onClick={() => setTime(t)}
              style={{ padding: '7px 13px', borderRadius: 9, border: `1.5px solid ${time === t ? 'var(--blue)' : 'var(--border)'}`, fontSize: 11.5, fontWeight: 600, color: time === t ? '#fff' : 'var(--gray)', background: time === t ? 'var(--blue)' : 'var(--card)', cursor: 'pointer' }}>
              {t}
            </div>
          ))}
        </div>
        <button className="btn btn-blue btn-full" onClick={handleCreate} disabled={submitting || !title || !date}>
          {submitting ? 'Creating…' : 'Create Conference'}
        </button>
      </div>
    </div>
  )
}
