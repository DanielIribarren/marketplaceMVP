'use client'

import { useState, useEffect, useCallback } from 'react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { bookAvailabilitySlot } from '@/app/actions/availability.actions'
import { createClient } from '@/lib/supabase/client'
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
type OfferType = 'economic' | 'non_economic'

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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

export function MeetingScheduler({ mvpId, mvpTitle, ownerName }: MeetingSchedulerProps) {
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [meetingType, setMeetingType] = useState<MeetingType>('video_call')
  const [notes, setNotes] = useState('')
  const [offerType, setOfferType] = useState<OfferType>('economic')
  const [offerAmount, setOfferAmount] = useState('')
  const [offerEquityPercent, setOfferEquityPercent] = useState('')
  const [offerNote, setOfferNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadInfo, setLoadInfo] = useState<string | null>(null)

  const loadAvailability = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    setLoadInfo(null)

    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      if (!token) {
        setAvailableSlots([])
        setLoadError('Debes iniciar sesión para ver horarios disponibles y poder agendar.')
        setLoading(false)
        return
      }

      const today = format(new Date(), 'yyyy-MM-dd')
      const params = new URLSearchParams({ from_date: today, available_only: 'true' })

      const response = await fetch(
        `${BACKEND_URL}/api/availability/mvp/${mvpId}?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setAvailableSlots([])
        setLoadError(data.message || 'No se pudo cargar la disponibilidad de este MVP.')
        return
      }

      const slots = Array.isArray(data.data) ? data.data : []
      setAvailableSlots(slots)

      if (data.defaults_generated) {
        setLoadInfo('Se generaron horarios por defecto automáticamente para este MVP.')
      }

      if (slots.length === 0) {
        setLoadInfo((prev) =>
          prev || 'Este MVP no tiene horarios activos en este momento. Intenta nuevamente en unos minutos.'
        )
      }
    } catch {
      setAvailableSlots([])
      setLoadError('No se pudo conectar al servidor para cargar la disponibilidad.')
    } finally {
      setLoading(false)
    }
  }, [mvpId])

  useEffect(() => {
    loadAvailability()
  }, [loadAvailability])

  const handleBookSlot = async () => {
    if (!selectedSlot) return
    setBooking(true)
    setMessage(null)

    if (offerType === 'economic') {
      const amount = Number(offerAmount)
      const equityPercent = Number(offerEquityPercent.replace(',', '.'))

      if (!Number.isFinite(amount) || amount <= 0) {
        setMessage({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' })
        setBooking(false)
        return
      }

      if (!Number.isFinite(equityPercent) || equityPercent <= 0 || equityPercent > 100) {
        setMessage({ type: 'error', text: 'El porcentaje debe ser mayor a 0 y menor o igual a 100.' })
        setBooking(false)
        return
      }

      const result = await bookAvailabilitySlot(selectedSlot.id, notes, meetingType, {
        offer_type: 'economic',
        offer_amount: amount,
        offer_equity_percent: equityPercent
      })

      if (result.success) {
        setMessage({
          type: 'success',
          text: '¡Reunión solicitada con éxito! El emprendedor verá tu oferta inicial y podrá confirmar la reunión.'
        })
        setSelectedSlot(null)
        setNotes('')
        setOfferAmount('')
        setOfferEquityPercent('')
        setOfferNote('')
        loadAvailability()
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'No se pudo agendar la reunión'
        })
      }
      setBooking(false)
      return
    }

    const trimmedOfferNote = offerNote.trim()
    if (trimmedOfferNote.length < 20) {
      setMessage({
        type: 'error',
        text: 'Describe tu aporte no económico con al menos 20 caracteres.'
      })
      setBooking(false)
      return
    }

    const result = await bookAvailabilitySlot(selectedSlot.id, notes, meetingType, {
      offer_type: 'non_economic',
      offer_note: trimmedOfferNote
    })

    if (result.success) {
      setMessage({
        type: 'success',
        text: '¡Reunión solicitada con éxito! El emprendedor verá tu oferta inicial y podrá confirmar la reunión.'
      })
      setSelectedSlot(null)
      setNotes('')
      setOfferAmount('')
      setOfferEquityPercent('')
      setOfferNote('')
      loadAvailability()
    } else {
      setMessage({
        type: 'error',
        text: result.message || 'No se pudo agendar la reunión'
      })
    }
    setBooking(false)
  }

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

  const normalizeAmountInput = (value: string) => value.replace(/\D/g, '')

  const formatAmountWithThousands = (rawValue: string) => {
    const digits = normalizeAmountInput(rawValue)
    if (!digits) return ''
    return Number(digits).toLocaleString('es-ES')
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
          <div className="py-6 space-y-3">
            {loadError ? (
              <div className="p-4 bg-destructive/10 border border-destructive/40 rounded-lg">
                <p className="text-sm text-destructive font-medium">No se pudo mostrar la agenda</p>
                <p className="text-sm text-destructive mt-1">{loadError}</p>
              </div>
            ) : (
              <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg">
                <p className="text-sm text-brand-800 font-medium">Aún no hay horarios visibles</p>
                <p className="text-sm text-brand-700 mt-1">
                  {loadInfo || 'Este MVP no tiene disponibilidad activa para reuniones.'}
                </p>
              </div>
            )}

            <div className="flex justify-center">
              <Button variant="outline" onClick={loadAvailability} disabled={loading}>
                {loading ? 'Actualizando...' : 'Reintentar carga de horarios'}
              </Button>
            </div>

            {loadInfo && !loadError && (
              <p className="text-xs text-muted-foreground text-center">
                {loadInfo}
              </p>
            )}
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
          {loadInfo && (
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg">
              <p className="text-sm text-brand-800">{loadInfo}</p>
            </div>
          )}

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
                              {isSelected && <Check className="h-5 w-5 text-primary" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {selectedSlot && (
            <>
              <div className="space-y-2">
                <Label>Tipo de Reunión</Label>
                <Select value={meetingType} onValueChange={(value) => setMeetingType(value as MeetingType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map(type => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />{type.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Mensaje para el emprendedor (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Cuéntale brevemente por qué te interesa su proyecto..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <Label>Oferta inicial (obligatoria)</Label>
                <Select value={offerType} onValueChange={(value) => setOfferType(value as OfferType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economic">Aporte económico</SelectItem>
                    <SelectItem value="non_economic">Aporte no económico</SelectItem>
                  </SelectContent>
                </Select>

                {offerType === 'economic' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="offerAmount">Monto ofertado (USD)</Label>
                      <Input
                        id="offerAmount"
                        type="text"
                        inputMode="numeric"
                        placeholder="Ej: 20.000"
                        value={formatAmountWithThousands(offerAmount)}
                        onChange={(e) => setOfferAmount(normalizeAmountInput(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="offerEquityPercent">Porcentaje del MVP (%)</Label>
                      <Input
                        id="offerEquityPercent"
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.1"
                        placeholder="Ej: 20"
                        value={offerEquityPercent}
                        onChange={(e) => setOfferEquityPercent(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="offerNote">Describe tu aporte</Label>
                    <Textarea
                      id="offerNote"
                      placeholder="Ej: Te ayudo a conseguir clientes B2B y lidero estrategia de marketing durante 3 meses..."
                      value={offerNote}
                      onChange={(e) => setOfferNote(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo 20 caracteres para que el emprendedor entienda tu propuesta.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-semibold mb-2">Resumen de tu reunión</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(parseLocalDate(selectedSlot.date), 'EEEE, d MMMM yyyy', { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}</span>
                    <Badge variant="outline" className="text-xs">{selectedSlot.timezone}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {React.createElement(
                      MEETING_TYPES.find(t => t.value === meetingType)?.icon || Video,
                      { className: 'h-4 w-4 text-muted-foreground' }
                    )}
                    <span>{MEETING_TYPES.find(t => t.value === meetingType)?.label}</span>
                  </div>
                  <div className="border-t border-primary/20 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Oferta inicial
                    </p>
                    {offerType === 'economic' ? (
                      <p>
                        {formatAmountWithThousands(offerAmount) || '0'} USD por {offerEquityPercent || '0'}% del MVP
                      </p>
                    ) : (
                      <p>{offerNote.trim() || 'Sin detalle aún'}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {message && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success' ? 'bg-brand-50 border border-brand-200' : 'bg-destructive/10 border border-destructive/40'
            }`}>
              {message.type === 'success'
                ? <Check className="h-5 w-5 text-brand-700 mt-0.5" />
                : <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              }
              <p className={`text-sm ${message.type === 'success' ? 'text-brand-800' : 'text-destructive'}`}>
                {message.text}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleBookSlot} disabled={!selectedSlot || booking} className="flex-1">
              {booking ? 'Agendando...' : 'Solicitar Reunión con Oferta'}
            </Button>
            {selectedSlot && (
              <Button variant="outline" onClick={() => setSelectedSlot(null)} disabled={booking}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
