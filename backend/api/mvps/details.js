import { supabase } from '../../utils/supabase-client.js'

/**
* GET /api/mvps/public/:id
* Obtiene los detalles completos de un MVP específico (público)
*/
export async function getMvpDetails(req, res) {
try {
const { id } = req.params

if (!id) {
return res.status(400).json({
error: 'Bad Request',
message: 'El ID del MVP es requerido'
})
}

const { data, error } = await supabase
.from('mvps')
.select(
`
id,
title,
slug,
one_liner,
description,
short_description,
category,
deal_modality,
price_range,
price,
monetization_model,
transfer_checklist,
competitive_differentials,
cover_image_url,
images_urls,
video_url,
demo_url,
repository_url,
documentation_url,
tech_stack,
features,
metrics,
views_count,
favorites_count,
status,
published_at,
created_at,
updated_at,
owner_id
`
)
.eq('id', id)
.eq('status', 'approved')
.single()

if (error || !data) {
return res.status(404).json({
error: 'Not Found',
message: 'MVP no encontrado o no está aprobado'
})
}

// Obtener información del creador
let creator = null
if (data.owner_id) {
  // display_name viene de auth.users via admin API
  let displayName = null
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(data.owner_id)
    displayName = authUser?.user?.user_metadata?.display_name
      || authUser?.user?.user_metadata?.name
      || null
  } catch (_) { /* ignorar si falla */ }

  // Campos del perfil: intentar con 'id' primero, luego 'user_id'
  let profileData = null
  const { data: p1, error: e1 } = await supabase
    .from('user_profiles')
    .select('avatar_url, company, bio, linkedin_url, location, website')
    .eq('id', data.owner_id)
    .single()

  if (!e1 && p1) {
    profileData = p1
  } else {
    const { data: p2 } = await supabase
      .from('user_profiles')
      .select('avatar_url, company, bio, linkedin_url, location, website')
      .eq('user_id', data.owner_id)
      .single()
    profileData = p2 || null
  }

  creator = { display_name: displayName, ...(profileData || {}) }
}

const responseData = {
...data,
user_profiles: creator,
// Asegurar que los contadores nunca sean negativos
views_count: Math.max(0, data.views_count || 0),
favorites_count: Math.max(0, data.favorites_count || 0)
}

res.status(200).json({
success: true,
data: responseData
})
} catch (error) {
res.status(500).json({
error: 'Error del servidor',
message: 'No se pudieron obtener los detalles del MVP',
details: error.message
})
}
}