'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Obtiene todos los mvp_id que el usuario actual tiene en favoritos
 */
export async function getMyFavorites(): Promise<{
    success: boolean
    data: string[]
    error?: string
}> {
    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return { success: false, data: [], error: 'not_authenticated' }
    }

    const { data, error } = await supabase
        .from('favorites')
        .select('mvp_id')
        .eq('user_id', user.id)

    if (error) {
        return { success: false, data: [], error: error.message }
    }

    return {
        success: true,
        data: (data || []).map((row) => row.mvp_id),
    }
}

/**
 * Alterna el estado de favorito de un MVP para el usuario actual.
 * Si ya es favorito lo elimina, si no lo agrega.
 */
export async function toggleFavorite(mvpId: string): Promise<{
    success: boolean
    isFavorite: boolean
    error?: string
}> {
    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return { success: false, isFavorite: false, error: 'not_authenticated' }
    }

    // Verificar si ya existe
    const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('mvp_id', mvpId)
        .maybeSingle()

    if (existing) {
        // Eliminar favorito
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('id', existing.id)

        if (error) {
            return { success: false, isFavorite: true, error: error.message }
        }

        return { success: true, isFavorite: false }
    } else {
        // Agregar favorito
        const { error } = await supabase
            .from('favorites')
            .insert({ user_id: user.id, mvp_id: mvpId })

        if (error) {
            return { success: false, isFavorite: false, error: error.message }
        }

        return { success: true, isFavorite: true }
    }
}
