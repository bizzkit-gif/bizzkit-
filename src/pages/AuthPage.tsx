import React, { useState } from 'react'
import { sb } from '../lib/db'
import { useApp } from '../context/ctx'

export default function AuthPage() {
  const { toast } = useApp()
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!email || !pw) { setErr('Please fill in all fields'); return }
    if (pw.length < 6) { setErr('Password must be at least 6 characters'); return }
    if (mode === 'register') {
      if (!first || !last) { setErr('Please enter your name'); return }
      if (pw !== pw2) { setErr('Passwords do not match'); return }
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw })
        if (error) setErr(error.message)
      } else {
        const { error } = await sb.auth.signUp({ email, password: pw, options: { data: { first_name: first, last_name: last } } })
        if (error) setErr(error.message)
        else toast('Welcome to Bizzkit! Set up your business profile.')
      }
    } catch (e: any) {
      setErr(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const s = {
    page: { minHeight: '100%', overflowY: 'auto' as const, background: 'radial-gradient(ellipse at 50% -10%, rgba(30,126,247,0.18), transparent 55%), #0A1628' },
    logo: { textAlign: 'center' as const, padding: '60px 0 24px' },
    logoText: { fontFamily: 'Syne, sans-serif', fontSize: 42, fontWeight: 800, color: '#1E7EF7' },
    sub: { color: '#7A92B0', fontSize: 13, marginTop: 6 },
    toggle: { display: 'flex', margin: '0 18px 18px', background: '#152236', borderRadius: 13, padding: 4, border: '1px solid rgba(255,255,255,0.07)' },
    form: { padding: '0 18px 40px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  }

  return (
    <div style={s.page}>
      <div style={s.logo}>
        <div style={s.logoText}>bizz<span style={{ color: '#FF6B35' }}>kit</span></div>
        <div style={s.sub}>The Business Showcase &amp; Networking Platform</div>
      </div>

      <div style={s.toggle}>
        {(['login','register'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setErr('') }} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 10, background: mode === m ? '#1E7EF7' : 'transparent', color: mode === m ? '#fff' : '#7A92B0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {m === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={s.form}>
        {mode === 'register' && (
          <div style={s.grid2}>
            <div className="field"><label>First Name</label><input placeholder="Jane" value={first} onChange={e => setFirst(e.target.value)} /></div>
            <div className="field"><label>Last Name</label><input placeholder="Smith" value={last} onChange={e => setLast(e.target.value)} /></div>
          </div>
        )}
        <div className="field">
          <label>Email Address</label>
          <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'} value={pw} onChange={e => setPw(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </div>
        {mode === 'register' && (
          <div className="field">
            <label>Confirm Password</label>
            <input type="password" placeholder="Repeat password" value={pw2} onChange={e => setPw2(e.target.value)} />
          </div>
        )}
        {err && <div className="form-err">{err}</div>}
        <button type="submit" className="btn btn-blue btn-full" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
