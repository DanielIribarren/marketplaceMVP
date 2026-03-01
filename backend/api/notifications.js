import { supabase } from '../utils/supabase-client.js'

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

export async function createNotification(notification) {
  const { error } = await supabase
    .from('notifications')
    .insert(notification)

  if (error) {
    throw error
  }
}
