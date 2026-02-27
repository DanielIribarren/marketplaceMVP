'use server'

import { createClient } from '@/lib/supabase/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

/**
 * Get auth token helper
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

/**
 * Create availability slots for an MVP
 */
export async function createAvailability(mvpId: string, slots: Array<{
  date: string
  start_time: string
  end_time: string
  timezone?: string
  notes?: string
}>) {
  try {
    const token = await getAuthToken()
    
    if (!token) {
      return { 
        success: false, 
        error: 'No autenticado',
        message: 'Debes iniciar sesión' 
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mvp_id: mvpId,
        slots
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al crear disponibilidad',
        message: data.message
      }
    }

    return {
      success: true,
      data: data.data,
      message: data.message
    }

  } catch (error) {
    console.error('Error al crear disponibilidad:', error)
    return {
      success: false,
      error: 'Error de conexión',
      message: 'No se pudo conectar con el servidor'
    }
  }
}

/**
 * Create bulk availability (multiple dates with same time slots)
 */
export async function createBulkAvailability(
  mvpId: string,
  dates: string[],
  timeSlots: Array<{ start_time: string; end_time: string }>,
  timezone?: string,
  notes?: string
) {
  try {
    const token = await getAuthToken()
    
    if (!token) {
      return { 
        success: false, 
        error: 'No autenticado' 
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/availability/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mvp_id: mvpId,
        dates,
        time_slots: timeSlots,
        timezone: timezone || 'UTC',
        notes
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error,
        message: data.message
      }
    }

    return {
      success: true,
      data: data.data,
      message: data.message
    }

  } catch (error) {
    console.error('Error al crear disponibilidad bulk:', error)
    return {
      success: false,
      error: 'Error de conexión'
    }
  }
}

/**
 * Get availability for an MVP
 */
export async function getAvailabilityByMVP(
  mvpId: string,
  options?: {
    fromDate?: string
    toDate?: string
    availableOnly?: boolean
  }
) {
  try {
    const token = await getAuthToken()
    
    if (!token) {
      return { 
        success: false, 
        error: 'No autenticado' 
      }
    }

    const params = new URLSearchParams()
    if (options?.fromDate) params.append('from_date', options.fromDate)
    if (options?.toDate) params.append('to_date', options.toDate)
    if (options?.availableOnly) params.append('available_only', 'true')

    const response = await fetch(
      `${BACKEND_URL}/api/availability/mvp/${mvpId}?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error
      }
    }

    return {
      success: true,
      data: data.data,
      count: data.count
    }

  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)
    return {
      success: false,
      error: 'Error de conexión'
    }
  }
}

/**
 * Get current user's availability slots
 */
export async function getMyAvailability(options?: {
  mvpId?: string
  fromDate?: string
  toDate?: string
}) {
  try {
    const token = await getAuthToken()
    
    if (!token) {
      return { 
        success: false, 
        error: 'No autenticado' 
      }
    }

    const params = new URLSearchParams()
    if (options?.mvpId) params.append('mvp_id', options.mvpId)
    if (options?.fromDate) params.append('from_date', options.fromDate)
    if (options?.toDate) params.append('to_date', options.toDate)

    const response = await fetch(
      `${BACKEND_URL}/api/availability/my-slots?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error
      }
    }

    return {
      success: true,
      data: data.data,
      count: data.count
    }

  } catch (error) {
    console.error('Error al obtener mis slots:', error)
    return {
      success: false,
      error: 'Error de conexión'
    }
  }
}

/**
 * Delete an availability slot
 */
export async function deleteAvailabilitySlot(slotId: string) {
  try {
    const token = await getAuthToken()
    
    if (!token) {
      return { 
        success: false, 
        error: 'No autenticado' 
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/availability/${slotId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error,
        message: data.message
      }
    }

    return {
      success: true,
      message: data.message
    }

  } catch (error) {
    console.error('Error al eliminar slot:', error)
    return {
      success: false,
      error: 'Error de conexión'
    }
  }
}

/**
 * Book an availability slot (investor scheduling meeting)
 */
export type MeetingOfferInput =
  | {
      offer_type: 'economic'
      offer_amount: number
      offer_equity_percent: number
      offer_note?: string
    }
  | {
      offer_type: 'non_economic'
      offer_note: string
      offer_amount?: never
      offer_equity_percent?: never
    }

export async function bookAvailabilitySlot(
  slotId: string,
  notes?: string,
  meetingType?: 'video_call' | 'phone_call' | 'in_person',
  offer?: MeetingOfferInput
) {
  try {
    const token = await getAuthToken()
    
    if (!token) {
      return { 
        success: false, 
        error: 'No autenticado',
        message: 'Debes iniciar sesión para agendar reuniones' 
      }
    }

    if (!offer) {
      return {
        success: false,
        error: 'Oferta requerida',
        message: 'Debes incluir una oferta inicial para solicitar la reunión'
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/availability/${slotId}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        notes,
        meeting_type: meetingType || 'video_call',
        ...(offer || {})
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error,
        message: data.message
      }
    }

    return {
      success: true,
      data: data.data,
      message: data.message
    }

  } catch (error) {
    console.error('Error al reservar slot:', error)
    return {
      success: false,
      error: 'Error de conexión',
      message: 'No se pudo conectar con el servidor'
    }
  }
}
