'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { createBulkAvailability, getMyAvailability, deleteAvailabilitySlot } from '@/app/actions/availability.actions'
import { Clock, Trash2, Calendar as CalendarIcon, Check, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AvailabilityCalendarProps {
  mvpId: string
  timezone?: string
  onHasAvailabilityChange?: (hasAvailability: boolean) => void
}

interface TimeSlot {
  start_time: string
  end_time: string
}

interface ExistingSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  timezone: string
  is_booked: boolean
  mvp?: {
    id: string
    title: string
    status: string
  }
  meeting?: {
    id: string
    status: string
    requester_id: string
  }
}

// Common time slots for selection
const COMMON_TIME_SLOTS: TimeSlot[] = [
  { start_time: '09:00', end_time: '10:00' },
  { start_time: '10:00', end_time: '11:00' },
  { start_time: '11:00', end_time: '12:00' },
  { start_time: '12:00', end_time: '13:00' },
  { start_time: '13:00', end_time: '14:00' },
  { start_time: '14:00', end_time: '15:00' },
  { start_time: '15:00', end_time: '16:00' },
  { start_time: '16:00', end_time: '17:00' },
  { start_time: '17:00', end_time: '18:00' },
]

const TIMEZONES = [
  { value: 'America/Caracas', label: 'Caracas (VET)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (CST)' },
  { value: 'America/Bogota', label: 'Bogotá (COT)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'UTC', label: 'UTC' },
]

export function AvailabilityCalendar({ mvpId, timezone: initialTimezone = 'America/Caracas', onHasAvailabilityChange }: AvailabilityCalendarProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([])
  const [timezone, setTimezone] = useState(initialTimezone)
  const [existingSlots, setExistingSlots] = useState<ExistingSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const updateExistingSlots = (slots: ExistingSlot[]) => {
    setExistingSlots(slots)
    onHasAvailabilityChange?.(slots.length > 0)
  }

  // Load existing availability
  useEffect(() => {
    const loadExistingAvailability = async () => {
      setLoading(true)
      const result = await getMyAvailability({ mvpId })
      if (result.success) {
        updateExistingSlots(result.data || [])
      }
      setLoading(false)
    }

    loadExistingAvailability()
  }, [mvpId]) // ✅ Fixed: Added mvpId to dependency array

  const loadExistingAvailability = async () => {
    setLoading(true)
    const result = await getMyAvailability({ mvpId })
    if (result.success) {
      updateExistingSlots(result.data || [])
    }
    setLoading(false)
  }

  const handleDateSelect = (dates: Date | Date[] | undefined) => {
    if (dates) {
      // Handle both single date and array of dates
      const datesArray = Array.isArray(dates) ? dates : [dates]
      setSelectedDates(datesArray)
    }
  }

  const toggleTimeSlot = (slotKey: string) => {
    setSelectedTimeSlots(prev => 
      prev.includes(slotKey)
        ? prev.filter(s => s !== slotKey)
        : [...prev, slotKey]
    )
  }

  const handleSaveAvailability = async () => {
    if (selectedDates.length === 0) {
      setMessage({ type: 'error', text: 'Selecciona al menos una fecha' })
      return
    }

    if (selectedTimeSlots.length === 0) {
      setMessage({ type: 'error', text: 'Selecciona al menos un horario' })
      return
    }

    setSaving(true)
    setMessage(null)

    // Convert dates to ISO format
    const dates = selectedDates.map(date => format(date, 'yyyy-MM-dd'))
    
    // Convert selected time slots
    const timeSlots = selectedTimeSlots.map(key => {
      const slot = COMMON_TIME_SLOTS.find((_, i) => `slot-${i}` === key)
      return slot!
    })

    const result = await createBulkAvailability(mvpId, dates, timeSlots, timezone)

    if (result.success) {
      setMessage({ 
        type: 'success', 
        text: `✓ ${result.data?.length || 0} espacios de disponibilidad creados` 
      })
      setSelectedDates([])
      setSelectedTimeSlots([])
      loadExistingAvailability()
    } else {
      setMessage({ 
        type: 'error', 
        text: result.message || 'Error al guardar disponibilidad' 
      })
    }

    setSaving(false)
  }

  const handleDeleteSlot = async (slotId: string) => {
    const result = await deleteAvailabilitySlot(slotId)
    if (result.success) {
      setMessage({ type: 'success', text: 'Espacio eliminado' })
      loadExistingAvailability()
    } else {
      setMessage({ type: 'error', text: result.message || 'Error al eliminar' })
    }
  }

  // Group existing slots by date
  const slotsByDate = existingSlots.reduce((acc, slot) => {
    const date = slot.date
    if (!acc[date]) acc[date] = []
    acc[date].push(slot)
    return acc
  }, {} as Record<string, ExistingSlot[]>)

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Configurar Disponibilidad
          </CardTitle>
          <CardDescription>
            Selecciona las fechas y horarios en los que estás disponible para reuniones con inversionistas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timezone Selection */}
          <div className="space-y-2">
            <Label>Zona Horaria</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="space-y-2">
              <Label>Selecciona Fechas</Label>
              <div className="border rounded-lg p-4">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date()}
                  className="rounded-md"
                />
              </div>
              {selectedDates.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedDates.length} fecha{selectedDates.length !== 1 ? 's' : ''} seleccionada{selectedDates.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Time Slots */}
            <div className="space-y-2">
              <Label>Selecciona Horarios</Label>
              <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                  {COMMON_TIME_SLOTS.map((slot, index) => {
                    const slotKey = `slot-${index}`
                    const isSelected = selectedTimeSlots.includes(slotKey)
                    
                    return (
                      <div
                        key={slotKey}
                        className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => toggleTimeSlot(slotKey)}
                      >
                        <Checkbox
                          id={slotKey}
                          checked={isSelected}
                          onCheckedChange={() => toggleTimeSlot(slotKey)}
                        />
                        <label 
                          htmlFor={slotKey} 
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </span>
                        </label>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              {selectedTimeSlots.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedTimeSlots.length} horario{selectedTimeSlots.length !== 1 ? 's' : ''} seleccionado{selectedTimeSlots.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <Check className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSaveAvailability}
              disabled={saving || selectedDates.length === 0 || selectedTimeSlots.length === 0}
              className="flex-1"
            >
              {saving ? 'Guardando...' : 'Guardar Disponibilidad'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDates([])
                setSelectedTimeSlots([])
              }}
              disabled={saving}
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Availability */}
      {Object.keys(slotsByDate).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tu Disponibilidad Actual</CardTitle>
            <CardDescription>
              Espacios de tiempo que has configurado para reuniones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(slotsByDate)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, slots]) => (
                  <div key={date} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">
                      {format(parseLocalDate(date), 'EEEE, d MMMM yyyy', { locale: es })}
                    </h4>
                    <div className="grid gap-2">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                            {slot.is_booked && (
                              <Badge variant="secondary">Reservado</Badge>
                            )}
                          </div>
                          {!slot.is_booked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSlot(slot.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
