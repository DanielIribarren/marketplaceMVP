'use client'

import { useState, useEffect } from 'react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAvailabilityByMVP, bookAvailabilitySlot } from '@/app/actions/availability.actions'
import { Calendar, Clock, Video, Phone, MapPin, AlertCircle, Check } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface MeetingSchedulerProps {
  mvpId: string
  mvpTitle: string
  ownerName?: string
}

interface AvailabilitySlot {
  id: string
  date: string
  start_time: string
  end_time: string
  timezone: string
  is_booked: boolean
}

type MeetingType = 'video_call' | 'phone_call' | 'in_person'

interface MeetingTypeOption {
  value: MeetingType
  label: string
  icon: React.ElementType
}

const MEETING_TYPES: MeetingTypeOption[] = [
  { value: 'video_call', label: 'Videollamada', icon: Video },
  { value: 'phone_call', label: 'Llamada telefónica', icon: Phone },
  { value: 'in_person', label: 'Presencial', icon: MapPin },
]

export function MeetingScheduler({ mvpId, mvpTitle, ownerName }: MeetingSchedulerProps) {
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [meetingType, setMeetingType] = useState<MeetingType>('video_call')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    const loadAvailability = async () => {
      setLoading(true)
      const today = format(new Date(), 'yyyy-MM-dd')
      
      const result = await getAvailabilityByMVP(mvpId, {
        fromDate: today,
        availableOnly: true
      })

      if (result.success) {
        setAvailableSlots(result.data || [])
      }
      setLoading(false)
    }

    loadAvailability()
  }, [mvpId]) // ✅ Fixed: Added mvpId to dependency array

  const loadAvailability = async () => {
    setLoading(true)
    const today = format(new Date(), 'yyyy-MM-dd')
    
    const result = await getAvailabilityByMVP(mvpId, {
      fromDate: today,
      availableOnly: true
    })

    if (result.success) {
      setAvailableSlots(result.data || [])
    }
    setLoading(false)
  }

  const handleBookSlot = async () => {
    if (!selectedSlot) return

    setBooking(true)
    setMessage(null)

    const result = await bookAvailabilitySlot(selectedSlot.id, notes, meetingType)

    if (result.success) {
      setMessage({
        type: 'success',
        text: '¡Reunión solicitada con éxito! El emprendedor recibirá una notificación y deberá confirmarla.'
      })
      setSelectedSlot(null)
      setNotes('')
      loadAvailability() // Refresh to remove booked slot
    } else {
      setMessage({
        type: 'error',
        text: result.message || 'No se pudo agendar la reunión'
      })
    }

    setBooking(false)
  }

  // Group slots by date
  const slotsByDate = availableSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = []
    acc[slot.date].push(slot)
    return acc
  }, {} as Record<string, AvailabilitySlot[]>)

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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Cargando disponibilidad...</p>
        </CardContent>
      </Card>
    )
  }

  if (availableSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agendar Reunión</CardTitle>
          <CardDescription>
            Agenda una reunión con {ownerName || 'el emprendedor'} para conocer más sobre {mvpTitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              No hay disponibilidad configurada en este momento
            </p>
            <p className="text-sm text-muted-foreground">
              El emprendedor aún no ha configurado sus horarios disponibles
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Agendar Reunión</CardTitle>
          <CardDescription>
            Selecciona un horario disponible para reunirte con {ownerName || 'el emprendedor'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Available Slots */}
          <div className="space-y-4">
            <Label>Horarios Disponibles</Label>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {Object.entries(slotsByDate)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, slots]) => (
                  <div key={date} className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      {format(parseLocalDate(date), 'EEEE, d MMMM yyyy', { locale: es })}
                    </h4>
                    <div className="grid gap-2">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?.id === slot.id
                        
                        return (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {slot.timezone}
                                </Badge>
                              </div>
                              {isSelected && (
                                <Check className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Meeting Type */}
          {selectedSlot && (
            <>
              <div className="space-y-2">
                <Label>Tipo de Reunión</Label>
                <Select value={meetingType} onValueChange={(value) => setMeetingType(value as MeetingType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map(type => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Mensaje para el emprendedor (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Cuéntale brevemente por qué te interesa su proyecto..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Este mensaje ayudará al emprendedor a prepararse mejor para la reunión
                </p>
              </div>

              {/* Selected Slot Summary */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-semibold mb-2">Resumen de tu reunión</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(parseLocalDate(selectedSlot.date), 'EEEE, d MMMM yyyy', { locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {selectedSlot.timezone}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {React.createElement(
                      MEETING_TYPES.find(t => t.value === meetingType)?.icon || Video,
                      { className: 'h-4 w-4 text-muted-foreground' }
                    )}
                    <span>
                      {MEETING_TYPES.find(t => t.value === meetingType)?.label}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

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
              onClick={handleBookSlot}
              disabled={!selectedSlot || booking}
              className="flex-1"
            >
              {booking ? 'Agendando...' : 'Solicitar Reunión'}
            </Button>
            {selectedSlot && (
              <Button
                variant="outline"
                onClick={() => setSelectedSlot(null)}
                disabled={booking}
              >
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}