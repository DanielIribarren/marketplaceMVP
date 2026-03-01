import { supabase } from '../utils/supabase-client.js'
import { createNotification } from './notifications.js'

async function getMvpTitle(mvpId) {
  const { data } = await supabase
    .from('mvps')
    .select('title')
    .eq('id', mvpId)
    .single()

  return data?.title || 'tu MVP'
}

async function safeCreateNotification(payload) {
  try {
    await createNotification(payload)
  } catch (error) {
    console.error('Error al crear notificación:', error)
  }
}

/**
 * GET /api/meetings/my-meetings
 * Obtiene todas las reuniones donde el usuario es solicitante O dueño del MVP.
 */
export async function getMyMeetings(req, res) {
  try {
    const userId = req.user.id
    const { status, from_date, to_date } = req.query

    let query = supabase
      .from('meetings')
      .select(`
        *,
        mvp:mvps!mvp_id (
          id,
          title,
          slug,
          cover_image_url,
          owner_id
        )
      `)
      .or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
      .order('scheduled_at', { ascending: true })

    if (status && status !== 'all') query = query.eq('status', status)
    if (from_date) query = query.gte('scheduled_at', from_date)
    if (to_date) query = query.lte('scheduled_at', to_date)

    const { data: meetings, error } = await query
    if (error) throw error

    if (!meetings || meetings.length === 0) {
      return res.status(200).json({ success: true, data: [], count: 0 })
    }

    // Resolver perfiles de participantes
    const userIds = new Set()
    for (const m of meetings) {
      userIds.add(m.requester_id)
      userIds.add(m.owner_id)
    }

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url, company')
      .in('id', [...userIds])

    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    const emailMap = new Map((authUsers || []).map(u => [u.id, u.email]))

    const enriched = meetings.map(m => ({
      ...m,
      // Rol del usuario actual en esta reunión
      user_role: m.mvp?.owner_id === userId ? 'entrepreneur' : 'investor',
      requester: {
        id: m.requester_id,
        display_name: profileMap.get(m.requester_id)?.display_name || null,
        avatar_url: profileMap.get(m.requester_id)?.avatar_url || null,
        email: emailMap.get(m.requester_id) || null,
      },
      owner: {
        id: m.owner_id,
        display_name: profileMap.get(m.owner_id)?.display_name || null,
        avatar_url: profileMap.get(m.owner_id)?.avatar_url || null,
        email: emailMap.get(m.owner_id) || null,
      },
    }))

    res.status(200).json({ success: true, data: enriched, count: enriched.length })
  } catch (error) {
    console.error('Error al obtener reuniones:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudieron obtener las reuniones',
      details: error.message
    })
  }
}

/**
 * POST /api/meetings/:id/confirm
 * El emprendedor (owner) confirma la reunión.
 */
export async function confirmMeeting(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params
    const { meeting_url, owner_notes } = req.body

    const { data: meeting, error: fetchError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !meeting) {
      return res.status(404).json({ error: 'No encontrada', message: 'Reunión no encontrada' })
    }

    const isOwner     = meeting.owner_id === userId
    const isRequester = meeting.requester_id === userId

    if (!isOwner && !isRequester) {
      return res.status(403).json({ error: 'Acceso denegado', message: 'No tienes permiso para confirmar esta reunión' })
    }

    // El emprendedor confirma solicitudes pendientes o contrapropuestas del inversor
    // El inversor confirma contrapropuestas del emprendedor
    const ownerCanConfirm     = isOwner     && ['pending', 'counterproposal_investor'].includes(meeting.status)
    const requesterCanConfirm = isRequester && meeting.status === 'counterproposal_entrepreneur'

    if (!ownerCanConfirm && !requesterCanConfirm) {
      return res.status(400).json({ error: 'Estado inválido', message: `No puedes confirmar una reunión en estado: ${meeting.status}` })
    }

    const { data: updated, error: updateError } = await supabase
      .from('meetings')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        meeting_url: meeting_url || null,
        owner_notes: owner_notes || meeting.owner_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    const recipientId = isOwner ? meeting.requester_id : meeting.owner_id
    const mvpTitle = await getMvpTitle(meeting.mvp_id)

    if (recipientId && recipientId !== userId) {
      await safeCreateNotification({
        user_id: recipientId,
        type: 'meeting_confirmed',
        title: 'Reunión confirmada',
        message: `${isOwner ? 'El emprendedor' : 'El inversor'} confirmó la reunión de "${mvpTitle}".`,
        data: {
          meeting_id: meeting.id,
          mvp_id: meeting.mvp_id,
          href: '/calendar'
        },
        read: false
      })
    }

    res.status(200).json({ success: true, data: updated, message: 'Reunión confirmada exitosamente' })
  } catch (error) {
    console.error('Error al confirmar reunión:', error)
    res.status(500).json({ error: 'Error del servidor', message: 'No se pudo confirmar la reunión', details: error.message })
  }
}

/**
 * POST /api/meetings/:id/reject
 * El emprendedor (owner) o el inversor rechaza definitivamente la reunión.
 */
export async function rejectMeeting(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params
    const { rejection_reason } = req.body

    const { data: meeting, error: fetchError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !meeting) {
      return res.status(404).json({ error: 'No encontrada', message: 'Reunión no encontrada' })
    }

    const isOwner = meeting.owner_id === userId
    const isRequester = meeting.requester_id === userId

    if (!isOwner && !isRequester) {
      return res.status(403).json({ error: 'Acceso denegado', message: 'No tienes permiso para rechazar esta reunión' })
    }

    const activeStatuses = ['pending', 'confirmed', 'counterproposal_entrepreneur', 'counterproposal_investor']
    if (!activeStatuses.includes(meeting.status)) {
      return res.status(400).json({ error: 'Estado inválido', message: `No se puede rechazar una reunión en estado: ${meeting.status}` })
    }

    const { data: updated, error: updateError } = await supabase
      .from('meetings')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: rejection_reason || 'Sin motivo especificado',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Liberar el slot de disponibilidad si existe
    if (meeting.availability_slot_id) {
      await supabase
        .from('availability_slots')
        .update({ is_booked: false, booked_by: null, meeting_id: null })
        .eq('id', meeting.availability_slot_id)
    }

    const recipientId = isOwner ? meeting.requester_id : meeting.owner_id
    const mvpTitle = await getMvpTitle(meeting.mvp_id)

    if (recipientId && recipientId !== userId) {
      await safeCreateNotification({
        user_id: recipientId,
        type: 'meeting_rejected',
        title: 'Reunión rechazada',
        message: `${isOwner ? 'El emprendedor' : 'El inversor'} rechazó la reunión de "${mvpTitle}".`,
        data: {
          meeting_id: meeting.id,
          mvp_id: meeting.mvp_id,
          href: '/calendar'
        },
        read: false
      })
    }

    res.status(200).json({ success: true, data: updated, message: 'Reunión rechazada' })
  } catch (error) {
    console.error('Error al rechazar reunión:', error)
    res.status(500).json({ error: 'Error del servidor', message: 'No se pudo rechazar la reunión', details: error.message })
  }
}

/**
 * POST /api/meetings/:id/counterproposal
 * El emprendedor o el inversor propone una nueva fecha.
 * Body: { proposed_date: "YYYY-MM-DD", proposed_start_time: "HH:MM", proposed_end_time: "HH:MM", notes: string }
 */
export async function counterproposeMeeting(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params
    const { proposed_date, proposed_start_time, proposed_end_time, notes } = req.body

    if (!proposed_date || !proposed_start_time || !proposed_end_time) {
      return res.status(400).json({ error: 'Datos incompletos', message: 'Se requiere fecha, hora de inicio y hora de fin' })
    }

    const { data: meeting, error: fetchError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !meeting) {
      return res.status(404).json({ error: 'No encontrada', message: 'Reunión no encontrada' })
    }

    const isOwner = meeting.owner_id === userId
    const isRequester = meeting.requester_id === userId

    if (!isOwner && !isRequester) {
      return res.status(403).json({ error: 'Acceso denegado', message: 'No tienes permiso para proponer una contrapropuesta' })
    }

    const activeStatuses = ['pending', 'confirmed', 'counterproposal_entrepreneur', 'counterproposal_investor']
    if (!activeStatuses.includes(meeting.status)) {
      return res.status(400).json({ error: 'Estado inválido', message: `No se puede hacer contrapropuesta en estado: ${meeting.status}` })
    }

    // La nueva fecha propuesta
    const newScheduledAt = new Date(`${proposed_date}T${proposed_start_time}`)
    const endTime = new Date(`${proposed_date}T${proposed_end_time}`)
    const durationMinutes = Math.round((endTime - newScheduledAt) / (1000 * 60))

    // El estado indica quién hizo la contrapropuesta (para saber a quién le toca responder)
    const newStatus = isOwner ? 'counterproposal_entrepreneur' : 'counterproposal_investor'

    const { data: updated, error: updateError } = await supabase
      .from('meetings')
      .update({
        status: newStatus,
        scheduled_at: newScheduledAt.toISOString(),
        duration_minutes: durationMinutes > 0 ? durationMinutes : meeting.duration_minutes,
        counterproposal_notes: notes || null,
        counterproposal_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Liberar el slot anterior si existe
    if (meeting.availability_slot_id) {
      await supabase
        .from('availability_slots')
        .update({ is_booked: false, booked_by: null, meeting_id: null })
        .eq('id', meeting.availability_slot_id)
    }

    const recipientId = isOwner ? meeting.requester_id : meeting.owner_id
    const mvpTitle = await getMvpTitle(meeting.mvp_id)

    if (recipientId && recipientId !== userId) {
      await safeCreateNotification({
        user_id: recipientId,
        type: 'meeting_counterproposal',
        title: 'Nueva contrapropuesta de horario',
        message: `${isOwner ? 'El emprendedor' : 'El inversor'} propuso un nuevo horario para la reunión de "${mvpTitle}".`,
        data: {
          meeting_id: meeting.id,
          mvp_id: meeting.mvp_id,
          href: '/calendar'
        },
        read: false
      })
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Contrapropuesta enviada exitosamente'
    })
  } catch (error) {
    console.error('Error al hacer contrapropuesta:', error)
    res.status(500).json({ error: 'Error del servidor', message: 'No se pudo enviar la contrapropuesta', details: error.message })
  }
}

/**
 * POST /api/meetings/:id/cancel
 * El inversor cancela una reunión pendiente o confirmada.
 */
export async function cancelMeeting(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params
    const { cancellation_reason } = req.body

    const { data: meeting, error: fetchError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !meeting) {
      return res.status(404).json({ error: 'No encontrada', message: 'Reunión no encontrada' })
    }

    if (meeting.requester_id !== userId) {
      return res.status(403).json({ error: 'Acceso denegado', message: 'Solo el inversor puede cancelar su solicitud' })
    }

    if (!['pending', 'confirmed', 'counterproposal_entrepreneur', 'counterproposal_investor'].includes(meeting.status)) {
      return res.status(400).json({ error: 'Estado inválido', message: 'Esta reunión no se puede cancelar' })
    }

    const { data: updated, error: updateError } = await supabase
      .from('meetings')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellation_reason || 'Cancelada por el inversor',
        cancelled_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    if (meeting.availability_slot_id) {
      await supabase
        .from('availability_slots')
        .update({ is_booked: false, booked_by: null, meeting_id: null })
        .eq('id', meeting.availability_slot_id)
    }

    const mvpTitle = await getMvpTitle(meeting.mvp_id)

    await safeCreateNotification({
      user_id: meeting.owner_id,
      type: 'meeting_cancelled',
      title: 'Reunión cancelada',
      message: `El inversor canceló la reunión pendiente de "${mvpTitle}".`,
      data: {
        meeting_id: meeting.id,
        mvp_id: meeting.mvp_id,
        href: '/calendar'
      },
      read: false
    })

    res.status(200).json({ success: true, data: updated, message: 'Reunión cancelada' })
  } catch (error) {
    console.error('Error al cancelar reunión:', error)
    res.status(500).json({ error: 'Error del servidor', message: 'No se pudo cancelar la reunión', details: error.message })
  }
}