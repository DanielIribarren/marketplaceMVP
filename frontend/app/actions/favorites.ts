'use server'

import { createClient } from '@/lib/supabase/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

async function getAuthToken(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
}

/**
 * Obtiene todos los mvp_id que el usuario actual tiene en favoritos
 */
export async function getMyFavorites(): Promise<{
    success: boolean
    data: string[]
    error?: string
}> {
    const token = await getAuthToken()
    if (!token) {
        return { success: false, data: [], error: 'not_authenticated' }
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/favorites/my`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            cache: 'no-store'
        })

        const data = await response.json()

        if (!response.ok) {
            return { success: false, data: [], error: data?.error || 'request_failed' }
        }

        return {
            success: true,
            data: data?.data || [],
        }
    } catch {
        return { success: false, data: [], error: 'connection_error' }
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
    const token = await getAuthToken()
    if (!token) {
        return { success: false, isFavorite: false, error: 'not_authenticated' }
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/favorites/${mvpId}/toggle`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        const data = await response.json()

        if (!response.ok) {
            return {
                success: false,
                isFavorite: false,
                error: data?.error || 'request_failed'
            }
        }

        return {
            success: true,
            isFavorite: Boolean(data?.isFavorite)
        }
    } catch {
        return { success: false, isFavorite: false, error: 'connection_error' }
    }
}
