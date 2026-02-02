import { supabase } from '../../utils/supabase-client.js'

function parseStatuses(statusParam) {
  if (!statusParam) {
    return ['approved', 'pending_review']
  }

  if (statusParam === 'all') {
    return []
  }

  return statusParam
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

/**
 * GET /api/mvps/public
 * Lista MVPs públicos para búsqueda/marketplace
 */
export async function getPublicMvps(req, res) {
  try {
    const {
      q,
      category,
      deal_modality,
      status,
      sort = 'recent',
      limit = '12',
      offset = '0'
    } = req.query

    const statuses = parseStatuses(status)
    const parsedLimit = Math.min(Number(limit) || 12, 50)
    const parsedOffset = Math.max(Number(offset) || 0, 0)

    let query = supabase
      .from('mvps')
      .select(
        `
          id,
          title,
          one_liner,
          category,
          deal_modality,
          price_range,
          price,
          competitive_differentials,
          cover_image_url,
          images_urls,
          status,
          published_at
        `,
        { count: 'exact' }
      )

    if (statuses.length > 0) {
      query = query.in('status', statuses)
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,one_liner.ilike.%${q}%`)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (deal_modality) {
      query = query.eq('deal_modality', deal_modality)
    }

    switch (sort) {
      case 'price_low':
        query = query.order('price', { ascending: true, nullsFirst: false })
        break
      case 'price_high':
        query = query.order('price', { ascending: false, nullsLast: true })
        break
      default:
        query = query.order('published_at', { ascending: false })
        break
    }

    const { data, error, count } = await query.range(
      parsedOffset,
      parsedOffset + parsedLimit - 1
    )

    if (error) throw error

    res.status(200).json({
      success: true,
      data: data || [],
      count: count || 0
    })
  } catch (error) {
    console.error('Error al listar MVPs públicos:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudieron obtener los MVPs',
      details: error.message
    })
  }
}