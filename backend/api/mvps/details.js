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
const { data: creatorData } = await supabase
.from('user_profiles')
.select('display_name, avatar_url, company, bio')
.eq('user_id', data.owner_id)
.single()

creator = creatorData || null
}

const responseData = {
...data,
user_profiles: creator
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