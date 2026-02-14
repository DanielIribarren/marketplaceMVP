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

  function parsePriceToken(value) {
    if (!value) return null
    const match = String(value).trim().match(/(\d+(?:\.\d+)?)(\s*[kKmM])?/) 
    if (!match) return null
    const base = Number(match[1])
    if (Number.isNaN(base)) return null
    const suffix = (match[2] || '').toLowerCase().trim()
    if (suffix === 'k') return base * 1000
    if (suffix === 'm') return base * 1000000
    return base
  }

  function parsePriceRange(value) {
    if (!value) return null
    const tokens = String(value).match(/\d+(?:\.\d+)?\s*[kKmM]?/g) || []
    const numbers = tokens
      .map(parsePriceToken)
      .filter(amount => typeof amount === 'number')

    if (numbers.length === 0) return null
    const min = Math.min(...numbers)
    const max = Math.max(...numbers)
    return { min, max }
  }

  function passesPriceFilter(row, priceMin, priceMax) {
    const numericPrice = typeof row.price === 'number' ? row.price : null
    const range = numericPrice === null ? parsePriceRange(row.price_range) : null

    const minValue = numericPrice ?? range?.min ?? null
    const maxValue = numericPrice ?? range?.max ?? null

    if (minValue === null || maxValue === null) return false

    if (typeof priceMin === 'number' && minValue < priceMin) return false
    if (typeof priceMax === 'number' && maxValue > priceMax) return false
    return true
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
      price_min,
      price_max,
      published_from,
      published_to,
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
      const normalizedCategory = String(category).trim()
      if (normalizedCategory) {
        query = query.ilike('category', `%${normalizedCategory}%`)
      }
    }

    if (deal_modality) {
      query = query.eq('deal_modality', deal_modality)
    }

    const parsedPriceMin = price_min !== undefined ? Number(price_min) : undefined
    const parsedPriceMax = price_max !== undefined ? Number(price_max) : undefined
    const hasPriceFilter =
      (typeof parsedPriceMin === 'number' && !Number.isNaN(parsedPriceMin)) ||
      (typeof parsedPriceMax === 'number' && !Number.isNaN(parsedPriceMax))

    if (published_from) {
      const fromDate = new Date(published_from)
      if (!Number.isNaN(fromDate.getTime())) {
        query = query.gte('published_at', fromDate.toISOString())
      }
    }

    if (published_to) {
      const toDate = new Date(published_to)
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999)
        query = query.lte('published_at', toDate.toISOString())
      }
    }

    switch (sort) {
      case 'oldest':
        query = query.order('published_at', { ascending: true })
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

    let filteredData = data || []

    if (hasPriceFilter) {
      const priceMinValue =
        typeof parsedPriceMin === 'number' && !Number.isNaN(parsedPriceMin)
          ? parsedPriceMin
          : undefined
      const priceMaxValue =
        typeof parsedPriceMax === 'number' && !Number.isNaN(parsedPriceMax)
          ? parsedPriceMax
          : undefined

      filteredData = filteredData.filter(row => passesPriceFilter(row, priceMinValue, priceMaxValue))
    }

    if (sort === 'price_low' || sort === 'price_high') {
      const direction = sort === 'price_low' ? 1 : -1
      filteredData.sort((a, b) => {
        const aPrice = typeof a.price === 'number' ? a.price : parsePriceRange(a.price_range)?.min
        const bPrice = typeof b.price === 'number' ? b.price : parsePriceRange(b.price_range)?.min

        if (aPrice === undefined || aPrice === null) return 1
        if (bPrice === undefined || bPrice === null) return -1
        return (aPrice - bPrice) * direction
      })
    }

    const totalCount = hasPriceFilter ? filteredData.length : (count || 0)

    res.status(200).json({
      success: true,
      data: filteredData,
      count: totalCount
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