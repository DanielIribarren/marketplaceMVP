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
      priceRange = `USD ${mvpData.minPrice.toLocaleString('es-ES')}-${mvpData.maxPrice.toLocaleString('es-ES')}`
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
    const canPublish = Object.values(signals).every(Boolean)

    if (!canPublish) {
      const blockers: string[] = []
      if (!signals.hasValidOneLiner) blockers.push('One-liner válido (tiene quién, dolor, resultado)')
      if (!signals.hasConcreteUseCase) blockers.push('Descripción con caso de uso concreto (no genérica)')
      if (!signals.hasDemoOrScreenshot) blockers.push('Demo URL válida o al menos 1 captura URL')
      if (!signals.hasMinimalEvidence) blockers.push('Evidencia mínima completada (tracción o eficiencia)')
      if (!signals.hasDealModality) blockers.push('Modalidad de deal seleccionada')
      if (!signals.hasTransferChecklist) blockers.push('Checklist de transferencia completo')
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

/**
 * Obtiene MVPs públicos para búsqueda
 */
export async function getPublicMvps(params: {
  q?: string
  category?: string
  dealModality?: string
  status?: string
  sort?: 'recent' | 'oldest' | 'price_low' | 'price_high'
  priceMin?: number
  priceMax?: number
  publishedFrom?: string
  publishedTo?: string
  limit?: number
  offset?: number
} = {}) {
  try {
    const searchParams = new URLSearchParams()

    if (params.q) searchParams.set('q', params.q)
    if (params.category) searchParams.set('category', params.category)
    if (params.dealModality) searchParams.set('deal_modality', params.dealModality)
    if (params.status) searchParams.set('status', params.status)
    if (params.sort) searchParams.set('sort', params.sort)
    if (typeof params.priceMin === 'number') searchParams.set('price_min', String(params.priceMin))
    if (typeof params.priceMax === 'number') searchParams.set('price_max', String(params.priceMax))
    if (params.publishedFrom) searchParams.set('published_from', params.publishedFrom)
    if (params.publishedTo) searchParams.set('published_to', params.publishedTo)
    if (typeof params.limit === 'number') searchParams.set('limit', String(params.limit))
    if (typeof params.offset === 'number') searchParams.set('offset', String(params.offset))

    const response = await fetch(`${BACKEND_URL}/api/mvps/public?${searchParams.toString()}`, {
      cache: 'no-store'
    })
    const data = await response.json()

    if (!response.ok) return { success: false, error: data.error || 'Error al obtener MVPs' }
    return { success: true, data: data.data || [], count: data.count || 0 }
  } catch (error) {
    console.error('Error al obtener MVPs públicos:', error)
    return { success: false, error: 'Error de conexión' }
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
* Obtiene los detalles completos de un MVP específico (público)
*/
export async function getMvpDetails(mvpId: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mvps/public/${mvpId}`, { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) return { success: false, error: data.error || 'Error al obtener detalles del MVP' }
    return { success: true, data: data.data }
  } catch (error) {
    console.error('Error al obtener detalles del MVP:', error)
    return { success: false, error: 'Error de conexión' }
  }
}
