import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  created_at: string
}

export interface Business {
  id: string
  owner_id: string
  name: string
  tagline: string
  description: string
  industry: string
  type: string
  city: string
  country: string
  website: string
  phone: string
  founded: string
  logo: string
  grad: string
  kyc_verified: boolean
  certified: boolean
  trust_score: number
  trust_tier: string
  followers: number
  created_at: string
  updated_at: string
  products?: Product[]
}

export interface Product {
  id: string
  business_id: string
  name: string
  description: string
  price: string
  emoji: string
  category: string
  created_at: string
}

export interface Connection {
  id: string
  from_biz_id: string
  to_biz_id: string
  status: string
  created_at: string
}

export interface Conference {
  id: string
  organizer_id: string
  title: string
  description: string
  date: string
  time: string
  industry: string
  location: string
  max_attendees: number
  status: string
  created_at: string
  conference_attendees?: ConferenceAttendee[]
}

export interface ConferenceAttendee {
  id: string
  conference_id: string
  business_id: string
  joined_at: string
  businesses?: Business
}

export interface Chat {
  id: string
  participant_a: string
  participant_b: string
  created_at: string
  other_business?: Business
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  text: string
  read: boolean
  created_at: string
}

export interface CallRoom {
  id: string
  chat_id: string
  room_url: string
  room_name: string
  created_by: string
  status: string
  created_at: string
}

export const INDUSTRIES = [
  'Technology','Food & Beverage','Fashion','Energy','Agriculture',
  'Healthcare','Manufacturing','Finance','Construction','Retail','Other'
]

export const COUNTRIES = [
  'UAE','UK','USA','Saudi Arabia','Turkey','Nigeria','India',
  'Germany','France','China','Egypt','Jordan','Pakistan','Other'
]

export const CONF_TIMES = [
  '9:00 AM','10:00 AM','12:00 PM','2:00 PM','5:00 PM','7:00 PM'
]

export function getGrad(id: string): string {
  const grads = ['gr1','gr2','gr3','gr4','gr5','gr6','gr7','gr8']
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return grads[Math.abs(hash) % grads.length]
}

export function getTier(score: number): string {
  if (score >= 90) return 'Platinum'
  if (score >= 75) return 'Gold'
  if (score >= 50) return 'Silver'
  return 'Bronze'
}

export function tierIcon(tier: string): string {
  const icons: Record<string, string> = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎' }
  return icons[tier] ?? '🥉'
}

export function tierColor(tier: string): string {
  const colors: Record<string, string> = {
    Bronze: '#CD7C2F', Silver: '#9CA3AF',
    Gold: 'var(--gold)', Platinum: 'var(--blue)'
  }
  return colors[tier] ?? 'var(--gray)'
}

export function indEmoji(industry: string): string {
  const emojis: Record<string, string> = {
    Technology: '💻', 'Food & Beverage': '🍔', Fashion: '👕',
    Energy: '⚡', Agriculture: '🌾', Healthcare: '💊',
    Manufacturing: '🏭', Finance: '💰', Construction: '🏗️', Retail: '🛍️'
  }
  return emojis[industry] ?? '🏢'
}

export function getLogo(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || 'BK'
}

export function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
