'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotificationEmail } from '@/lib/email'

async function notify(
  admin: ReturnType<typeof createAdminClient>,
  notification: { user_id: string; type: string; title: string; message: string; data: Record<string, unknown> }
) {
  try { await admin.from('notifications').insert({ ...notification, read: false }) } catch { /* silent */ }
  try {
    const { data } = await admin.auth.admin.getUserById(notification.user_id)
    const email = data?.user?.email
    if (email) await sendNotificationEmail(email, notification)
  } catch { /* silent */ }
}

/**
 * Create availability slots for an MVP
 */
export async function createAvailability(mvpId: string, slots: Array<{
  date: string
  start_time: string
  end_time: string
  timezone?: string
  notes?: string
}>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado', message: 'Debes iniciar sesión' }

    const admin = createAdminClient()
    const rows = slots.map(slot => ({
      mvp_id: mvpId,
      owner_id: user.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      timezone: slot.timezone || 'UTC',
      notes: slot.notes || null,
      is_booked: false,
    }))

    const { data, error } = await admin.from('availability_slots').insert(rows).select()
    if (error) return { success: false, error: error.message, message: 'Error al crear disponibilidad' }

    return { success: true, data, message: 'Disponibilidad creada exitosamente' }
  } catch (error) {
    console.error('Error al crear disponibilidad:', error)
    return { success: false, error: 'Error de conexión', message: 'No se pudo conectar con el servidor' }
  }
}

/**
 * Create bulk availability (multiple dates with same time slots)
 */
export async function createBulkAvailability(
  mvpId: string,
  dates: string[],
  timeSlots: Array<{ start_time: string; end_time: string }>,
  timezone?: string,
  notes?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    const rows = []
    for (const date of dates) {
      for (const slot of timeSlots) {
        rows.push({
          mvp_id: mvpId,
          owner_id: user.id,
          date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          timezone: timezone || 'UTC',
          notes: notes || null,
          is_booked: false,
        })
      }
    }

    const { data, error } = await admin.from('availability_slots').insert(rows).select()
    if (error) return { success: false, error: error.message, message: 'Error al crear disponibilidad' }

    return { success: true, data, message: 'Disponibilidad creada exitosamente' }
  } catch (error) {
    console.error('Error al crear disponibilidad bulk:', error)
    return { success: false, error: 'Error de conexión' }
  }
}

/**
 * Get availability for an MVP
 */
export async function getAvailabilityByMVP(
  mvpId: string,
  options?: {
    fromDate?: string
    toDate?: string
    availableOnly?: boolean
  }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    let query = admin
      .from('availability_slots')
      .select('*')
      .eq('mvp_id', mvpId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (options?.fromDate) query = query.gte('date', options.fromDate)
    if (options?.toDate) query = query.lte('date', options.toDate)
    if (options?.availableOnly) query = query.eq('is_booked', false)

    const { data, error } = await query
    if (error) return { success: false, error: error.message }

    return { success: true, data: data || [], count: data?.length || 0 }
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)
    return { success: false, error: 'Error de conexión' }
  }
}

/**
 * Get current user's availability slots
 */
export async function getMyAvailability(options?: {
  mvpId?: string
  fromDate?: string
  toDate?: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    let query = admin
      .from('availability_slots')
      .select('*')
      .eq('owner_id', user.id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (options?.mvpId) query = query.eq('mvp_id', options.mvpId)
    if (options?.fromDate) query = query.gte('date', options.fromDate)
    if (options?.toDate) query = query.lte('date', options.toDate)

    const { data, error } = await query
    if (error) return { success: false, error: error.message }

    return { success: true, data: data || [], count: data?.length || 0 }
  } catch (error) {
    console.error('Error al obtener mis slots:', error)
    return { success: false, error: 'Error de conexión' }
  }
}

/**
 * Delete an availability slot
 */
export async function deleteAvailabilitySlot(slotId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    const { data: slot } = await admin
      .from('availability_slots')
      .select('owner_id, is_booked')
      .eq('id', slotId)
      .single()

    if (!slot) return { success: false, error: 'Slot no encontrado' }
    if (slot.owner_id !== user.id) return { success: false, error: 'Sin permiso para eliminar este slot' }
    if (slot.is_booked) return { success: false, error: 'No se puede eliminar un slot reservado', message: 'Este slot ya está reservado' }

    const { error } = await admin.from('availability_slots').delete().eq('id', slotId)
    if (error) return { success: false, error: error.message }

    return { success: true, message: 'Slot eliminado correctamente' }
  } catch (error) {
    console.error('Error al eliminar slot:', error)
    return { success: false, error: 'Error de conexión' }
  }
}

/**
 * Book an availability slot (investor scheduling meeting)
 */
export type MeetingOfferInput =
  | {
      offer_type: 'economic'
      offer_amount: number
      offer_equity_percent: number
      offer_note?: string
    }
  | {
      offer_type: 'non_economic'
      offer_note: string
      offer_amount?: never
      offer_equity_percent?: never
    }

export async function bookAvailabilitySlot(
  slotId: string,
  notes?: string,
  meetingType?: 'video_call' | 'phone_call' | 'in_person',
  offer?: MeetingOfferInput
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado', message: 'Debes iniciar sesión para agendar reuniones' }

    if (!offer) return { success: false, error: 'Oferta requerida', message: 'Debes incluir una oferta inicial para solicitar la reunión' }

    // Validar oferta económica
    if (offer.offer_type === 'economic') {
      const amt = Number(offer.offer_amount)
      const eq  = Number(offer.offer_equity_percent)
      if (!Number.isFinite(amt) || amt <= 0) return { success: false, error: 'Oferta inválida', message: 'El monto debe ser un número válido mayor a 0' }
      if (amt > 1_000_000_000_000) return { success: false, error: 'Oferta inválida', message: 'El monto excede el límite permitido' }
      if (!Number.isFinite(eq) || eq <= 0 || eq > 100) return { success: false, error: 'Oferta inválida', message: 'El porcentaje debe ser mayor a 0 y menor o igual a 100' }
    }
    if (offer.offer_type === 'non_economic') {
      const note = typeof offer.offer_note === 'string' ? offer.offer_note.trim() : ''
      if (note.length < 20) return { success: false, error: 'Oferta inválida', message: 'Describe tu aporte no económico con al menos 20 caracteres' }
    }

    const admin = createAdminClient()

    // Obtener slot con MVP
    const { data: slot, error: slotError } = await admin
      .from('availability_slots')
      .select('*, mvp:mvp_id(id, title, owner_id)')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) return { success: false, error: 'No encontrado', message: 'Slot no encontrado' }
    if (slot.is_booked) return { success: false, error: 'Slot no disponible', message: 'Este slot ya está reservado' }
    if (slot.owner_id === user.id) return { success: false, error: 'Operación inválida', message: 'No puedes reservar tu propia disponibilidad' }

    // Verificar si ya tiene una solicitud activa para este MVP
    const TERMINAL = ['rejected', 'cancelled', 'completed']
    const { data: existing } = await admin
      .from('meetings')
      .select('id')
      .eq('mvp_id', slot.mvp_id)
      .eq('requester_id', user.id)
      .not('status', 'in', `(${TERMINAL.join(',')})`)
      .limit(1)

    if (existing && existing.length > 0) {
      return { success: false, error: 'Solicitud activa existente', message: 'Ya tienes una solicitud de reunión activa para este MVP' }
    }

    // Calcular duración
    const scheduledAt    = new Date(`${slot.date}T${slot.start_time}`)
    const endTime        = new Date(`${slot.date}T${slot.end_time}`)
    const durationMinutes = Math.round((endTime.getTime() - scheduledAt.getTime()) / (1000 * 60))

    const parsedAmount        = offer.offer_type === 'economic' ? Number(offer.offer_amount) : null
    const parsedEquityPercent = offer.offer_type === 'economic' ? Number(offer.offer_equity_percent) : null
    const trimmedNote         = offer.offer_type === 'non_economic' ? (offer.offer_note ?? '').trim() : null

    // Crear meeting
    const { data: meeting, error: meetingError } = await admin
      .from('meetings')
      .insert({
        mvp_id: slot.mvp_id,
        requester_id: user.id,
        owner_id: slot.owner_id,
        status: 'pending',
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: durationMinutes,
        meeting_type: meetingType || 'video_call',
        timezone: slot.timezone,
        requester_notes: notes || null,
        availability_slot_id: slotId,
        offer_type: offer.offer_type,
        offer_amount: parsedAmount,
        offer_equity_percent: parsedEquityPercent,
        offer_note: trimmedNote,
        offer_status: 'pending_discussion',
      })
      .select()
      .single()

    if (meetingError) return { success: false, error: meetingError.message, message: 'No se pudo crear la reunión' }

    // Marcar slot como reservado
    await admin.from('availability_slots').update({ is_booked: true, booked_by: user.id, meeting_id: meeting.id }).eq('id', slotId)

    // Obtener nombre del inversor
    const { data: profile } = await admin.from('user_profiles').select('display_name').eq('id', user.id).single()
    const requesterName = profile?.display_name || 'Un inversor'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mvpTitle = (slot as any).mvp?.title || 'tu MVP'

    await notify(admin, {
      user_id: slot.owner_id,
      type: 'meeting_requested',
      title: 'Nueva solicitud de reunión',
      message: `${requesterName} agendó una reunión para "${mvpTitle}".`,
      data: { meeting_id: meeting.id, mvp_id: slot.mvp_id, mvp_title: mvpTitle, requester_name: requesterName, scheduled_at: scheduledAt.toISOString(), offer_type: offer.offer_type, offer_amount: parsedAmount, offer_equity_percent: parsedEquityPercent, href: '/calendar' },
    })

    const offerMsg = offer.offer_type === 'economic'
      ? `Tienes una oferta económica pendiente (${parsedAmount} USD por ${parsedEquityPercent}% de equity) para "${mvpTitle}".`
      : `Tienes una oferta no económica pendiente para "${mvpTitle}".`

    await notify(admin, {
      user_id: slot.owner_id,
      type: 'offer_pending_review',
      title: 'Oferta pendiente de revisión',
      message: offerMsg,
      data: { meeting_id: meeting.id, mvp_id: slot.mvp_id, offer_type: offer.offer_type, href: '/calendar' },
    })

    return { success: true, data: meeting, message: 'Reunión solicitada exitosamente' }

  } catch {
    return { success: false, error: 'Error interno del servidor', message: 'No se pudo conectar con el servidor' }
  }
}
