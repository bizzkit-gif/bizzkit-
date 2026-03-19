import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from './context/AppContext'
import AuthPage from './pages/AuthPage'
import FeedPage from './pages/FeedPage'
import { ProfilePage, GoRandomPage, TrustPage } from './pages/OtherPages'
import MessagesPage from './pages/MessagesPage'
import ConferencePage from './pages/ConferencePage'

const NAV = [
  { id: 'feed',       icon: '🏠', label: 'Feed'    },
  { id: 'conference', icon: '📅', label: 'Connect' },
  { id: 'random',     icon: '🎲', label: 'Random'  },
  { id: 'messages',   icon: '💬', label: 'Chat'    },
  { id: 'profile',    icon: '🏢', label: 'Profile' },
]

export default function App() {
  const {
    user, loading,
    activeTab, setActiveTab,
    prevTab, setPrevTab,
    viewingBizId, setViewingBizId,
    openChatWithId, setOpenChatWithId,
    unreadCount, toastState,
  } = useApp()

  const [time, setTime] = useState('9:41')

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setTime(n.getHours() + ':' + String(n.getMinutes()).padStart(2, '0'))
    }
    tick()
    const t = setInterval(tick, 30000)
    return () => clearInterval(t)
  }, [])

  const goTab = useCallback((tab: string) => {
    setPrevTab(activeTab)
    setActiveTab(tab)
    if (tab !== 'profile') setViewingBizId(null)
  }, [activeTab, setActiveTab, setPrevTab, setViewingBizId])

  const handleViewBusiness = useCallback((id: string) => {
    setViewingBizId(id)
    setPrevTab(activeTab)
    setActiveTab('profile')
  }, [activeTab, setActiveTab, setPrevTab, setViewingBizId])

  const handleOpenChat = useCallback((bizId: string) => {
    setOpenChatWithId(bizId)
    setPrevTab(activeTab)
    setActiveTab('messages')
  }, [activeTab, setActiveTab, setPrevTab, setOpenChatWithId])

  if (loading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div className="logo">bizz<span>kit</span></div>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-shell">
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div className="screen">
            <AuthPage />
          </div>
        </div>
      </div>
    )
  }

  const renderScreen = () => {
    try {
      switch (activeTab) {
        case 'feed':
          return <FeedPage onViewBusiness={handleViewBusiness} />
        case 'profile':
          return (
            <ProfilePage
              viewingId={viewingBizId}
              onBack={viewingBizId ? () => { setViewingBizId(null); setActiveTab(prevTab) } : undefined}
              onOpenChat={handleOpenChat}
            />
          )
        case 'conference':
          return <ConferencePage />
        case 'random':
          return <GoRandomPage />
        case 'messages':
          return (
            <MessagesPage
              openChatWith={openChatWithId}
              onClearOpen={() => setOpenChatWithId(null)}
            />
          )
        case 'trust':
          return <TrustPage />
        default:
          return <FeedPage onViewBusiness={handleViewBusiness} />
      }
    } catch (err) {
      return (
        <div style={{ padding: 20, color: '#fff' }}>
          <h3>Something went wrong</h3>
          <p style={{ color: '#7A92B0', marginTop: 8, fontSize: 13 }}>
            {err instanceof Error ? err.message : 'Unknown error'}
          </p>
          <button onClick={() => goTab('feed')} style={{ marginTop: 16, padding: '10px 20px', background: '#1E7EF7', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' }}>
            Go to Feed
          </button>
        </div>
      )
    }
  }

  return (
    <div className="app-shell">
      <div className="status-bar">
        <div className="status-time">{time}</div>
        <div className="status-right">
          <span>WiFi</span>
          <span style={{ marginLeft: 4 }}>100%</span>
        </div>
      </div>

      <div className="screen-area">
        <div className="screen" key={activeTab + (viewingBizId ?? '')}>
          {renderScreen()}
        </div>
      </div>

      <nav className="bottom-nav">
        {NAV.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id || (item.id === 'profile' && activeTab === 'trust') ? 'active' : ''}`}
            onClick={() => goTab(item.id)}
          >
            <div className="nav-icon-wrap">
              <span className="nav-icon">{item.icon}</span>
              {item.id === 'messages' && unreadCount > 0 && (
                <div className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</div>
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </nav>

      <div className={`toast ${toastState.type === 'error' ? 'error' : toastState.type === 'info' ? 'info' : ''} ${toastState.visible ? 'visible' : ''}`}>
        {toastState.msg}
      </div>
    </div>
  )
}
