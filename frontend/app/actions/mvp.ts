'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { MVPPublication, QualitySignals } from '@/lib/types/mvp-publication'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

// ─── Quality validation helpers (ported from backend/services/mvp-validation.js) ──

function validateOneLiner(oneLiner: string): boolean {
  if (!oneLiner || oneLiner.trim().length === 0) return false
  if (oneLiner.length > 120) return false
  if (oneLiner.trim().length < 20) return false
  return true
}

function validateDescription(description: string): boolean {
  if (!description || description.trim().length === 0) return false
  const wordCount = description.trim().split(/\s+/).length
  if (wordCount > 500 || wordCount < 15) return false
  return true
}

function validateUrl(url: string): boolean {
  if (!url || url.trim().length === 0) return false
  const trimmedUrl = url.trim()
  if (trimmedUrl.length > 2048) return false
  const lowerUrl = trimmedUrl.toLowerCase()
  const dangerous = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:', '<script', 'onerror=', 'onload=', 'onclick=']
  if (dangerous.some(p => lowerUrl.includes(p))) return false
  try {
    const urlObj = new URL(trimmedUrl)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch { return false }
}

function validateMinimalEvidence(evidence: string): boolean {
  if (!evidence || evidence.trim().length === 0) return false
  const wordCount = evidence.trim().split(/\s+/).length
  if (wordCount > 300 || wordCount < 10) return false
  return true
}

function slugify(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function buildSlug(title: string): string {
  const base = slugify(title) || 'mvp'
  const suffix = Math.random().toString(36).slice(2, 10)
  return `${base}-${suffix}`
}

/**
 * Calcula las señales de calidad para un MVP (sin llamada a Railway)
 */
export async function calculateQualitySignals(mvpData: Partial<MVPPublication>): Promise<{
  success: boolean
  signals?: QualitySignals
  count?: number
  canPublish?: boolean
  error?: string
}> {
  const tc = mvpData.transferChecklist
  const signals: QualitySignals = {
    hasValidOneLiner: validateOneLiner(mvpData.oneLiner || ''),
    hasConcreteUseCase: validateDescription(mvpData.description || ''),
    hasDemoOrScreenshot:
      validateUrl(mvpData.demoUrl || '') ||
      (Array.isArray(mvpData.screenshots) && mvpData.screenshots.length > 0),
    hasMinimalEvidence: validateMinimalEvidence(mvpData.minimalEvidence || ''),
    hasDealModality: !!mvpData.dealModality,
    hasTransferChecklist: !!(tc && tc.codeAndDocs && tc.domainOrLanding && tc.integrationAccounts && tc.ownIp),
  }
  const count = Object.values(signals).filter(Boolean).length
  return { success: true, signals, count, canPublish: count === 6 }
}

/**
 * Obtiene el token de autenticación del usuario actual
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

/**
 * Guarda un borrador de MVP (auto-guardado cada 10s)
 */
export async function saveDraft(mvpData: Partial<MVPPublication> & { id?: string }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado', message: 'Debes iniciar sesión para guardar borradores' }

    const admin = createAdminClient()

    let priceRange: string | undefined
    if (mvpData.minPrice && mvpData.maxPrice) {
      priceRange = `USD ${mvpData.minPrice}-${mvpData.maxPrice}`
    }

    const id = (mvpData.id && !mvpData.id.startsWith('draft-')) ? mvpData.id : undefined

    const draftData = {
      owner_id: user.id,
      title: mvpData.name || '',
      one_liner: mvpData.oneLiner || null,
      category: mvpData.sector || null,
      description: mvpData.description || '',
      demo_url: mvpData.demoUrl || null,
      cover_image_url: mvpData.coverImageUrl || null,
      images_urls: mvpData.screenshots || [],
      monetization_model: mvpData.monetizationModel || null,
      minimal_evidence: mvpData.minimalEvidence || null,
      competitive_differentials: mvpData.competitiveDifferentials || [],
      deal_modality: mvpData.dealModality || null,
      price_range: priceRange || null,
      transfer_checklist: mvpData.transferChecklist || { codeAndDocs: false, domainOrLanding: false, integrationAccounts: false, ownIp: false },
      video_url: mvpData.videoUrl || null,
      testimonials: mvpData.testimonials || [],
      roadmap_60_days: mvpData.roadmap60Days || [],
      risks_and_mitigations: mvpData.risksAndMitigations || [],
      status: 'draft',
      updated_at: new Date().toISOString(),
    }

    let result
    if (id) {
      const { data: existing } = await admin.from('mvps').select('owner_id').eq('id', id).single()
      if (!existing || existing.owner_id !== user.id) {
        return { success: false, error: 'Acceso denegado', message: 'No tienes permiso para editar este MVP' }
      }
      const { data, error } = await admin.from('mvps').update(draftData).eq('id', id).select().single()
      if (error) throw error
      result = data
    } else {
      const slug = buildSlug(mvpData.name || '')
      const { data, error } = await admin
        .from('mvps')
        .insert([{ ...draftData, slug, views_count: 0, favorites_count: 0 }])
        .select()
        .single()
      if (error) throw error
      result = data
    }

    const signals = await calculateQualitySignals(mvpData)
    return { success: true, data: result, validation: signals, message: 'Borrador guardado exitosamente' }

  } catch (error) {
    console.error('Error al guardar borrador:', error)
    return { success: false, error: 'Error de conexión', message: 'No se pudo guardar el borrador' }
  }
}

/**
 * Obtiene preview de portada a partir de una URL del MVP
 */
export async function getUrlPreview(url: string): Promise<{
  success: boolean
  previewUrl?: string | null
  source?: string | null
  title?: string | null
  error?: string
}> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'No autenticado' }

    const response = await fetch(`${BACKEND_URL}/api/mvps/preview-from-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ url })
    })

    const data = await response.json()
    if (!response.ok) return { success: false, error: data.message || data.error || 'No se pudo generar preview' }

    const previewUrl = data?.data?.preview_url || data?.data?.favicon_url || null
    return { success: true, previewUrl, source: data?.data?.source || null, title: data?.data?.title || null }
  } catch (error) {
    console.error('Error al obtener preview de URL:', error)
    return { success: false, error: 'Error de conexión al obtener preview' }
  }
}

/**
 * Publica un MVP (requiere 5 señales de calidad)
 */
export async function publishMVP(mvpId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado', message: 'Debes iniciar sesión para publicar' }

    const admin = createAdminClient()
    const { data: mvp, error: fetchError } = await admin.from('mvps').select('*').eq('id', mvpId).single()
    if (fetchError || !mvp) return { success: false, error: 'MVP no encontrado' }
    if (mvp.owner_id !== user.id) return { success: false, error: 'No tienes permiso para publicar este MVP' }
    if (!['draft', 'rejected'].includes(mvp.status)) {
      return { success: false, error: 'Solo puedes publicar borradores o MVPs rechazados' }
    }

    const tc = mvp.transfer_checklist
    const signals: QualitySignals = {
      hasValidOneLiner: validateOneLiner(mvp.one_liner || ''),
      hasConcreteUseCase: validateDescription(mvp.description || ''),
      hasDemoOrScreenshot: validateUrl(mvp.demo_url || '') || (Array.isArray(mvp.images_urls) && mvp.images_urls.length > 0),
      hasMinimalEvidence: validateMinimalEvidence(mvp.minimal_evidence || ''),
      hasDealModality: !!mvp.deal_modality,
      hasTransferChecklist: !!(tc && tc.codeAndDocs && tc.domainOrLanding && tc.integrationAccounts && tc.ownIp),
    }
    // Only the 5 core signals block publishing (transfer checklist is optional)
    const coreSignals = [signals.hasValidOneLiner, signals.hasConcreteUseCase, signals.hasDemoOrScreenshot, signals.hasMinimalEvidence, signals.hasDealModality]
    const canPublish = coreSignals.every(Boolean)

    if (!canPublish) {
      const blockers: string[] = []
      if (!signals.hasValidOneLiner) blockers.push('One-liner válido (tiene quién, dolor, resultado)')
      if (!signals.hasConcreteUseCase) blockers.push('Descripción con caso de uso concreto (no genérica)')
      if (!signals.hasDemoOrScreenshot) blockers.push('Demo URL válida o al menos 1 captura URL')
      if (!signals.hasMinimalEvidence) blockers.push('Evidencia mínima completada (tracción o eficiencia)')
      if (!signals.hasDealModality) blockers.push('Modalidad de deal seleccionada')
      return { success: false, error: 'No cumple los requisitos', message: 'Completa los requisitos antes de publicar', blockers, signals }
    }

    const { data, error } = await admin
      .from('mvps')
      .update({ status: 'pending_review', updated_at: new Date().toISOString() })
      .eq('id', mvpId)
      .select()
      .single()

    if (error) return { success: false, error: error.message, message: 'No se pudo publicar el MVP' }
    return { success: true, data, message: 'MVP enviado a revisión exitosamente', signals }

  } catch (error) {
    console.error('Error al publicar MVP:', error)
    return { success: false, error: 'Error de conexión', message: 'No se pudo conectar con el servidor' }
  }
}

/**
 * Elimina un borrador de MVP
 */
export async function deleteDraft(mvpId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado', message: 'Debes iniciar sesión' }

    const admin = createAdminClient()
    const { data: mvp } = await admin.from('mvps').select('owner_id, status').eq('id', mvpId).single()
    if (!mvp) return { success: false, error: 'MVP no encontrado' }
    if (mvp.owner_id !== user.id) return { success: false, error: 'No tienes permiso para eliminar este MVP' }
    if (mvp.status !== 'draft') return { success: false, error: 'Solo puedes eliminar borradores' }

    const { error } = await admin.from('mvps').delete().eq('id', mvpId)
    if (error) return { success: false, error: error.message, message: 'No se pudo eliminar el borrador' }
    return { success: true, message: 'Borrador eliminado correctamente' }

  } catch (error) {
    console.error('Error al eliminar borrador:', error)
    return { success: false, error: 'Error de conexión', message: 'No se pudo conectar con el servidor' }
  }
}

/**
 * Obtiene un MVP por ID
 */
export async function getMVP(mvpId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    const { data, error } = await admin.from('mvps').select('*').eq('id', mvpId).eq('owner_id', user.id).single()
    if (error || !data) return { success: false, error: 'MVP no encontrado' }
    return { success: true, data }

  } catch (error) {
    console.error('Error al obtener MVP:', error)
    return { success: false, error: 'Error de conexión' }
  }
}

/**
 * Obtiene los MVPs del usuario (borradores, pendientes, aprobados, rechazados)
 */
export async function getMyDrafts() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('mvps')
      .select('*')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, data: data || [], count: data?.length || 0 }

  } catch (error) {
    console.error('Error al obtener borradores:', error)
    return { success: false, error: 'Error de conexión' }
  }
}

// ─── Price helpers (ported from backend/api/mvps/public.js) ──────────────────

function parsePriceToken(value: string): number | null {
  const match = String(value).trim().match(/(\d+(?:\.\d+)?)(\s*[kKmM])?/)
  if (!match) return null
  const base = Number(match[1])
  if (Number.isNaN(base)) return null
  const suffix = (match[2] || '').toLowerCase().trim()
  if (suffix === 'k') return base * 1000
  if (suffix === 'm') return base * 1000000
  return base
}

function parsePriceRange(value: string | null): { min: number; max: number } | null {
  if (!value) return null
  // Strip Spanish thousand-separator dots (e.g. "1.000" → "1000") before parsing
  const normalized = String(value).replace(/\.(\d{3})(?!\d)/g, '$1')
  const tokens = normalized.match(/\d+(?:\.\d+)?\s*[kKmM]?/g) || []
  const numbers = tokens.map(parsePriceToken).filter((n): n is number => typeof n === 'number')
  if (numbers.length === 0) return null
  return { min: Math.min(...numbers), max: Math.max(...numbers) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function passesPriceFilter(row: any, priceMin?: number, priceMax?: number): boolean {
  const rawPrice = row.price != null ? Number(row.price) : NaN
  const numericPrice = !isNaN(rawPrice) ? rawPrice : null
  const range = numericPrice === null ? parsePriceRange(row.price_range) : null
  const minValue = numericPrice ?? range?.min ?? null
  const maxValue = numericPrice ?? range?.max ?? null
  if (minValue === null || maxValue === null) return false
  if (typeof priceMin === 'number' && minValue < priceMin) return false
  if (typeof priceMax === 'number' && maxValue > priceMax) return false
  return true
}

/**
 * Obtiene MVPs públicos para búsqueda (directo a Supabase, sin Railway)
 */
export async function getPublicMvps(params: {
  q?: string
  category?: string
  dealModality?: string
  status?: string
  sort?: 'recent' | 'oldest' | 'price_low' | 'price_high' | 'most_views' | 'most_favorites'
  priceMin?: number
  priceMax?: number
  publishedFrom?: string
  publishedTo?: string
  limit?: number
  offset?: number
} = {}) {
  try {
    const admin = createAdminClient()
    const parsedLimit = Math.min(params.limit || 12, 500)
    const parsedOffset = Math.max(params.offset || 0, 0)

    // Determine statuses
    let statuses: string[]
    if (!params.status) {
      statuses = ['approved', 'pending_review']
    } else if (params.status === 'all') {
      statuses = []
    } else {
      statuses = params.status.split(',').map(s => s.trim()).filter(Boolean)
    }

    let query = admin
      .from('mvps')
      .select(
        'id,title,one_liner,category,deal_modality,monetization_model,price_range,price,competitive_differentials,cover_image_url,images_urls,views_count,favorites_count,status,published_at,owner_id,slug',
        { count: 'exact' }
      )

    if (statuses.length > 0) query = query.in('status', statuses)
    if (params.q) query = query.or(`title.ilike.%${params.q}%,one_liner.ilike.%${params.q}%`)
    if (params.category && params.category !== 'all') query = query.ilike('category', `%${params.category}%`)
    if (params.dealModality) query = query.eq('deal_modality', params.dealModality)

    if (params.publishedFrom) {
      const from = new Date(params.publishedFrom + 'T00:00:00.000Z')
      if (!isNaN(from.getTime())) query = query.gte('published_at', from.toISOString())
    }
    if (params.publishedTo) {
      const to = new Date(params.publishedTo + 'T00:00:00.000Z')
      if (!isNaN(to.getTime())) {
        to.setUTCHours(23, 59, 59, 999)
        query = query.lte('published_at', to.toISOString())
      }
    }

    const sort = params.sort || 'recent'
    if (sort === 'oldest') {
      query = query.order('published_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true })
    } else if (sort === 'most_views') {
      query = query.order('views_count', { ascending: false, nullsFirst: false }).order('published_at', { ascending: false, nullsFirst: false })
    } else if (sort === 'most_favorites') {
      query = query.order('favorites_count', { ascending: false, nullsFirst: false }).order('published_at', { ascending: false, nullsFirst: false })
    } else {
      // recent (default)
      query = query.order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    }

    const hasPriceFilter =
      (typeof params.priceMin === 'number' && !isNaN(params.priceMin)) ||
      (typeof params.priceMax === 'number' && !isNaN(params.priceMax))

    const { data, error, count } = await query.range(parsedOffset, parsedOffset + parsedLimit - 1)
    if (error) throw error

    let filteredData = data || []

    if (hasPriceFilter) {
      filteredData = filteredData.filter(row => passesPriceFilter(row, params.priceMin, params.priceMax))
    }

    if (sort === 'price_low' || sort === 'price_high') {
      const dir = sort === 'price_low' ? 1 : -1
      filteredData.sort((a, b) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aPrice = typeof (a as any).price === 'number' ? (a as any).price : parsePriceRange((a as any).price_range)?.min
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bPrice = typeof (b as any).price === 'number' ? (b as any).price : parsePriceRange((b as any).price_range)?.min
        if (aPrice == null) return 1
        if (bPrice == null) return -1
        return (aPrice - bPrice) * dir
      })
    }

    const sanitized = filteredData.map(mvp => ({
      ...mvp,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      views_count: Math.max(0, (mvp as any).views_count || 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favorites_count: Math.max(0, (mvp as any).favorites_count || 0),
    }))

    return { success: true, data: sanitized, count: hasPriceFilter ? sanitized.length : (count || 0) }
  } catch (error) {
    console.error('Error al obtener MVPs públicos:', error)
    return { success: false, error: 'Error de conexión', data: [], count: 0 }
  }
}

/**
 * Obtiene el perfil público del creador de un MVP y sus otros MVPs publicados
 */
export async function getCreatorPublicData(ownerId: string, currentMvpId: string) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    let displayName: string | null = null
    let avatarFromAuth: string | null = null
    let email: string | null = null
    let joinedAt: string | null = null
    try {
      const { data: authUser } = await adminClient.auth.admin.getUserById(ownerId)
      displayName = authUser?.user?.user_metadata?.display_name
        || authUser?.user?.user_metadata?.name
        || null
      avatarFromAuth = authUser?.user?.user_metadata?.avatar_url || null
      email = authUser?.user?.email || null
      joinedAt = authUser?.user?.created_at || null
    } catch (_) { /* ignorar si no hay permisos */ }

    let profileData: Record<string, unknown> = {}
    const { data: p1, error: e1 } = await supabase
      .from('user_profiles')
      .select('avatar_url, bio, company, linkedin_url, location, website')
      .eq('id', ownerId)
      .single()

    if (!e1 && p1) {
      profileData = p1
    } else {
      const { data: p2 } = await supabase
        .from('user_profiles')
        .select('avatar_url, bio, company, linkedin_url, location, website')
        .eq('user_id', ownerId)
        .single()
      profileData = p2 || {}
    }

    const [otherMvpsRes, meetingsRes, totalMvpsRes] = await Promise.all([
      supabase
        .from('mvps')
        .select('id, title, cover_image_url, views_count, favorites_count, deal_modality, one_liner, slug')
        .eq('owner_id', ownerId)
        .eq('status', 'approved')
        .neq('id', currentMvpId)
        .order('published_at', { ascending: false }),
      supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId),
      supabase
        .from('mvps')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('status', 'approved'),
    ])

    return {
      success: true,
      data: {
        profile: {
          display_name: displayName,
          avatar_url: (profileData.avatar_url as string | null) || avatarFromAuth,
          ...profileData,
        },
        email,
        joinedAt,
        otherMvps: otherMvpsRes.data || [],
        meetingsCount: meetingsRes.count || 0,
        totalMvps: totalMvpsRes.count || 0,
      },
    }
  } catch (error) {
    console.error('Error fetching creator data:', error)
    return { success: false, error: 'Error al obtener datos del creador' }
  }
}

/**
 * Obtiene los detalles completos de un MVP específico (público, directo a Supabase)
 */
export async function getMvpDetails(mvpId: string) {
  try {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('mvps')
      .select('id,title,slug,one_liner,description,short_description,category,deal_modality,price_range,price,monetization_model,transfer_checklist,competitive_differentials,cover_image_url,images_urls,video_url,demo_url,repository_url,documentation_url,tech_stack,features,metrics,views_count,favorites_count,status,published_at,created_at,updated_at,owner_id,minimal_evidence,roadmap_60_days,risks_and_mitigations,testimonials')
      .eq('id', mvpId)
      .eq('status', 'approved')
      .single()

    if (error || !data) {
      return { success: false, error: 'MVP no encontrado o no está aprobado' }
    }

    // Obtener info del creador
    let creator = null
    if (data.owner_id) {
      let displayName: string | null = null
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(data.owner_id)
        displayName = authUser?.user?.user_metadata?.display_name || authUser?.user?.user_metadata?.name || null
      } catch { /* ignorar */ }

      let profileData = null
      const { data: p1, error: e1 } = await admin
        .from('user_profiles')
        .select('avatar_url, company, bio, linkedin_url, location, website')
        .eq('id', data.owner_id)
        .single()

      if (!e1 && p1) {
        profileData = p1
      } else {
        const { data: p2 } = await admin
          .from('user_profiles')
          .select('avatar_url, company, bio, linkedin_url, location, website')
          .eq('user_id', data.owner_id)
          .single()
        profileData = p2 || null
      }

      creator = { display_name: displayName ?? undefined, ...(profileData || {}) }
    }

    return {
      success: true,
      data: {
        ...data,
        user_profiles: creator ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        views_count: Math.max(0, (data as any).views_count || 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        favorites_count: Math.max(0, (data as any).favorites_count || 0),
      }
    }
  } catch (error) {
    console.error('Error al obtener detalles del MVP:', error)
    return { success: false, error: 'Error de conexión' }
  }
}
