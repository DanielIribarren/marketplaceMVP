'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotificationEmail } from '@/lib/email'

/**
 * Obtiene todos los mvp_id que el usuario actual tiene en favoritos
 */
export async function getMyFavorites(): Promise<{
    success: boolean
    data: string[]
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: [], error: 'not_authenticated' }

    try {
        const { data, error } = await supabase
            .from('favorites')
            .select('mvp_id')
            .eq('user_id', user.id)

        if (error) return { success: false, data: [], error: error.message }
        return { success: true, data: (data || []).map((f: { mvp_id: string }) => f.mvp_id) }
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, isFavorite: false, error: 'not_authenticated' }

    try {
        const admin = createAdminClient()

        // Check if already favorited
        const { data: existing } = await admin
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('mvp_id', mvpId)
            .maybeSingle()

        if (existing) {
            // Remove favorite
            await admin.from('favorites').delete().eq('user_id', user.id).eq('mvp_id', mvpId)

            // Decrement favorites_count
            const { data: mvpData } = await admin.from('mvps').select('favorites_count').eq('id', mvpId).single()
            if (mvpData) {
                await admin.from('mvps').update({
                    favorites_count: Math.max(0, (mvpData.favorites_count || 0) - 1)
                }).eq('id', mvpId)
            }

            return { success: true, isFavorite: false }
        } else {
            // Add favorite
            await admin.from('favorites').insert({ user_id: user.id, mvp_id: mvpId })

            // Increment favorites_count and get owner info
            const { data: mvpData } = await admin
                .from('mvps')
                .select('favorites_count, owner_id, title')
                .eq('id', mvpId)
                .single()

            if (mvpData) {
                await admin.from('mvps').update({
                    favorites_count: (mvpData.favorites_count || 0) + 1
                }).eq('id', mvpId)

                // Notify owner (not if owner is the same user)
                if (mvpData.owner_id !== user.id) {
                    const { data: profile } = await admin
                        .from('user_profiles')
                        .select('display_name')
                        .eq('id', user.id)
                        .single()
                    const requesterName = profile?.display_name || 'Un inversor'
                    const notification = {
                        type: 'mvp_favorited',
                        title: 'Tu MVP recibió un favorito',
                        message: `${requesterName} guardó "${mvpData.title}" en sus favoritos.`,
                        data: { mvp_id: mvpId, href: '/publish' }
                    }
                    try {
                        await admin.from('notifications').insert({ ...notification, user_id: mvpData.owner_id, read: false })
                    } catch { /* silent */ }
                    try {
                        const { data: authUser } = await admin.auth.admin.getUserById(mvpData.owner_id)
                        const email = authUser?.user?.email
                        if (email) sendNotificationEmail(email, notification).catch(() => {})
                    } catch { /* silent */ }
                }
            }

            return { success: true, isFavorite: true }
        }
    } catch {
        return { success: false, isFavorite: false, error: 'connection_error' }
    }
}
