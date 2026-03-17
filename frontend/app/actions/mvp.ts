'use server'

import { createClient } from '@/lib/supabase/server'
import type { MVPPublication, QualitySignals } from '@/lib/types/mvp-publication'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'



/**
 * Calcula las señales de calidad para un MVP
 */
export async function calculateQualitySignals(mvpData: Partial<MVPPublication>): Promise<{
  success: boolean
  signals?: QualitySignals
  count?: number
  canPublish?: boolean
  error?: string
}> {
  try {
    const token = await getAuthToken()
    
    if (!token) {
      return { 
        success: false, 
        error: 'No autenticado' 
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/mvps/quality-signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        one_liner: mvpData.oneLiner,
        description: mvpData.description,
        demo_url: mvpData.demoUrl,
        images_urls: mvpData.screenshots,
        minimal_evidence: mvpData.minimalEvidence,
        deal_modality: mvpData.dealModality
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: 'Error al calcular señales'
      }
    }

    return {
      success: true,
      signals: data.signals,
      count: data.count,
      canPublish: data.canPublish
    }

  } catch (error) {
    console.error('Error al calcular señales:', error)
    return {
      success: false,
      error: 'Error de conexión'
    }
  }
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
    const token = await getAuthToken()
    
    if (!token) {
      return { 
        success: false, 
        error: 'No autenticado',
        message: 'Debes iniciar sesión para guardar borradores' 
      }
    }

    // Construir price_range desde minPrice y maxPrice
    let priceRange = undefined
    if (mvpData.minPrice && mvpData.maxPrice) {
      const minFormatted = mvpData.minPrice.toLocaleString('es-ES')
      const maxFormatted = mvpData.maxPrice.toLocaleString('es-ES')
      priceRange = `USD ${minFormatted}-${maxFormatted}`
    }

    const response = await fetch(`${BACKEND_URL}/api/mvps/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: (mvpData.id && !mvpData.id.startsWith('draft-')) ? mvpData.id : undefined,
        title: mvpData.name,
        one_liner: mvpData.oneLiner,
        category: mvpData.sector,
        description: mvpData.description,
        demo_url: mvpData.demoUrl,
        cover_image_url: mvpData.coverImageUrl,
        images_urls: mvpData.screenshots,
        monetization_model: mvpData.monetizationModel,
        minimal_evidence: mvpData.minimalEvidence,
        competitive_differentials: mvpData.competitiveDifferentials,
        deal_modality: mvpData.dealModality,
        price_range: priceRange,
        transfer_checklist: mvpData.transferChecklist,
        video_url: mvpData.videoUrl,
        testimonials: mvpData.testimonials,
        roadmap_60_days: mvpData.roadmap60Days,
        risks_and_mitigations: mvpData.risksAndMitigations
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al guardar',
        message: data.message || 'No se pudo guardar el borrador'
      }
    }

    return {
      success: true,
      data: data.data,
      validation: data.validation,
      message: data.message
    }

  } catch (error) {
    console.error('Error al guardar borrador:', error)
    return {
      success: false,
      error: 'Error de conexión',
      message: 'No se pudo conectar con el servidor'
    }
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

    if (!token) {
      return {
        success: false,
        error: 'No autenticado'
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/mvps/preview-from-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || 'No se pudo generar preview'
      }
    }

    const previewUrl = data?.data?.preview_url || data?.data?.favicon_url || null

    return {
      success: true,
      previewUrl,
      source: data?.data?.source || null,
      title: data?.data?.title || null
    }
  } catch (error) {
    console.error('Error al obtener preview de URL:', error)
    return {
      success: false,
      error: 'Error de conexión al obtener preview'
    }
  }
}

/**
 * Publica un MVP (requiere 5 señales de calidad)
 */
export async function publishMVP(mvpId: string) {
  try {
    const token = await getAuthToken()
    
    if (!token) {
      return { 
        success: false, 
        error: 'No autenticado',
        message: 'Debes iniciar sesión para publicar' 
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/mvps/${mvpId}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al publicar',
        message: data.message || 'No se pudo publicar el MVP',
        blockers: data.blockers,
        signals: data.signals
      }
    }

    return {
      success: true,
      data: data.data,
      message: data.message,
      signals: data.signals
    }

  } catch (error) {
    console.error('Error al publicar MVP:', error)
    return {
      success: false,
      error: 'Error de conexión',
      message: 'No se pudo conectar con el servidor'
    }
  }
}

/**
 * Elimina un borrador de MVP
 */
export async function deleteDraft(mvpId: string) {
  try {
    const token = await getAuthToken()

    if (!token) {
      return {
        success: false,
        error: 'No autenticado',
        message: 'Debes iniciar sesión'
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/mvps/${mvpId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al eliminar',
        message: data.message || 'No se pudo eliminar el borrador'
      }
    }

    return {
      success: true,
      message: 'Borrador eliminado correctamente'
    }

  } catch (error) {
    console.error('Error al eliminar borrador:', error)
    return {
      success: false,
      error: 'Error de conexión',
      message: 'No se pudo conectar con el servidor'
    }
  }
}

/**
 * Obtiene un MVP por ID
 */
export async function getMVP(mvpId: string) {
  try {
    const token = await getAuthToken()
    
    if (!token) {
      return { 
        success: false, 
        error: 'No autenticado' 
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/mvps/${mvpId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al obtener MVP'
      }
    }

    return {
      success: true,
      data: data.data
    }

  } catch (error) {
    console.error('Error al obtener MVP:', error)
    return {
      success: false,
      error: 'Error de conexión'
    }
  }
}

/**
 * Obtiene los borradores del usuario
 */
export async function getMyDrafts() {
  try {
    const token = await getAuthToken()
    console.log('🔍 [Server Action getMyDrafts] Token obtenido:', token ? 'Sí ✓' : 'No ✗')

    if (!token) {
      console.log('❌ [Server Action getMyDrafts] No hay token')
      return {
        success: false,
        error: 'No autenticado'
      }
    }

    console.log('🔍 [Server Action getMyDrafts] Haciendo fetch a:', `${BACKEND_URL}/api/mvps/my-drafts`)
    const response = await fetch(`${BACKEND_URL}/api/mvps/my-drafts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    console.log('🔍 [Server Action getMyDrafts] Status de respuesta:', response.status)
    const data = await response.json()
    console.log('🔍 [Server Action getMyDrafts] Datos recibidos:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.log('❌ [Server Action getMyDrafts] Respuesta no OK:', data)
      return {
        success: false,
        error: data.error || 'Error al obtener borradores'
      }
    }

    console.log('✅ [Server Action getMyDrafts] Retornando:', data.data?.length || 0, 'MVPs')
    return {
      success: true,
      data: data.data,
      count: data.count
    }

  } catch (error) {
    console.error('Error al obtener borradores:', error)
    return {
      success: false,
      error: 'Error de conexión'
    }
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

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al obtener MVPs'
      }
    }

    return {
      success: true,
      data: data.data || [],
      count: data.count || 0
    }
  } catch (error) {
    console.error('Error al obtener MVPs públicos:', error)
    return {
      success: false,
      error: 'Error de conexión'
    }
  }
}

/**
* Obtiene los detalles completos de un MVP específico (público)
*/
export async function getMvpDetails(mvpId: string) {
try {
const response = await fetch(`${BACKEND_URL}/api/mvps/public/${mvpId}`, {
cache: 'no-store'
})
const data = await response.json()

if (!response.ok) {
return {
success: false,
error: data.error || 'Error al obtener detalles del MVP'
}
}

return {
success: true,
data: data.data
}
} catch (error) {
console.error('Error al obtener detalles del MVP:', error)
return {
success: false,
error: 'Error de conexión'
}
}
}
