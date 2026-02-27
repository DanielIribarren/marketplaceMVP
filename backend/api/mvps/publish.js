import { supabase } from '../../utils/supabase-client.js'
import { ensureDefaultAvailabilityForMvp } from '../../services/default-availability.js'

/**
 * POST /api/mvps/:id/publish
 * Publica un MVP
 */
export async function publishMVP(req, res) {
  try {
    const userId = req.user.id
    const mvpId = req.params.id

    // Obtener MVP
    const { data: mvp, error: fetchError } = await supabase
      .from('mvps')
      .select('*')
      .eq('id', mvpId)
      .single()

    if (fetchError || !mvp) {
      return res.status(404).json({ 
        error: 'No encontrado',
        message: 'MVP no encontrado' 
      })
    }

    // Verificar que el usuario sea el owner
    if (mvp.owner_id !== userId) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'No tienes permiso para publicar este MVP' 
      })
    }

    // Verificar que esté en estado draft
    if (mvp.status !== 'draft') {
      return res.status(400).json({ 
        error: 'Estado inválido',
        message: `El MVP ya está en estado: ${mvp.status}` 
      })
    }

    // Garantizar disponibilidad inicial por defecto para nuevos MVPs
    await ensureDefaultAvailabilityForMvp({
      supabase,
      mvpId,
      ownerId: userId
    })

    // Publicar MVP (cambiar estado a pending_review)
    const { data: published, error: publishError } = await supabase
      .from('mvps')
      .update({
        status: 'pending_review',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', mvpId)
      .select()
      .single()

    if (publishError) throw publishError

    // Crear notificación para admins (opcional)
    // TODO: Implementar sistema de notificaciones

    res.status(200).json({
      success: true,
      data: published,
      message: 'MVP publicado exitosamente. Está en revisión.'
    })

  } catch (error) {
    console.error('Error al publicar MVP:', error)
    res.status(500).json({ 
      error: 'Error del servidor',
      message: 'No se pudo publicar el MVP',
      details: error.message
    })
  }
}

/**
 * GET /api/mvps/:id
 * Obtener un MVP por ID
 */
export async function getMVP(req, res) {
  try {
    const userId = req.user.id
    const mvpId = req.params.id

    const { data: mvp, error } = await supabase
      .from('mvps')
      .select(`
        *,
        owner:owner_id (
          id,
          email,
          user_profiles (
            display_name,
            avatar_url,
            company
          )
        )
      `)
      .eq('id', mvpId)
      .single()

    if (error || !mvp) {
      return res.status(404).json({ 
        error: 'No encontrado',
        message: 'MVP no encontrado' 
      })
    }

    // Solo el owner puede ver borradores
    if (mvp.status === 'draft' && mvp.owner_id !== userId) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'No tienes permiso para ver este MVP' 
      })
    }

    res.status(200).json({
      success: true,
      data: mvp
    })

  } catch (error) {
    console.error('Error al obtener MVP:', error)
    res.status(500).json({ 
      error: 'Error del servidor',
      message: 'No se pudo obtener el MVP',
      details: error.message
    })
  }
}

/**
 * GET /api/mvps/my-drafts
 * Obtener borradores del usuario
 */
export async function getMyDrafts(req, res) {
  try {
    const userId = req.user.id

    const { data: drafts, error } = await supabase
      .from('mvps')
      .select('*')
      .eq('owner_id', userId)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })

    if (error) throw error

    res.status(200).json({
      success: true,
      data: drafts,
      count: drafts.length
    })

  } catch (error) {
    console.error('Error al obtener borradores:', error)
    res.status(500).json({ 
      error: 'Error del servidor',
      message: 'No se pudieron obtener los borradores',
      details: error.message
    })
  }
}
