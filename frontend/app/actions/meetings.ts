'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

// ─── Helper: crear notificación directo en Supabase ──────────────────────────

async function notify(
  admin: ReturnType<typeof createAdminClient>,
  notification: {
    user_id: string
    type: string
    title: string
    message: string
    data: Record<string, unknown>
  }
) {
  try {
    await admin.from('notifications').insert({ ...notification, read: false })
  } catch {
    // silent — notificaciones no son críticas
  }
}

// ─── Helper: obtener título del MVP ──────────────────────────────────────────

async function getMvpTitle(admin: ReturnType<typeof createAdminClient>, mvpId: string): Promise<string> {
  const { data } = await admin.from('mvps').select('title').eq('id', mvpId).single()
  return data?.title || 'tu MVP'
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    const { data: meeting, error: fetchError } = await admin.from('meetings').select('*').eq('id', meetingId).single()
    if (fetchError || !meeting) return { success: false, error: 'Reunión no encontrada' }

    const isOwner     = meeting.owner_id === user.id
    const isRequester = meeting.requester_id === user.id
    if (!isOwner && !isRequester) return { success: false, error: 'Sin permiso para confirmar esta reunión' }

    const ownerCanConfirm     = isOwner     && ['pending', 'counterproposal_investor'].includes(meeting.status)
    const requesterCanConfirm = isRequester && meeting.status === 'counterproposal_entrepreneur'
    if (!ownerCanConfirm && !requesterCanConfirm) {
      return { success: false, error: `No puedes confirmar una reunión en estado: ${meeting.status}` }
    }

    const { data: updated, error: updateError } = await admin
      .from('meetings')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        meeting_url: options?.meeting_url || null,
        owner_notes: options?.owner_notes || meeting.owner_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId)
      .select()
      .single()

    if (updateError) return { success: false, error: updateError.message }

    const recipientId = isOwner ? meeting.requester_id : meeting.owner_id
    const mvpTitle = await getMvpTitle(admin, meeting.mvp_id)

    await notify(admin, {
      user_id: recipientId,
      type: 'meeting_confirmed',
      title: 'Reunión confirmada',
      message: `${isOwner ? 'El emprendedor' : 'El inversor'} confirmó la reunión de "${mvpTitle}".`,
      data: { meeting_id: meeting.id, mvp_id: meeting.mvp_id, href: '/calendar' },
    })

    return { success: true, data: updated, message: 'Reunión confirmada exitosamente' }
  } catch {
    return { success: false, error: 'Error interno del servidor' }
  }
}

// ─── REJECT ──────────────────────────────────────────────────────────────────

export async function rejectMeeting(
  meetingId: string,
  rejection_reason?: string
): Promise<{ success: boolean; data?: Meeting; error?: string; message?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    const { data: meeting, error: fetchError } = await admin.from('meetings').select('*').eq('id', meetingId).single()
    if (fetchError || !meeting) return { success: false, error: 'Reunión no encontrada' }

    const isOwner     = meeting.owner_id === user.id
    const isRequester = meeting.requester_id === user.id
    if (!isOwner && !isRequester) return { success: false, error: 'Sin permiso para rechazar esta reunión' }

    const activeStatuses = ['pending', 'confirmed', 'counterproposal_entrepreneur', 'counterproposal_investor']
    if (!activeStatuses.includes(meeting.status)) {
      return { success: false, error: `No se puede rechazar una reunión en estado: ${meeting.status}` }
    }

    const { data: updated, error: updateError } = await admin
      .from('meetings')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: rejection_reason || 'Sin motivo especificado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId)
      .select()
      .single()

    if (updateError) return { success: false, error: updateError.message }

    if (meeting.availability_slot_id) {
      await admin
        .from('availability_slots')
        .update({ is_booked: false, booked_by: null, meeting_id: null })
        .eq('id', meeting.availability_slot_id)
    }

    const recipientId = isOwner ? meeting.requester_id : meeting.owner_id
    const mvpTitle = await getMvpTitle(admin, meeting.mvp_id)

    await notify(admin, {
      user_id: recipientId,
      type: 'meeting_rejected',
      title: 'Reunión rechazada',
      message: `${isOwner ? 'El emprendedor' : 'El inversor'} rechazó la reunión de "${mvpTitle}".`,
      data: { meeting_id: meeting.id, mvp_id: meeting.mvp_id, href: '/calendar' },
    })

    return { success: true, data: updated, message: 'Reunión rechazada' }
  } catch {
    return { success: false, error: 'Error interno del servidor' }
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { proposed_date, proposed_start_time, proposed_end_time, notes } = proposal
    if (!proposed_date || !proposed_start_time || !proposed_end_time) {
      return { success: false, error: 'Se requiere fecha, hora de inicio y hora de fin' }
    }

    const newScheduledAt = new Date(`${proposed_date}T${proposed_start_time}`)
    const endTime        = new Date(`${proposed_date}T${proposed_end_time}`)

    if (newScheduledAt <= new Date()) {
      return { success: false, error: 'La fecha propuesta debe ser futura' }
    }
    if (endTime <= newScheduledAt) {
      return { success: false, error: 'La hora de fin debe ser posterior a la hora de inicio' }
    }

    const durationMinutes = Math.round((endTime.getTime() - newScheduledAt.getTime()) / (1000 * 60))

    const admin = createAdminClient()
    const { data: meeting, error: fetchError } = await admin.from('meetings').select('*').eq('id', meetingId).single()
    if (fetchError || !meeting) return { success: false, error: 'Reunión no encontrada' }

    const isOwner     = meeting.owner_id === user.id
    const isRequester = meeting.requester_id === user.id
    if (!isOwner && !isRequester) return { success: false, error: 'Sin permiso para hacer contrapropuesta' }

    const activeStatuses = ['pending', 'confirmed', 'counterproposal_entrepreneur', 'counterproposal_investor']
    if (!activeStatuses.includes(meeting.status)) {
      return { success: false, error: `No se puede hacer contrapropuesta en estado: ${meeting.status}` }
    }

    const newStatus = isOwner ? 'counterproposal_entrepreneur' : 'counterproposal_investor'

    const { data: updated, error: updateError } = await admin
      .from('meetings')
      .update({
        status: newStatus,
        scheduled_at: newScheduledAt.toISOString(),
        duration_minutes: durationMinutes > 0 ? durationMinutes : meeting.duration_minutes,
        counterproposal_notes: notes || null,
        counterproposal_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId)
      .select()
      .single()

    if (updateError) return { success: false, error: updateError.message }

    if (meeting.availability_slot_id) {
      await admin
        .from('availability_slots')
        .update({ is_booked: false, booked_by: null, meeting_id: null })
        .eq('id', meeting.availability_slot_id)
    }

    const recipientId = isOwner ? meeting.requester_id : meeting.owner_id
    const mvpTitle = await getMvpTitle(admin, meeting.mvp_id)

    await notify(admin, {
      user_id: recipientId,
      type: 'meeting_counterproposal',
      title: 'Nueva contrapropuesta de horario',
      message: `${isOwner ? 'El emprendedor' : 'El inversor'} propuso un nuevo horario para la reunión de "${mvpTitle}".`,
      data: { meeting_id: meeting.id, mvp_id: meeting.mvp_id, href: '/calendar' },
    })

    return { success: true, data: updated, message: 'Contrapropuesta enviada exitosamente' }
  } catch {
    return { success: false, error: 'Error interno del servidor' }
  }
}

// ─── CANCEL ──────────────────────────────────────────────────────────────────

export async function cancelMeeting(
  meetingId: string,
  cancellation_reason?: string
): Promise<{ success: boolean; data?: Meeting; error?: string; message?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    const { data: meeting, error: fetchError } = await admin.from('meetings').select('*').eq('id', meetingId).single()
    if (fetchError || !meeting) return { success: false, error: 'Reunión no encontrada' }

    if (meeting.requester_id !== user.id) {
      return { success: false, error: 'Solo el inversor puede cancelar su solicitud' }
    }

    const activeStatuses = ['pending', 'confirmed', 'counterproposal_entrepreneur', 'counterproposal_investor']
    if (!activeStatuses.includes(meeting.status)) {
      return { success: false, error: 'Esta reunión no se puede cancelar' }
    }

    const { data: updated, error: updateError } = await admin
      .from('meetings')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellation_reason || 'Cancelada por el inversor',
        cancelled_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId)
      .select()
      .single()

    if (updateError) return { success: false, error: updateError.message }

    if (meeting.availability_slot_id) {
      await admin
        .from('availability_slots')
        .update({ is_booked: false, booked_by: null, meeting_id: null })
        .eq('id', meeting.availability_slot_id)
    }

    const mvpTitle = await getMvpTitle(admin, meeting.mvp_id)

    await notify(admin, {
      user_id: meeting.owner_id,
      type: 'meeting_cancelled',
      title: 'Reunión cancelada',
      message: `El inversor canceló la reunión pendiente de "${mvpTitle}".`,
      data: { meeting_id: meeting.id, mvp_id: meeting.mvp_id, href: '/calendar' },
    })

    return { success: true, data: updated, message: 'Reunión cancelada' }
  } catch {
    return { success: false, error: 'Error interno del servidor' }
  }
}
