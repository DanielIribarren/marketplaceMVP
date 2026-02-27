const DEFAULT_TIMEZONE = 'UTC'
const DEFAULT_BUSINESS_DAYS = 7
const DEFAULT_TIME_SLOTS = [
  { start_time: '10:00', end_time: '11:00' },
  { start_time: '15:00', end_time: '16:00' },
]

function toISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Crea slots de disponibilidad por defecto para un MVP.
 * Se usa para garantizar que siempre exista al menos una agenda inicial.
 */
export async function ensureDefaultAvailabilityForMvp({
  supabase,
  mvpId,
  ownerId,
  timezone = DEFAULT_TIMEZONE
}) {
  if (!supabase || !mvpId || !ownerId) {
    throw new Error('Parámetros inválidos para generar disponibilidad por defecto')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const slotsToInsert = []
  const cursor = new Date(today)
  let businessDaysCreated = 0

  while (businessDaysCreated < DEFAULT_BUSINESS_DAYS) {
    const dayOfWeek = cursor.getDay()
    const isBusinessDay = dayOfWeek >= 1 && dayOfWeek <= 5

    if (isBusinessDay) {
      const date = toISODate(cursor)
      for (const slot of DEFAULT_TIME_SLOTS) {
        slotsToInsert.push({
          mvp_id: mvpId,
          owner_id: ownerId,
          date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          timezone,
          notes: 'Generado automáticamente por el sistema'
        })
      }
      businessDaysCreated += 1
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  const { data, error } = await supabase
    .from('availability_slots')
    .upsert(slotsToInsert, {
      onConflict: 'mvp_id,date,start_time',
      ignoreDuplicates: true
    })
    .select()

  if (error) throw error
  return data || []
}
