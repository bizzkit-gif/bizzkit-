import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, Chat, Message, Business, getGrad, fmtTime, timeAgo } from '../lib/supabase'
import { useApp } from '../context/AppContext'

interface Props { openChatWith?: string | null; onClearOpen?: () => void }

export default function MessagesPage({ openChatWith, onClearOpen }: Props) {
  const { myBusiness, setUnreadCount, toast } = useApp()
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadChats = useCallback(async () => {
    if (!myBusiness) return
    const { data } = await supabase
      .from('chats')
      .select('*')
      .or(`participant_a.eq.${myBusiness.id},participant_b.eq.${myBusiness.id}`)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // Enrich each chat with the other business and last message
    const enriched = await Promise.all(data.map(async chat => {
      const otherId = chat.participant_a === myBusiness.id ? chat.participant_b : chat.participant_a
      const { data: other } = await supabase.from('businesses').select('*').eq('id', otherId).single()
      const { data: msgs } = await supabase.from('messages').select('*')
        .eq('chat_id', chat.id).order('created_at', { ascending: false }).limit(1)
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true })
        .eq('chat_id', chat.id).neq('sender_id', myBusiness.id).eq('read', false)
      return { ...chat, other_business: other, last_message: msgs?.[0], unread_count: count ?? 0 }
    }))

    enriched.sort((a, b) => {
      const ta = a.last_message?.created_at ?? a.created_at
      const tb = b.last_message?.created_at ?? b.created_at
      return tb.localeCompare(ta)
    })

    setChats(enriched)
    setUnreadCount(enriched.reduce((sum, c) => sum + (c.unread_count ?? 0), 0))
    setLoading(false)
  }, [myBusiness, setUnreadCount])

  useEffect(() => { loadChats() }, [loadChats])

  useEffect(() => {
    if (openChatWith && myBusiness) {
      const open = async () => {
        const { data: chatId } = await supabase.rpc('get_or_create_chat', {
          biz_a: myBusiness.id, biz_b: openChatWith
        })
        if (chatId) { setActiveChatId(chatId); await loadChats() }
        onClearOpen?.()
      }
      open()
    }
  }, [openChatWith, myBusiness])

  if (!myBusiness) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <div className="emoji">💬</div>
        <h3>Your Messages</h3>
        <p>Create a business profile to start messaging other businesses.</p>
      </div>
    )
  }

  if (activeChatId) {
    const chat = chats.find(c => c.id === activeChatId)
    return (
      <ChatView
        chatId={activeChatId}
        otherBiz={chat?.other_business ?? null}
        myBizId={myBusiness.id}
        onBack={() => { setActiveChatId(null); loadChats() }}
        toast={toast}
      />
    )
  }

  return (
    <div style={{ paddingBottom: 16 }}>
      <div className="topbar">
        <div className="topbar-title">Messages</div>
        <div style={{ fontSize: 12, color: 'var(--gray)' }}>{chats.length} conversation{chats.length !== 1 ? 's' : ''}</div>
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>}

      {!loading && chats.length === 0 && (
        <div className="empty-state">
          <div className="emoji">💬</div>
          <h3>No messages yet</h3>
          <p>Connect with businesses in the Feed to start conversations.</p>
        </div>
      )}

      {chats.map(chat => {
        const other = chat.other_business
        if (!other) return null
        const unread = chat.unread_count ?? 0
        return (
          <div key={chat.id} onClick={() => setActiveChatId(chat.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
            onTouchStart={e => e.currentTarget.style.background = 'var(--card)'}
            onTouchEnd={e => e.currentTarget.style.background = 'transparent'}>
            <div className={getGrad(other.id)} style={{ width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#fff', flexShrink: 0, position: 'relative' }}>
              {other.logo}
              {unread > 0 && <div className="nav-badge" style={{ borderColor: 'var(--dark)' }}>{unread}</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 700 }}>{other.name}</div>
                {chat.last_message && <div style={{ fontSize: 10, color: 'var(--gray)', flexShrink: 0, marginLeft: 8 }}>{timeAgo(chat.last_message.created_at)}</div>}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--gray2)', marginTop: 1 }}>{other.industry} · {other.city}</div>
              {chat.last_message && (
                <div style={{ fontSize: 12, color: unread > 0 ? 'var(--white)' : 'var(--gray2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: unread > 0 ? 600 : 400 }}>
                  {chat.last_message.text}
                </div>
              )}
            </div>
            <div style={{ color: 'var(--gray2)', fontSize: 16 }}>›</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Chat View with Real-Time + Video Calls ────────────────────────
function ChatView({ chatId, otherBiz, myBizId, onBack, toast }: {
  chatId: string; otherBiz: Business | null; myBizId: string
  onBack: () => void; toast: (m: string, t?: any) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [callUrl, setCallUrl] = useState<string | null>(null)
  const [callLoading, setCallLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    // Mark as read
    await supabase.from('messages').update({ read: true })
      .eq('chat_id', chatId).neq('sender_id', myBizId).eq('read', false)
  }, [chatId, myBizId])

  useEffect(() => { loadMessages() }, [loadMessages])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time message subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
        // Mark read if it's from the other person
        if ((payload.new as Message).sender_id !== myBizId) {
          supabase.from('messages').update({ read: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chatId, myBizId])

  // Real-time call room subscription
  useEffect(() => {
    const channel = supabase
      .channel(`calls-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_rooms',
        filter: `chat_id=eq.${chatId}`
      }, payload => {
        const room = payload.new as any
        if (room.created_by !== myBizId) {
          // Someone is calling us
          toast(`📞 ${otherBiz?.name ?? 'Someone'} is calling! Tap to join.`, 'info')
          setCallUrl(room.room_url)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chatId, myBizId, otherBiz, toast])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    await supabase.from('messages').insert({ chat_id: chatId, sender_id: myBizId, text })
    setSending(false)
  }

  const startCall = async () => {
    setCallLoading(true)
    try {
      // Create a Daily.co room via our Supabase Edge Function
      // (or directly via Daily API - see README)
      const roomName = `bizzkit-${chatId.slice(0, 8)}-${Date.now()}`
      const dailyDomain = import.meta.env.VITE_DAILY_DOMAIN
      const dailyApiKey = import.meta.env.VITE_DAILY_API_KEY

      if (!dailyDomain || !dailyApiKey) {
        // Fallback: use a public Daily room for demo
        const roomUrl = `https://bizzkit.daily.co/${roomName}`
        setCallUrl(roomUrl)
        await supabase.from('call_rooms').insert({
          chat_id: chatId, room_url: roomUrl,
          room_name: roomName, created_by: myBizId
        })
        setCallLoading(false)
        return
      }

      // Create room via Daily API
      const res = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dailyApiKey}`
        },
        body: JSON.stringify({
          name: roomName,
          properties: {
            enable_screenshare: true,
            enable_chat: true,
            exp: Math.floor(Date.now() / 1000) + 3600, // 1hr expiry
          }
        })
      })
      const room = await res.json()

      await supabase.from('call_rooms').insert({
        chat_id: chatId, room_url: room.url,
        room_name: room.name, created_by: myBizId
      })

      setCallUrl(room.url)
    } catch (err) {
      toast('Could not start call. Check your Daily.co config.', 'error')
    } finally {
      setCallLoading(false)
    }
  }

  const endCall = () => setCallUrl(null)

  const QUICK = ["👋 Hello!", "Let's connect", "Request a quote?", "Schedule a call?"]

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = []
  messages.forEach(m => {
    const d = new Date(m.created_at).toDateString()
    const last = grouped[grouped.length - 1]
    if (last && last.date === d) last.msgs.push(m)
    else grouped.push({ date: d, msgs: [m] })
  })

  if (callUrl) {
    return (
      <div className="call-overlay">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--dark2)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>
            📞 Call with {otherBiz?.name}
          </div>
        </div>
        <iframe
          src={callUrl}
          allow="camera; microphone; fullscreen; speaker; display-capture"
          title="Video Call"
        />
        <div className="call-controls">
          <button className="call-btn call-btn-end" onClick={endCall}>📵</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 15px 9px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 20, cursor: 'pointer', padding: '2px 5px', flexShrink: 0 }}>←</button>
        {otherBiz && (
          <div className={getGrad(otherBiz.id)} style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0 }}>
            {otherBiz.logo}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {otherBiz?.name ?? 'Chat'}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--gray)' }}>{otherBiz?.industry} · {otherBiz?.city}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="icon-btn" style={{ width: 34, height: 34, fontSize: 14 }}
            onClick={() => toast(`📋 RFQ sent to ${otherBiz?.name}!`, 'info')}>📋</div>
          <div className="icon-btn" style={{ width: 34, height: 34, fontSize: 14, background: callLoading ? 'var(--card2)' : 'var(--card)' }}
            onClick={startCall}>
            {callLoading ? '⏳' : '📞'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"], padding: '11px 15px', scrollbarWidth: 'none' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--gray)' }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>👋</div>
            <div style={{ fontSize: 12.5 }}>Start the conversation with {otherBiz?.name}</div>
          </div>
        )}
        {grouped.map(group => (
          <div key={group.date}>
            <div style={{ textAlign: 'center', margin: '10px 0 9px' }}>
              <span style={{ fontSize: 9.5, color: 'var(--gray2)', background: 'var(--card)', padding: '3px 9px', borderRadius: 9, fontWeight: 600 }}>
                {new Date(group.msgs[0].created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
            {group.msgs.map((msg, i) => {
              const mine = msg.sender_id === myBizId
              const showAv = !mine && (i === 0 || group.msgs[i - 1]?.sender_id === myBizId)
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 5, marginBottom: 4 }}>
                  {!mine && (
                    <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, opacity: showAv ? 1 : 0 }}>
                      {showAv && otherBiz && (
                        <div className={getGrad(otherBiz.id)} style={{ width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                          {otherBiz.logo}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ maxWidth: '72%' }}>
                    <div style={{ padding: '8px 11px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: mine ? 'var(--blue)' : 'var(--card2)', color: 'var(--white)', fontSize: 13, lineHeight: 1.5, border: mine ? 'none' : '1px solid var(--border)' }}>
                      {msg.text}
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--gray2)', marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                      {fmtTime(msg.created_at)}{mine && (msg.read ? ' · Read' : ' · Sent')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '7px 11px 10px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--dark)' }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 7, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {QUICK.map(q => (
            <div key={q} onClick={() => setInput(q)}
              style={{ padding: '5px 9px', borderRadius: 9, background: 'var(--card)', border: '1px solid var(--border)', fontSize: 10.5, fontWeight: 600, color: 'var(--gray)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {q}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Type a message…"
            style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 13, padding: '9px 13px', color: 'var(--white)', fontSize: 13, outline: 'none' }}
          />
          <button onClick={send} disabled={!input.trim() || sending}
            style={{ width: 40, height: 40, borderRadius: 12, background: input.trim() ? 'var(--blue)' : 'var(--card)', border: `1px solid ${input.trim() ? 'var(--blue)' : 'var(--border)'}`, color: '#fff', fontSize: 18, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {sending ? '⏳' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}
