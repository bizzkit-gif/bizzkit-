import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A1628',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      color: '#fff',
      padding: 20
    }}>
      <div style={{ fontSize: 42, fontWeight: 800, color: '#1E7EF7', marginBottom: 8 }}>
        bizz<span style={{ color: '#FF6B35' }}>kit</span>
      </div>
      <div style={{ color: '#7A92B0', fontSize: 14, marginBottom: 40 }}>
        The Business Showcase & Networking Platform
      </div>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <input
          type="email"
          placeholder="Email address"
          style={{
            width: '100%', padding: '12px 14px', marginBottom: 10,
            background: '#152236', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none'
          }}
        />
        <input
          type="password"
          placeholder="Password"
          style={{
            width: '100%', padding: '12px 14px', marginBottom: 16,
            background: '#152236', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none'
          }}
        />
        <button style={{
          width: '100%', padding: '13px', background: '#1E7EF7',
          border: 'none', borderRadius: 10, color: '#fff',
          fontSize: 15, fontWeight: 700, cursor: 'pointer'
        }}>
          Sign In
        </button>
      </div>
    </div>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<App />)
}
