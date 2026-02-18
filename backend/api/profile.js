import { supabase } from '../utils/supabase-client.js'

// GET /api/profile -> retorna el profile del usuario autenticado
export async function getProfile(req, res) {
  try {
    console.log('[profile] getProfile called', { path: req.path, headers: req.headers && { authorization: req.headers.authorization } })
    const user = req.user
    console.log('[profile] req.user', user && { id: user.id, email: user.email })
    if (!user) return res.status(401).json({ error: 'No autorizado' })

    // Prefer fetching by `id` (some deployments use `id` as PK in user_profiles).
    // If that fails because the column doesn't exist, fall back to `user_id`.
    let data, error
    try {
      const resp = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      data = resp.data
      error = resp.error
    } catch (e) {
      console.error('Unexpected error fetching profile with id', e)
      return res.status(500).json({ error: 'Error al obtener perfil', details: e.message })
    }

    if (error) {
      // If the error indicates the id column doesn't exist, try fallback to `user_id`
      if (error.code === '42703' || /user_profiles\.id does not exist/.test(error.message || '')) {
        console.log('[profile] fallback: trying to query by user_id column instead of id')
        try {
          const resp2 = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()
          data = resp2.data
          error = resp2.error
        } catch (e2) {
          console.error('Unexpected error fetching profile with user_id', e2)
          return res.status(500).json({ error: 'Error al obtener perfil', details: e2.message })
        }
      }
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
      return res.status(500).json({ error: 'Error al obtener perfil', details: error.message })
    }

    return res.json(data || {})
  } catch (err) {
    console.error('getProfile error', err)
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({ error: 'Error del servidor', details: err.message })
    }
    res.status(500).json({ error: 'Error del servidor' })
  }
}

// POST /api/profile -> crea/actualiza el profile del usuario autenticado
export async function updateProfile(req, res) {
  try {
    console.log('[profile] updateProfile called', { path: req.path, headers: req.headers && { authorization: req.headers.authorization } })
    const user = req.user
    console.log('[profile] req.user', user && { id: user.id, email: user.email })
    if (!user) return res.status(401).json({ error: 'No autorizado' })

    const body = req.body || {}

    // Build record from incoming body; include optional display_name/email if provided
    // Build record from incoming body. Do NOT include `email` or `display_name` here
    // because `user_profiles` schema does not have those columns (they live in `users`).
    const baseRecord = {
      avatar_url: body.avatar_url || null,
      bio: body.bio || null,
      company: body.company || null,
      phone: body.phone || null,
      location: body.location || null,
      website: body.website || null,
      linkedin_url: body.linkedin_url || null,
      github_url: body.github_url || null,
    }

    // Prefer upserting using `id` as the key (current DB uses `id`).
    // If that fails because `id` doesn't exist, fall back to `user_id`.
    try {
      const recordWithId = { ...baseRecord, id: user.id }
      console.log('[profile] upserting record (using id):', recordWithId)
      let up = await supabase.from('user_profiles').upsert(recordWithId, { returning: 'representation' })
      console.log('[profile] upsert response:', up)

      // If upsert fails because `id` column doesn't exist, try `user_id`
      if (up.error && (up.error.code === '42703' || /user_profiles\.id does not exist/.test(String(up.error.message || '')))) {
        console.log('[profile] id column missing, retrying upsert using user_id column')
        const recordWithUserId = { ...baseRecord, user_id: user.id }
        up = await supabase.from('user_profiles').upsert(recordWithUserId, { returning: 'representation' })
        console.log('[profile] upsert response (user_id):', up)
      }

      if (up.error) {
        console.error('Error upserting profile:', up.error)
        return res.status(500).json({ error: 'Error al guardar perfil' })
      }

      return res.json(up.data?.[0] || up.data || {})
    } catch (e) {
      console.error('Unexpected error during upsert:', e)
      return res.status(500).json({ error: 'Error al guardar perfil', details: e.message })
    }
  } catch (err) {
    console.error('updateProfile error', err)
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({ error: 'Error del servidor', details: err.message })
    }
    res.status(500).json({ error: 'Error del servidor' })
  }
}
