import { supabase } from '../utils/supabase-client.js'
import { sendNotificationEmail } from '../services/email.js'

const MAX_LIMIT = 50

export async function getMyNotifications(req, res) {
  try {
    const userId = req.user.id
    const limitRaw = Number(req.query.limit || 10)
    const unreadOnly = req.query.unread_only === 'true'

    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
      : 10

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, error } = await query

    if (error) throw error

    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (unreadError) throw unreadError

    res.status(200).json({
      success: true,
      data: notifications || [],
      count: notifications?.length || 0,
      unread_count: unreadCount || 0
    })
  } catch (error) {
    console.error('Error al obtener notificaciones:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudieron obtener las notificaciones',
      details: error.message
    })
  }
}

export async function markNotificationAsRead(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params

    const { data: updated, error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Notificación marcada como leída'
    })
  } catch (error) {
    console.error('Error al marcar notificación:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo marcar la notificación como leída',
      details: error.message
    })
  }
}

export async function markAllNotificationsAsRead(req, res) {
  try {
    const userId = req.user.id

    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error

    res.status(200).json({
      success: true,
      message: 'Todas las notificaciones fueron marcadas como leídas'
    })
  } catch (error) {
    console.error('Error al marcar todas las notificaciones:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudieron actualizar las notificaciones',
      details: error.message
    })
  }
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin123@correo.unimet.edu.ve'

/**
 * POST /api/admin/mvp/:id/notify-decision
 * Notifica al owner de un MVP cuando el admin aprueba o rechaza su publicación.
 * Solo puede ser llamado por el admin.
 */
export async function notifyMvpDecision(req, res) {
  try {
    const callerEmail = req.user?.email?.toLowerCase()
    if (callerEmail !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'No autorizado', message: 'Solo el admin puede usar este endpoint' })
    }

    const { id: mvpId } = req.params
    const { decision, reason } = req.body

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decisión inválida', message: "Usa 'approved' o 'rejected'" })
    }

    const { data: mvp, error: mvpError } = await supabase
      .from('mvps')
      .select('id, title, owner_id')
      .eq('id', mvpId)
      .single()

    if (mvpError || !mvp) {
      return res.status(404).json({ error: 'No encontrado', message: 'MVP no encontrado' })
    }

    const isApproved = decision === 'approved'
    const notification = {
      user_id: mvp.owner_id,
      type: isApproved ? 'mvp_approved' : 'mvp_rejected',
      title: isApproved ? 'MVP aprobado 🎉' : 'MVP rechazado',
      message: isApproved
        ? `Tu MVP "${mvp.title}" fue aprobado y ya está visible en el marketplace.`
        : `Tu MVP "${mvp.title}" fue rechazado. Motivo: ${reason || 'Sin motivo especificado'}.`,
      data: { mvp_id: mvp.id, href: '/publish' },
      read: false
    }

    await createNotification(notification)

    res.status(200).json({ success: true, message: 'Notificación enviada al owner del MVP' })
  } catch (error) {
    console.error('Error al notificar decisión de MVP:', error)
    res.status(500).json({ error: 'Error del servidor', message: error.message })
  }
}

export async function createNotification(notification) {
  const { error } = await supabase
    .from('notifications')
    .insert(notification)

  if (error) throw error

  // Enviar correo al usuario en segundo plano (falla silenciosamente)
  try {
    const { data, error: userError } = await supabase.auth.admin.getUserById(notification.user_id)
    if (userError) {
      console.error('[EMAIL] Error obteniendo usuario:', userError.message)
      return
    }
    const email = data?.user?.email
    if (!email) {
      console.warn('[EMAIL] No se encontró email para user_id:', notification.user_id)
      return
    }
    console.log(`[EMAIL] Enviando notificación "${notification.type}" a ${email}...`)
    await sendNotificationEmail(email, notification)
  } catch (emailError) {
    console.error('[EMAIL] Error al enviar notificación por correo:', emailError.message)
  }
}
