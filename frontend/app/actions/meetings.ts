'use server'

import { createClient } from '@/lib/supabase/server'


const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

async function getAuthToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

export type MeetingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | 'counterproposal_entrepreneur'
  | 'counterproposal_investor'

export interface Meeting {
  id: string
  mvp_id: string
  requester_id: string
  owner_id: string
  status: MeetingStatus
  scheduled_at: string | null
  duration_minutes: number
  meeting_url: string | null
  meeting_type: string
  timezone: string
  notes: string | null
  requester_notes: string | null
  owner_notes: string | null
  counterproposal_notes: string | null
  counterproposal_by: string | null
  rejection_reason: string | null
  cancellation_reason: string | null
  cancelled_by: string | null
  created_at: string
  updated_at: string
  confirmed_at: string | null
  rejected_at: string | null
  availability_slot_id: string | null
  offer_type: 'economic' | 'non_economic' | null
  offer_amount: number | null
  offer_equity_percent: number | null
  offer_note: string | null
  offer_status: string | null
  offer_discussed_at: string | null
  // Campos enriquecidos
  user_role?: 'entrepreneur' | 'investor'
  mvp: {
    id: string
    title: string
    slug: string
    cover_image_url: string | null
    owner_id: string
  } | null
  requester: {
    id: string
    display_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
  owner: {
    id: string
    display_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function getMyMeetings(params?: {
  status?: string
  from_date?: string
  to_date?: string
}): Promise<{ success: boolean; data: Meeting[]; error?: string }> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, data: [], error: 'No autenticado' }

    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.from_date) searchParams.set('from_date', params.from_date)
    if (params?.to_date) searchParams.set('to_date', params.to_date)

    const url = `${BACKEND_URL}/api/meetings/my-meetings${searchParams.toString() ? '?' + searchParams.toString() : ''}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    })

    const data = await response.json()
    if (!response.ok) return { success: false, data: [], error: data.message || 'Error al obtener reuniones' }

    return { success: true, data: data.data || [] }
  } catch {
    return { success: false, data: [], error: 'Error de conexión con el servidor' }
  }
}

// ─── CONFIRM ─────────────────────────────────────────────────────────────────

export async function confirmMeeting(
  meetingId: string,
  options?: { meeting_url?: string; owner_notes?: string }
): Promise<{ success: boolean; data?: Meeting; error?: string; message?: string }> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'No autenticado' }

    const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(options || {})
    })

    const data = await response.json()
    if (!response.ok) return { success: false, error: data.error, message: data.message }

    return { success: true, data: data.data, message: data.message }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

// ─── REJECT ──────────────────────────────────────────────────────────────────

export async function rejectMeeting(
  meetingId: string,
  rejection_reason?: string
): Promise<{ success: boolean; data?: Meeting; error?: string; message?: string }> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'No autenticado' }

    const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rejection_reason })
    })

    const data = await response.json()
    if (!response.ok) return { success: false, error: data.error, message: data.message }

    return { success: true, data: data.data, message: data.message }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

// ─── COUNTERPROPOSAL ─────────────────────────────────────────────────────────

export async function counterproposeMeeting(
  meetingId: string,
  proposal: {
    proposed_date: string
    proposed_start_time: string
    proposed_end_time: string
    notes?: string
  }
): Promise<{ success: boolean; data?: Meeting; error?: string; message?: string }> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'No autenticado' }

    const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/counterproposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(proposal)
    })

    const data = await response.json()
    if (!response.ok) return { success: false, error: data.error, message: data.message }

    return { success: true, data: data.data, message: data.message }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}

// ─── CANCEL ──────────────────────────────────────────────────────────────────

export async function cancelMeeting(
  meetingId: string,
  cancellation_reason?: string
): Promise<{ success: boolean; data?: Meeting; error?: string; message?: string }> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'No autenticado' }

    const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cancellation_reason })
    })

    const data = await response.json()
    if (!response.ok) return { success: false, error: data.error, message: data.message }

    return { success: true, data: data.data, message: data.message }
  } catch {
    return { success: false, error: 'Error de conexión' }
  }
}
