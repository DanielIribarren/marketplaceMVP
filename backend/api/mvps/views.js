import { supabase } from '../../utils/supabase-client.js'

/**
 * POST /api/mvps/:id/view
 * Registra una vista única por usuario autenticado.
 * Si el usuario ya vio este MVP, no incrementa el contador.
 */
export async function recordMvpView(req, res) {
    try {
        const { id: mvpId } = req.params
        const userId = req.user.id

        if (!mvpId) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'El ID del MVP es requerido'
            })
        }

        // Intentar insertar en mvp_views (unique constraint evita duplicados)
        const { error: insertError } = await supabase
            .from('mvp_views')
            .insert({ mvp_id: mvpId, viewer_id: userId })

        if (insertError) {
            const msg = (insertError.message || '').toLowerCase()
            // Si es duplicado, el usuario ya vio este MVP → retornar sin error
            if (msg.includes('duplicate') || msg.includes('unique') || insertError.code === '23505') {
                return res.status(200).json({
                    success: true,
                    counted: false,
                    message: 'Vista ya registrada anteriormente'
                })
            }
            throw insertError
        }

        // Vista nueva → el trigger de BD incrementa views_count automáticamente
        // Obtener el views_count actualizado
        const { data: mvpData } = await supabase
            .from('mvps')
            .select('views_count')
            .eq('id', mvpId)
            .single()

        res.status(200).json({
            success: true,
            counted: true,
            views_count: mvpData?.views_count ?? 0
        })
    } catch (error) {
        console.error('Error al registrar vista:', error)
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudo registrar la vista',
            details: error.message
        })
    }
}
