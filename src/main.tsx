import React from 'react'
import { createRoot } from 'react-dom/client'

function SafeApp() {
const [error, setError] = React.useState<string | null>(null)
const [loaded, setLoaded] = React.useState(false)
const [App, setApp] = React.useState<any>(null)

React.useEffect(() => {
import('./context/ctx').then(({ AppProvider }) => {
import('./App').then(({ default: AppComp }) => {
import('./styles/app.css').then(() => {
setApp(() => ({ AppProvider, AppComp }))
setLoaded(true)
}).catch(e => setError('CSS failed: ' + e.message))
}).catch(e => setError('App failed: ' + e.message))
}).catch(e => setError('Context failed: ' + e.message))
}, [])

if (error) return (
<div style={{ padding: 30, color: '#FF4B6E', background: '#0A1628', minHeight: '100vh', fontFamily: 'sans-serif' }}>
<h2 style={{ color: '#1E7EF7', marginBottom: 16 }}>bizzkit — Error</h2>
<p style={{ fontSize: 14, lineHeight: 1.6 }}>{error}</p>
</div>
)

if (!loaded || !App) return (
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0A1628', flexDirection: 'column', gap: 20 }}>
<div style={{ fontFamily: 'sans-serif', fontSize: 32, fontWeight: 800, color: '#1E7EF7' }}>bizz<span style={{ color: '#FF6B35' }}>kit</span></div>
<div style={{ width: 36, height: 36, border: '3px solid #152236', borderTopColor: '#1E7EF7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
<style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
</div>
)

const { AppProvider, AppComp } = App
return <AppProvider><AppComp /></AppProvider>
}

const el = document.getElementById('root')
if (el) {
createRoot(el).render(<SafeApp />)
} else {
document.body.innerHTML = '<div style="color:red;padding:20px">ROOT ELEMENT NOT FOUND</div>'
}
