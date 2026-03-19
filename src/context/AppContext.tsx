import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile, Business } from '../lib/supabase'

interface AppContextType {
  user: User | null
  profile: Profile | null
  myBusiness: Business | null
  session: Session | null
  loading: boolean
  refreshMyBusiness: () => Promise<void>
  setMyBusiness: (b: Business | null) => void
  activeTab: string
  setActiveTab: (t: string) => void
  prevTab: string
  setPrevTab: (t: string) => void
  viewingBizId: string | null
  setViewingBizId: (id: string | null) => void
  openChatWithId: string | null
  setOpenChatWithId: (id: string | null) => void
  unreadCount: number
  setUnreadCount: (n: number) => void
  toast: (msg: string, type?: 'success' | 'error' | 'info') => void
  toastState: { msg: string; type: string; visible: boolean }
}

const AppContext = createContext<AppContextType>({} as AppContextType)
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myBusiness, setMyBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('feed')
  const [prevTab, setPrevTab] = useState('feed')
  const [viewingBizId, setViewingBizId] = useState<string | null>(null)
  const [openChatWithId, setOpenChatWithId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [toastState, setToastState] = useState({ msg: '', type: 'success', visible: false })

  const toast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastState({ msg, type, visible: true })
    setTimeout(() => setToastState(s => ({ ...s, visible: false })), 2800)
  }, [])

  const refreshMyBusiness = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('businesses')
        .select('*, products(*)')
        .eq('owner_id', user.id)
        .single()
      setMyBusiness(data ?? null)
    } catch {
      setMyBusiness(null)
    }
  }, [user])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (!session) { setProfile(null); setMyBusiness(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) refreshMyBusiness()
    else setMyBusiness(null)
  }, [user, refreshMyBusiness])

  return (
    <AppContext.Provider value={{
      user, profile, myBusiness, session, loading,
      refreshMyBusiness, setMyBusiness,
      activeTab, setActiveTab, prevTab, setPrevTab,
      viewingBizId, setViewingBizId,
      openChatWithId, setOpenChatWithId,
      unreadCount, setUnreadCount,
      toast, toastState,
    }}>
      {children}
    </AppContext.Provider>
  )
}
