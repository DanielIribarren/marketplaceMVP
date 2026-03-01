import { supabase } from '../utils/supabase-client.js'
import { createNotification } from './notifications.js'

async function safeCreateNotification(payload) {
  try {
    await createNotification(payload)
  } catch (error) {
    console.error('Error al crear notificación de favorito:', error)
  }
}

export async function getMyFavorites(req, res) {
  try {
    const userId = req.user.id

    const { data, error } = await supabase
      .from('favorites')
      .select('mvp_id')
      .eq('user_id', userId)

    if (error) throw error

    res.status(200).json({
      success: true,
      data: (data || []).map((row) => row.mvp_id)
    })
  } catch (error) {
    console.error('Error al obtener favoritos:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudieron obtener los favoritos',
      details: error.message
    })
  }
}

export async function toggleFavorite(req, res) {
  try {
    const userId = req.user.id
    const { mvpId } = req.params

    if (!mvpId) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'Se requiere un mvpId válido'
      })
    }

    const { data: existing, error: existingError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('mvp_id', mvpId)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id)

      if (deleteError) throw deleteError

      return res.status(200).json({
        success: true,
        isFavorite: false
      })
    }

    const { error: insertError } = await supabase
      .from('favorites')
      .insert({ user_id: userId, mvp_id: mvpId })

    if (insertError) throw insertError

    const { data: mvpData } = await supabase
      .from('mvps')
      .select('id, title, owner_id')
      .eq('id', mvpId)
      .single()

    if (mvpData?.owner_id && mvpData.owner_id !== userId) {
      await safeCreateNotification({
        user_id: mvpData.owner_id,
        type: 'mvp_favorited',
        title: 'Tu MVP recibió un favorito',
        message: `Alguien agregó \"${mvpData.title || 'tu MVP'}\" a favoritos.`,
        data: {
          mvp_id: mvpId,
          href: '/marketplace'
        },
        read: false
      })
    }

    res.status(200).json({
      success: true,
      isFavorite: true
    })
  } catch (error) {
    console.error('Error al alternar favorito:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo actualizar el favorito',
      details: error.message
    })
  }
}
