'use server'

import { createClient } from '@/lib/supabase/server'

export async function recordMvpUniqueView(mvpId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, reason: 'not_authenticated' as const }
  }

  const { error } = await supabase
    .from('mvp_views')
    .insert({ mvp_id: mvpId, viewer_id: user.id })

  if (error) {
    const msg = (error as any)?.message?.toLowerCase?.() ?? ''
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return { ok: true, counted: false as const } // ya existía
    }
    return { ok: false, reason: 'db_error' as const, error: error.message }
  }

  return { ok: true, counted: true as const }
}

export async function getMvpViewsCount(mvpId: string) {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('mvp_views')
    .select('*', { count: 'exact', head: true })
    .eq('mvp_id', mvpId)

  if (error) return { ok: false, count: 0, error: error.message }
  return { ok: true, count: count ?? 0 }
}
