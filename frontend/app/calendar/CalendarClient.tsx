'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Video,
  User,
  ExternalLink,
  Loader2,
  Filter,
} from 'lucide-react'
import { getMyMeetings, type Meeting } from '@/app/actions/meetings'

interface CalendarClientProps {
  userId: string
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmada', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  completed: { label: 'Completada', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  cancelled: { label: 'Cancelada', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
  rejected: { label: 'Rechazada', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
}

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'completed', label: 'Completadas' },
]

function getWeekDays(referenceDate: Date): Date[] {
  const day = referenceDate.getDay()
  const diff = referenceDate.getDate() - day
  const sunday = new Date(referenceDate)
  sunday.setDate(diff)
  sunday.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatFullDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const DAY_NAMES_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function CalendarClient({ userId }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]

  const fetchMeetings = useCallback(async () => {
    setIsLoading(true)
    const fromDate = new Date(weekStart)
    fromDate.setDate(fromDate.getDate() - 7)
    const toDate = new Date(weekEnd)
    toDate.setDate(toDate.getDate() + 7)

    const result = await getMyMeetings({
      status: statusFilter === 'all' ? undefined : statusFilter,
      from_date: fromDate.toISOString(),
      to_date: toDate.toISOString(),
    })

    if (result.success) {
      setMeetings(result.data)
    }
    setIsLoading(false)
  }, [weekStart, weekEnd, statusFilter])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, Meeting[]>()
    for (const meeting of meetings) {
      if (!meeting.scheduled_at) continue
      const key = new Date(meeting.scheduled_at).toISOString().split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(meeting)
    }
    // Sort meetings within each day by time
    for (const [, dayMeetings] of map) {
      dayMeetings.sort((a, b) => {
        if (!a.scheduled_at || !b.scheduled_at) return 0
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      })
    }
    return map
  }, [meetings])

  function navigateWeek(direction: number) {
    setCurrentDate(prev => {
      const next = new Date(prev)
      next.setDate(next.getDate() + direction * 7)
      return next
    })
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function openMeetingDetail(meeting: Meeting) {
    setSelectedMeeting(meeting)
    setDialogOpen(true)
  }

  function getOtherParticipant(meeting: Meeting) {
    if (meeting.requester_id === userId) {
      return meeting.owner
    }
    return meeting.requester
  }

  function getUserRole(meeting: Meeting): string {
    return meeting.requester_id === userId ? 'Solicitante' : 'Organizador'
  }

  const headerMonth = `${MONTH_NAMES[weekStart.getMonth()]}${weekStart.getMonth() !== weekEnd.getMonth() ? ' - ' + MONTH_NAMES[weekEnd.getMonth()] : ''} ${weekEnd.getFullYear()}`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
            <p className="text-sm text-gray-500">Tus reuniones agendadas</p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-1 bg-white border rounded-lg p-1">
            {FILTER_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === option.value
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Week navigation */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <h2 className="text-lg font-semibold text-gray-900">{headerMonth}</h2>

          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 divide-x">
          {/* Day headers */}
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today)
            return (
              <div key={i} className="text-center py-3 border-b bg-gray-50/50">
                <p className="text-xs font-medium text-gray-500 uppercase">{DAY_NAMES_SHORT[i]}</p>
                <div className={`inline-flex items-center justify-center w-8 h-8 mt-1 rounded-full text-sm font-semibold ${
                  isToday ? 'bg-primary text-white' : 'text-gray-900'
                }`}>
                  {day.getDate()}
                </div>
              </div>
            )
          })}

          {/* Day cells */}
          {weekDays.map((day, i) => {
            const dateKey = formatDateKey(day)
            const dayMeetings = meetingsByDate.get(dateKey) || []
            const isToday = isSameDay(day, today)
            const isPast = day < today && !isToday

            return (
              <div
                key={`cell-${i}`}
                className={`min-h-[160px] p-1.5 ${
                  isToday ? 'bg-blue-50/30' : isPast ? 'bg-gray-50/50' : ''
                }`}
              >
                {dayMeetings.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-gray-300">—</span>
                  </div>
                )}

                <div className="space-y-1">
                  {dayMeetings.map(meeting => {
                    const config = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.pending
                    return (
                      <button
                        key={meeting.id}
                        onClick={() => openMeetingDetail(meeting)}
                        className={`w-full text-left px-2 py-1.5 rounded-md border text-xs transition-all hover:shadow-sm cursor-pointer ${config.bg}`}
                      >
                        <p className={`font-medium truncate ${config.color}`}>
                          {meeting.scheduled_at ? formatTime(meeting.scheduled_at) : '--:--'}
                        </p>
                        <p className="text-gray-700 truncate font-medium">
                          {meeting.mvp?.title || 'Reunión'}
                        </p>
                        <p className="text-gray-500 truncate">
                          {getOtherParticipant(meeting)?.display_name || 'Participante'}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && meetings.length === 0 && (
        <div className="text-center py-12">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tienes reuniones {statusFilter !== 'all' ? STATUS_CONFIG[statusFilter]?.label.toLowerCase() + 's' : ''} esta semana</p>
          <p className="text-gray-400 text-sm mt-1">Las reuniones se crean desde la vista de un MVP</p>
        </div>
      )}

      {/* Meeting detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedMeeting && (
            <MeetingDetailContent
              meeting={selectedMeeting}
              userId={userId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MeetingDetailContent({ meeting, userId }: { meeting: Meeting; userId: string }) {
  const config = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.pending
  const otherParticipant = meeting.requester_id === userId ? meeting.owner : meeting.requester
  const userRole = meeting.requester_id === userId ? 'Solicitante' : 'Organizador'

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <DialogTitle className="text-lg">
              {meeting.mvp?.title || 'Reunión'}
            </DialogTitle>
            <Badge variant="outline" className={`mt-2 ${config.color} ${config.bg}`}>
              {config.label}
            </Badge>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 mt-2">
        {/* Date & time */}
        {meeting.scheduled_at && (
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 capitalize">
                {formatFullDate(meeting.scheduled_at)}
              </p>
              <p className="text-sm text-gray-500">
                {formatTime(meeting.scheduled_at)} · {meeting.duration_minutes} min
              </p>
            </div>
          </div>
        )}

        {/* Other participant */}
        <div className="flex items-start gap-3">
          <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {otherParticipant?.display_name || otherParticipant?.email || 'Participante'}
            </p>
            <p className="text-xs text-gray-500">Tu rol: {userRole}</p>
          </div>
        </div>

        {/* Meeting URL */}
        {meeting.meeting_url && meeting.status === 'confirmed' && (
          <div className="flex items-start gap-3">
            <Video className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <a
              href={meeting.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Unirse a la reunión
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Notes */}
        {(meeting.requester_notes || meeting.owner_notes || meeting.notes) && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notas</p>
            <p className="text-sm text-gray-700">
              {meeting.requester_notes || meeting.owner_notes || meeting.notes}
            </p>
          </div>
        )}

        {/* Rejection reason */}
        {meeting.status === 'rejected' && meeting.rejection_reason && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-red-500 uppercase mb-1">Motivo del rechazo</p>
            <p className="text-sm text-gray-700">{meeting.rejection_reason}</p>
          </div>
        )}

        {/* MVP link */}
        {meeting.mvp?.slug && (
          <div className="border-t pt-3">
            <a
              href={`/marketplace/${meeting.mvp.slug}`}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Ver MVP: {meeting.mvp.title}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </>
  )
}
