import { supabase } from '../utils/supabase-client.js'

/**
 * POST /api/availability
 * Create availability slots for an MVP
 */
export async function createAvailability(req, res) {
  try {
    const userId = req.user.id
    const { mvp_id, slots } = req.body

    // Validate input
    if (!mvp_id || !slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'Se requiere mvp_id y un array de slots'
      })
    }

    // Verify MVP ownership
    const { data: mvp, error: mvpError } = await supabase
      .from('mvps')
      .select('id, owner_id')
      .eq('id', mvp_id)
      .single()

    if (mvpError || !mvp) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'MVP no encontrado'
      })
    }

    if (mvp.owner_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permiso para gestionar este MVP'
      })
    }

    // Prepare slots for insertion
    const slotsToInsert = slots.map(slot => ({
      mvp_id,
      owner_id: userId,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      timezone: slot.timezone || 'UTC',
      notes: slot.notes || null
    }))

    // Insert slots (upsert to handle duplicates)
    const { data: createdSlots, error: insertError } = await supabase
      .from('availability_slots')
      .upsert(slotsToInsert, {
        onConflict: 'mvp_id,date,start_time',
        ignoreDuplicates: false
      })
      .select()

    if (insertError) throw insertError

    res.status(201).json({
      success: true,
      data: createdSlots,
      message: `${createdSlots.length} slots creados exitosamente`
    })

  } catch (error) {
    console.error('Error al crear disponibilidad:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo crear la disponibilidad',
      details: error.message
    })
  }
}

/**
 * GET /api/availability/mvp/:mvpId
 * Get available slots for an MVP
 */
export async function getAvailabilityByMVP(req, res) {
  try {
    const { mvpId } = req.params
    const { from_date, to_date, available_only } = req.query

    let query = supabase
      .from('availability_slots')
      .select('*')
      .eq('mvp_id', mvpId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    // Filter by date range
    if (from_date) {
      query = query.gte('date', from_date)
    }
    if (to_date) {
      query = query.lte('date', to_date)
    }

    // Only show available slots
    if (available_only === 'true') {
      query = query.eq('is_booked', false)
    }

    const { data: slots, error } = await query

    if (error) throw error

    res.status(200).json({
      success: true,
      data: slots,
      count: slots.length
    })

  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo obtener la disponibilidad',
      details: error.message
    })
  }
}

/**
 * GET /api/availability/my-slots
 * Get current user's availability slots
 */
export async function getMyAvailability(req, res) {
  try {
    const userId = req.user.id
    const { mvp_id, from_date, to_date } = req.query

    let query = supabase
      .from('availability_slots')
      .select(`
        *,
        mvp:mvp_id (
          id,
          title,
          status
        ),
        meeting:meeting_id (
          id,
          status,
          requester_id
        )
      `)
      .eq('owner_id', userId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (mvp_id) {
      query = query.eq('mvp_id', mvp_id)
    }

    if (from_date) {
      query = query.gte('date', from_date)
    }

    if (to_date) {
      query = query.lte('date', to_date)
    }

    const { data: slots, error } = await query

    if (error) throw error

    res.status(200).json({
      success: true,
      data: slots,
      count: slots.length
    })

  } catch (error) {
    console.error('Error al obtener mis slots:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudieron obtener tus slots',
      details: error.message
    })
  }
}

/**
 * DELETE /api/availability/:slotId
 * Delete an availability slot
 */
export async function deleteAvailabilitySlot(req, res) {
  try {
    const userId = req.user.id
    const { slotId } = req.params

    // Check if slot exists and belongs to user
    const { data: slot, error: fetchError } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', slotId)
      .single()

    if (fetchError || !slot) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Slot no encontrado'
      })
    }

    if (slot.owner_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permiso para eliminar este slot'
      })
    }

    if (slot.is_booked) {
      return res.status(400).json({
        error: 'Operación inválida',
        message: 'No puedes eliminar un slot que ya está reservado'
      })
    }

    // Delete the slot
    const { error: deleteError } = await supabase
      .from('availability_slots')
      .delete()
      .eq('id', slotId)

    if (deleteError) throw deleteError

    res.status(200).json({
      success: true,
      message: 'Slot eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error al eliminar slot:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo eliminar el slot',
      details: error.message
    })
  }
}

/**
 * POST /api/availability/:slotId/book
 * Book an availability slot (create meeting)
 */
export async function bookAvailabilitySlot(req, res) {
  try {
    const userId = req.user.id
    const { slotId } = req.params
    const { notes, meeting_type = 'video_call' } = req.body

    // Get the slot
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select(`
        *,
        mvp:mvp_id (
          id,
          title,
          owner_id
        )
      `)
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Slot no encontrado'
      })
    }

    // Validate slot is available
    if (slot.is_booked) {
      return res.status(400).json({
        error: 'Slot no disponible',
        message: 'Este slot ya está reservado'
      })
    }

    // Can't book your own slot
    if (slot.owner_id === userId) {
      return res.status(400).json({
        error: 'Operación inválida',
        message: 'No puedes reservar tu propia disponibilidad'
      })
    }

    // Create meeting
    const scheduledAt = new Date(`${slot.date}T${slot.start_time}`)
    const endTime = new Date(`${slot.date}T${slot.end_time}`)
    const durationMinutes = Math.round((endTime - scheduledAt) / (1000 * 60))

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        mvp_id: slot.mvp_id,
        requester_id: userId,
        owner_id: slot.owner_id,
        status: 'pending',
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: durationMinutes,
        meeting_type,
        timezone: slot.timezone,
        requester_notes: notes,
        availability_slot_id: slotId
      })
      .select()
      .single()

    if (meetingError) throw meetingError

    // Update slot to mark as booked
    const { error: updateError } = await supabase
      .from('availability_slots')
      .update({
        is_booked: true,
        booked_by: userId,
        meeting_id: meeting.id
      })
      .eq('id', slotId)

    if (updateError) throw updateError

    // TODO: Send notification to MVP owner

    res.status(201).json({
      success: true,
      data: meeting,
      message: 'Reunión solicitada exitosamente. El emprendedor debe confirmarla.'
    })

  } catch (error) {
    console.error('Error al reservar slot:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo reservar el slot',
      details: error.message
    })
  }
}

/**
 * POST /api/availability/bulk
 * Create multiple slots at once (useful for weekly schedules)
 */
export async function createBulkAvailability(req, res) {
  try {
    const userId = req.user.id
    const { mvp_id, dates, time_slots, timezone = 'UTC', notes } = req.body || {}

    // Validate input
    if (!mvp_id || !dates || !time_slots || !Array.isArray(dates) || !Array.isArray(time_slots)) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'Se requiere mvp_id, array de dates y array de time_slots'
      })
    }

    // Verify MVP ownership
    const { data: mvp, error: mvpError } = await supabase
      .from('mvps')
      .select('id, owner_id')
      .eq('id', mvp_id)
      .single()

    if (mvpError || !mvp || mvp.owner_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permiso para gestionar este MVP'
      })
    }

    // Generate all combinations of dates and time slots
    const slotsToInsert = []
    for (const date of dates) {
      for (const timeSlot of time_slots) {
        slotsToInsert.push({
          mvp_id,
          owner_id: userId,
          date,
          start_time: timeSlot.start_time,
          end_time: timeSlot.end_time,
          timezone,
          notes
        })
      }
    }

    // Insert all slots
    const { data: createdSlots, error: insertError } = await supabase
      .from('availability_slots')
      .upsert(slotsToInsert, {
        onConflict: 'mvp_id,date,start_time',
        ignoreDuplicates: true
      })
      .select()

    if (insertError) throw insertError

    res.status(201).json({
      success: true,
      data: createdSlots,
      message: `${createdSlots.length} slots creados exitosamente`,
      total_combinations: dates.length * time_slots.length
    })

  } catch (error) {
    console.error('Error al crear disponibilidad bulk:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo crear la disponibilidad',
      details: error.message
    })
  }
}
