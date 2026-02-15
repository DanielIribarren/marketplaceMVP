'use server'

import { createClient } from '@/lib/supabase/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

async function getAuthToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

export interface Meeting {
  id: string
  mvp_id: string
  requester_id: string
  owner_id: string
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled'
  scheduled_at: string | null
  duration_minutes: number
  meeting_url: string | null
  notes: string | null
  requester_notes: string | null
  owner_notes: string | null
  created_at: string
  updated_at: string
  confirmed_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  mvp: {
    id: string
    title: string
    slug: string
    cover_image_url: string | null
  } | null
  requester: {
    id: string
    display_name: string | null
    email: string
  } | null
  owner: {
    id: string
    display_name: string | null
    email: string
  } | null
}

export async function getMyMeetings(params?: {
  status?: string
  from_date?: string
  to_date?: string
}): Promise<{ success: boolean; data: Meeting[]; error?: string }> {
  try {
    const token = await getAuthToken()

    if (!token) {
      return { success: false, data: [], error: 'No autenticado' }
    }

    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.from_date) searchParams.set('from_date', params.from_date)
    if (params?.to_date) searchParams.set('to_date', params.to_date)

    const url = `${BACKEND_URL}/api/meetings/my-meetings${searchParams.toString() ? '?' + searchParams.toString() : ''}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, data: [], error: data.message || 'Error al obtener reuniones' }
    }

    return { success: true, data: data.data || [] }
  } catch (error) {
    return { success: false, data: [], error: 'Error de conexión con el servidor' }
  }
}
