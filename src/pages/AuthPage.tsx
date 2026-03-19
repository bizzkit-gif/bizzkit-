import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const { toast } = useApp()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (!password || password.length < 6) e.password = 'At least 6 characters'
    if (mode === 'register') {
      if (!firstName.trim()) e.firstName = 'Required'
      if (!lastName.trim()) e.lastName = 'Required'
      if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setErrors({ submit: error.message })
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { first_name: firstName, last_name: lastName }
          }
        })
        if (error) setErrors({ submit: error.message })
        else toast('🎉 Welcome to Bizzkit! Create your business profile.')
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setErrors({})
    setEmail(''); setPassword(''); setConfirmPassword('')
    setFirstName(''); setLastName('')
  }

  return (
    <div style={{
      minHeight: '100%', background: 'var(--dark)', overflowY: 'auto',
      WebkitOverflowScrolling: 'touch' as any,
      background: 'radial-gradient(ellipse at 50% -10%, rgba(30,126,247,.18), transparent 55%), var(--dark)'
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', padding: '60px 0 24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, color: 'var(--blue)' }}>
          bizz<span style={{ color: 'var(--accent)' }}>kit</span>
        </div>
        <div style={{ color: 'var(--gray)', fontSize: 13, marginTop: 6 }}>
          The Business Showcase & Networking Platform
        </div>
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', margin: '0 18px 18px', background: 'var(--card)', borderRadius: 13, padding: 4, border: '1px solid var(--border)' }}>
        {(['login', 'register'] as Mode[]).map(m => (
          <button key={m} onClick={() => switchMode(m)} style={{
            flex: 1, padding: '8px 0', border: 'none', borderRadius: 10,
            background: mode === m ? 'var(--blue)' : 'transparent',
            color: mode === m ? '#fff' : 'var(--gray)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s'
          }}>
            {m === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '0 18px 40px' }}>
        {mode === 'register' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>First Name</label>
              <input className={errors.firstName ? 'error' : ''} placeholder="Jane"
                value={firstName} onChange={e => setFirstName(e.target.value)} />
              {errors.firstName && <div className="error-msg">{errors.firstName}</div>}
            </div>
            <div className="field">
              <label>Last Name</label>
              <input className={errors.lastName ? 'error' : ''} placeholder="Smith"
                value={lastName} onChange={e => setLastName(e.target.value)} />
              {errors.lastName && <div className="error-msg">{errors.lastName}</div>}
            </div>
          </div>
        )}

        <div className="field">
          <label>Email Address</label>
          <input type="email" className={errors.email ? 'error' : ''}
            placeholder="you@company.com" value={email}
            onChange={e => setEmail(e.target.value)} autoComplete="email" />
          {errors.email && <div className="error-msg">{errors.email}</div>}
        </div>

        <div className="field">
          <label>Password</label>
          <input type="password" className={errors.password ? 'error' : ''}
            placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
            value={password} onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {errors.password && <div className="error-msg">{errors.password}</div>}
        </div>

        {mode === 'register' && (
          <div className="field">
            <label>Confirm Password</label>
            <input type="password" className={errors.confirmPassword ? 'error' : ''}
              placeholder="Repeat password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} />
            {errors.confirmPassword && <div className="error-msg">{errors.confirmPassword}</div>}
          </div>
        )}

        {errors.submit && <div className="form-error">{errors.submit}</div>}

        <button type="submit" className="btn btn-blue btn-full" disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : null}
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        {mode === 'register' && (
          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--gray2)', textAlign: 'center', lineHeight: 1.5 }}>
            By creating an account you agree to our Terms of Service.
          </div>
        )}
      </form>
    </div>
  )
}
