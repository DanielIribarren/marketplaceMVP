'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock, Video,
  User, ExternalLink, Loader2, CheckCircle2, XCircle,
  RefreshCw, AlertCircle, Building2, TrendingUp,
} from 'lucide-react'
import {
  getMyMeetings,
  confirmMeeting,
  rejectMeeting,
  counterproposeMeeting,
  cancelMeeting,
} from '@/app/actions/meetings'
import type { Meeting } from '@/app/actions/meetings'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type VistaCalendario = '1w' | '2w' | '3w' | '4w'

const VISTAS: Record<VistaCalendario, { label: string; weeks: number }> = {
  '1w': { label: '1 semana', weeks: 1 },
  '2w': { label: '2 semanas', weeks: 2 },
  '3w': { label: '3 semanas', weeks: 3 },
  '4w': { label: 'Mensual', weeks: 4 },
}

function inicioSemana(ref: Date): Date {
  const d = new Date(ref)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function rangoDias(ref: Date, weeks: number): Date[] {
  const start = inicioSemana(ref)
  const totalDias = weeks * 7
  return Array.from({ length: totalDias }, (_, i) => {
    const x = new Date(start)
    x.setDate(start.getDate() + i)
    return x
  })
}

function mismodia(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',hour12:false})
}

function fmtFechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
}

function parseMaybeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatCurrencyUSD(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function formatOfferSummary(meeting: Meeting): string | null {
  if (meeting.offer_type === 'economic') {
    const amount = parseMaybeNumber(meeting.offer_amount)
    const equityPercent = parseMaybeNumber(meeting.offer_equity_percent)

    if (amount !== null && equityPercent !== null) {
      return `${formatCurrencyUSD(amount)} por ${equityPercent}% del MVP`
    }
    return null
  }

  if (meeting.offer_type === 'non_economic' && meeting.offer_note) {
    return meeting.offer_note
  }

  return null
}

const STATUS: Record<string,{label:string;dot:string;bg:string;text:string;glow?:boolean}> = {
  pending:                      {label:'Pendiente',         dot:'bg-orange-400',     bg:'bg-orange-100 border-orange-300',      text:'text-orange-800'},
  pending_not_my_turn:          {label:'Pendiente',         dot:'bg-orange-700',     bg:'bg-orange-100 border-orange-300',     text:'text-orange-900', glow:true},
  confirmed:                    {label:'Confirmada',        dot:'bg-green-700',      bg:'bg-green-100 border-green-300',       text:'text-green-900'},
  completed:                    {label:'✓ Completada',      dot:'bg-gray-600',       bg:'bg-gray-100 border-gray-300',         text:'text-gray-700'},
  cancelled:                    {label:'Cancelada',         dot:'bg-gray-400',       bg:'bg-gray-100 border-gray-300',          text:'text-gray-700'},
  rejected:                     {label:'Rechazada',         dot:'bg-red-700',        bg:'bg-red-100 border-red-400',           text:'text-red-900'},
  counterproposal_my_turn:      {label:'Contrapropuesta',   dot:'bg-yellow-500',     bg:'bg-yellow-100 border-yellow-400',      text:'text-yellow-900', glow:true},
  counterproposal_not_my_turn:  {label:'Contrapropuesta',   dot:'bg-yellow-600',     bg:'bg-yellow-100 border-yellow-400',     text:'text-yellow-900'},
  counterproposal_entrepreneur: {label:'Contrapropuesta',   dot:'bg-yellow-500',     bg:'bg-yellow-100 border-yellow-400',      text:'text-yellow-900'},
  counterproposal_investor:     {label:'Contrapropuesta',   dot:'bg-yellow-500',     bg:'bg-yellow-100 border-yellow-400',      text:'text-yellow-900'},
}

function esmiturno(m: Meeting, uid: string) {
  if (m.status === 'pending')                      return m.owner_id === uid
  if (m.status === 'counterproposal_entrepreneur') return m.requester_id === uid  // le toca al inversor
  if (m.status === 'counterproposal_investor')     return m.owner_id === uid      // le toca al emprendedor
  return false
}

function getVisualStatus(m: Meeting, uid: string): string {
  // Si la reunión ya pasó y estaba confirmada, marcarla como completada
  if (m.scheduled_at) {
    const meetingDateTime = new Date(m.scheduled_at).getTime()
    const nowTime = Date.now()
    if (meetingDateTime < nowTime && m.status === 'confirmed') {
      return 'completed'
    }
  }

  // Si es pendiente, determinar si es mi turno o no
  if (m.status === 'pending') {
    return esmiturno(m, uid) ? 'pending' : 'pending_not_my_turn'
  }

  // Si es contrapropuesta, determinar si es mi turno o no
  if (m.status === 'counterproposal_entrepreneur' || m.status === 'counterproposal_investor') {
    return esmiturno(m, uid) ? 'counterproposal_my_turn' : 'counterproposal_not_my_turn'
  }

  // Para el resto, usar el status tal cual
  return m.status
}

function getGlowStyles(visualStatus: string, miTurno: boolean): string {
  if (!miTurno) return ''

  if (visualStatus === 'pending_not_my_turn') {
    return 'ring-1 ring-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]'
  }
  if (visualStatus === 'counterproposal_my_turn') {
    return 'ring-1 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]'
  }
  return 'ring-1 ring-orange-400'
}

function rolLabel(m: Meeting, uid: string): { texto: string; Icono: React.ElementType } {
  return m.mvp?.owner_id === uid
    ? { texto: 'Emprendedor', Icono: Building2 }
    : { texto: 'Inversor',    Icono: TrendingUp }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CalendarClient({ userId }: { userId: string }) {
  const [cursor,      setCursor]   = useState(new Date())
  const [vista,       setVista]    = useState<VistaCalendario>('1w')
  const [meetings,    setMeetings] = useState<Meeting[]>([])
  const [loading,     setLoading]  = useState(true)
  const [selMeeting,  setSel]      = useState<Meeting | null>(null)
  const [openDialog,  setOpen]     = useState(false)
  const [actLoading,  setActLoad]  = useState(false)
  const [actMsg,      setActMsg]   = useState<{ok:boolean;txt:string}|null>(null)

  const hoy   = useMemo(() => { const h = new Date(); h.setHours(0,0,0,0); return h }, [])
  const semanasVisibles = VISTAS[vista].weeks
  const dias  = useMemo(() => rangoDias(cursor, semanasVisibles), [cursor, semanasVisibles])
  const inicio = dias[0], fin = dias[dias.length - 1]
  const inicioKey = inicio.toISOString().split('T')[0]
  const finKey    = fin.toISOString().split('T')[0]

  const recargar = useCallback(async () => {
    setLoading(true)
    const from = new Date(inicioKey); from.setDate(from.getDate()-45)
    const to   = new Date(finKey);    to.setDate(to.getDate()+45)
    const r = await getMyMeetings({ from_date: from.toISOString(), to_date: to.toISOString() })
    if (r.success) setMeetings(r.data)
    setLoading(false)
  }, [inicioKey, finKey])

  useEffect(() => {
    const timer = setTimeout(() => { void recargar() }, 0)
    return () => clearTimeout(timer)
  }, [recargar])

  // Agrupar reuniones por día
  const porDia = useMemo(() => {
    const map = new Map<string, Meeting[]>()
    for (const m of meetings) {
      if (!m.scheduled_at) continue
      const key = m.scheduled_at.split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return map
  }, [meetings])

  // Reuniones que requieren acción del usuario
  const pendientesAccion = useMemo(
    () => meetings.filter(m => esmiturno(m, userId)),
    [meetings, userId]
  )

  function abrirDetalle(m: Meeting) {
    setSel(m); setActMsg(null); setOpen(true)
  }

  async function accion(
    fn: () => Promise<{success:boolean;message?:string}>,
    cerrar = true
  ) {
    setActLoad(true)
    const r = await fn()
    setActMsg({ ok: r.success, txt: r.message || (r.success ? 'Listo' : 'Ocurrió un error') })
    if (r.success) { await recargar(); if (cerrar) setOpen(false) }
    setActLoad(false)
  }

  const headerMes = `${inicio.getDate()} ${MESES[inicio.getMonth()]}${
    inicio.getFullYear() !== fin.getFullYear() ? ` ${inicio.getFullYear()}` : ''
  } – ${fin.getDate()} ${MESES[fin.getMonth()]} ${fin.getFullYear()}`

  return (
    <div className="min-h-screen bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario de reuniones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus reuniones como emprendedor o inversor</p>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-ink-300" />}
      </div>

      {/* ── Navegación y filtros de rango ── */}
      <div className="bg-background rounded-2xl border shadow-sm overflow-hidden">
        {/* Controles */}
        <div className="flex flex-col gap-3 px-5 py-3 border-b bg-gray-50">
          <div className="flex flex-wrap items-center gap-2">
            {(Object.entries(VISTAS) as [VistaCalendario, { label: string; weeks: number }][]).map(([key, opt]) => (
              <Button
                key={key}
                variant={vista === key ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => setVista(key)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCursor(d => { const n=new Date(d); n.setDate(n.getDate()-(semanasVisibles*7)); return n })}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-xs px-3" onClick={() => setCursor(new Date())}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCursor(d => { const n=new Date(d); n.setDate(n.getDate()+(semanasVisibles*7)); return n })}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-sm font-semibold text-foreground">{headerMes}</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/>Pendiente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"/>Contrapropuesta</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-700 inline-block"/>Confirmada</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-700 inline-block"/>Rechazada</span>
          </div>
        </div>
        </div>

        {/* Cabecera de días de semana */}
        <div className="grid grid-cols-7 divide-x border-b">
          {DIAS.map((dia, i) => {
            return (
              <div key={i} className="text-center py-2 bg-gray-50">
                <p className="text-[10px] font-semibold text-ink-300 uppercase tracking-wide">{dia}</p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-7 auto-rows-[150px] min-h-[220px]">
          {dias.map((dia, i) => {
            const key = `${dia.getFullYear()}-${String(dia.getMonth()+1).padStart(2,'0')}-${String(dia.getDate()).padStart(2,'0')}`
            const reuniones = porDia.get(key) || []
            const esPasado  = dia < hoy && !mismodia(dia,hoy)
            const esHoy = mismodia(dia, hoy)
            const esInicioSemana = i % 7 === 0

            return (
              <div
                key={`c${i}`}
                className={`p-1.5 space-y-1 border-r border-b overflow-y-auto ${esPasado ? 'bg-gray-50' : ''} ${esInicioSemana ? 'border-l' : ''}`}
              >
                <div className="mb-1">
                  <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${esHoy ? 'bg-primary text-white' : 'text-foreground'}`}>
                    {dia.getDate()}
                  </div>
                </div>
                {reuniones.map(m => {
                  const visualStatus = getVisualStatus(m, userId)
                  const cfg  = STATUS[visualStatus] || STATUS.pending
                  const rol  = rolLabel(m, userId)
                  const Icono = rol.Icono
                  const accion = esmiturno(m, userId)
                  const offerSummary = formatOfferSummary(m)

                  return (
                    <button key={m.id} onClick={() => abrirDetalle(m)}
                      className={`w-full text-left rounded-lg border px-2 py-1.5 transition-all hover:shadow-md ${cfg.bg} ${cfg.glow && accion ? getGlowStyles(visualStatus, accion) : accion ? 'ring-2 ring-orange-300' : ''}`}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}/>
                        <span className={`text-[10px] font-bold truncate ${cfg.text}`}>
                          {m.scheduled_at ? fmtHora(m.scheduled_at) : '--:--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icono className="w-3 h-3 text-ink-300 shrink-0"/>
                        <p className="text-[10px] text-muted-foreground font-semibold truncate leading-tight">
                          {rol.texto}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight">
                        {m.mvp?.title || 'Reunión'}
                      </p>
                      {offerSummary && (
                        <p className="text-[9px] text-muted-foreground truncate leading-tight">
                          {m.offer_type === 'economic' ? 'Oferta:' : 'Aporte:'} {offerSummary}
                        </p>
                      )}
                      {accion && (
                        <p className="text-[9px] text-brand-700 font-bold mt-0.5">⚡ Tu turno</p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Leyenda de roles ── */}
      <div className="flex gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-ink-300"/> Emprendedor = eres el creador del MVP</span>
        <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-ink-300"/> Inversor = estás evaluando el MVP</span>
      </div>

      {/* ── Sin reuniones ── */}
      {!loading && meetings.length === 0 && (
        <div className="text-center py-16 text-ink-300">
          <CalendarDays className="w-14 h-14 mx-auto mb-3 text-brand-100"/>
          <p className="font-medium text-muted-foreground">No tienes reuniones registradas</p>
          <p className="text-sm mt-1">Las reuniones se agendan desde la vista de detalle de un MVP en el marketplace.</p>
        </div>
      )}

      {/* ── Panel: reuniones que necesitan tu atención ── */}
      {pendientesAccion.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-brand-600"/>
            <h2 className="text-lg font-semibold text-foreground">
              Requieren tu atención ({pendientesAccion.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {pendientesAccion.map(m => {
              const visualStatus = getVisualStatus(m, userId)
              const rol   = rolLabel(m, userId)
              const Icono = rol.Icono
              const cfg   = STATUS[visualStatus] || STATUS.pending
              const otro  = m.requester_id === userId ? m.owner : m.requester
              const esCont = m.status.startsWith('counterproposal')
              const offerSummary = formatOfferSummary(m)
              const miTurno = esmiturno(m, userId)

              return (
                <div key={m.id} className={`bg-background border rounded-2xl p-5 flex flex-col gap-3 transition-all ${cfg.glow && miTurno ? getGlowStyles(visualStatus, miTurno).replace('ring-2', 'border-2') : 'border-brand-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Icono className="w-3 h-3"/> {rol.texto}
                        </span>
                      </div>
                      <p className="font-bold text-foreground text-sm mt-1 truncate">{m.mvp?.title || 'MVP'}</p>
                      {m.scheduled_at && (
                        <p className="text-xs text-muted-foreground capitalize">{fmtFechaLarga(m.scheduled_at)} · {fmtHora(m.scheduled_at)}</p>
                      )}
                      {otro && (
                        <p className="text-xs text-ink-300">Con: {otro.display_name || otro.email || 'Participante'}</p>
                      )}
                      {offerSummary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          <span className="font-semibold text-muted-foreground">
                            {m.offer_type === 'economic' ? 'Oferta inicial: ' : 'Aporte inicial: '}
                          </span>
                          {offerSummary}
                        </p>
                      )}
                    </div>
                  </div>

                  {esCont && m.counterproposal_notes && (
                    <p className="text-xs bg-ink-50 border border-ink-100 rounded-lg px-3 py-2 text-ink-500">
                      💬 &quot;{m.counterproposal_notes}&quot;
                    </p>
                  )}

                  {/* Acciones rápidas */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Emprendedor ve solicitud pendiente o contrapropuesta del inversor */}
                    {m.owner_id === userId && (
                      <>
                        <Button size="sm" className="bg-green-100 border border-green-600 text-green-800 hover:bg-green-600 hover:border-green-700 hover:text-white transition-colors flex-1"
                          disabled={actLoading}
                          onClick={() => accion(() => confirmMeeting(m.id))}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1"/> Aceptar
                        </Button>
                        <Button size="sm" className="bg-white border border-gray-300 text-gray-700 hover:bg-primary hover:border-primary hover:text-white transition-colors flex-1"
                          onClick={() => abrirDetalle(m)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1"/> Contraproponer
                        </Button>
                        <Button size="sm" className="bg-red-100 border border-red-600 text-red-800 hover:bg-red-600 hover:border-red-700 hover:text-white transition-colors flex-1"
                          disabled={actLoading}
                          onClick={() => accion(() => rejectMeeting(m.id))}>
                          <XCircle className="w-3.5 h-3.5 mr-1"/> Rechazar
                        </Button>
                      </>
                    )}
                    {/* Inversor ve contrapropuesta del emprendedor */}
                    {m.requester_id === userId && (
                      <>
                        <Button size="sm" className="bg-green-100 border border-green-600 text-green-800 hover:bg-green-600 hover:border-green-700 hover:text-white transition-colors flex-1"
                          disabled={actLoading}
                          onClick={() => accion(() => confirmMeeting(m.id))}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1"/> Aceptar nueva fecha
                        </Button>
                        <Button size="sm" className="bg-white border border-gray-300 text-gray-700 hover:bg-primary hover:border-primary hover:text-white transition-colors flex-1"
                          onClick={() => abrirDetalle(m)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1"/> Otra fecha
                        </Button>
                        <Button size="sm" className="bg-red-100 border border-red-600 text-red-800 hover:bg-red-600 hover:border-red-700 hover:text-white transition-colors flex-1"
                          disabled={actLoading}
                          onClick={() => accion(() => rejectMeeting(m.id))}>
                          <XCircle className="w-3.5 h-3.5 mr-1"/> Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modal detalle ── */}
      <Dialog open={openDialog} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          {selMeeting && (
            <DetalleReunion
              meeting={selMeeting}
              userId={userId}
              actLoading={actLoading}
              actMsg={actMsg}
              onConfirm={(opts) => accion(() => confirmMeeting(selMeeting.id, opts))}
              onReject={(r)    => accion(() => rejectMeeting(selMeeting.id, r))}
              onCounter={(p)   => accion(() => counterproposeMeeting(selMeeting.id, p))}
              onCancel={(r)    => accion(() => cancelMeeting(selMeeting.id, r))}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}

// ─── Detalle + Acciones en el modal ──────────────────────────────────────────

type Vista = 'detalle' | 'rechazar' | 'contraproponer' | 'cancelar'

function DetalleReunion({
  meeting: m, userId, actLoading, actMsg,
  onConfirm, onReject, onCounter, onCancel,
}: {
  meeting: Meeting; userId: string
  actLoading: boolean
  actMsg: { ok: boolean; txt: string } | null
  onConfirm: (opts?: { meeting_url?: string; owner_notes?: string }) => void
  onReject:  (reason?: string) => void
  onCounter: (p: { proposed_date:string; proposed_start_time:string; proposed_end_time:string; notes?:string }) => void
  onCancel:  (reason?: string) => void
}) {
  const [vista, setVista]       = useState<Vista>('detalle')
  const [motivo, setMotivo]     = useState('')
  const [cancelReason, setCR]   = useState('')
  const [meetUrl, setMeetUrl]   = useState('')
  const [ownerNotes, setONotes] = useState('')
  const [cp, setCp] = useState({
    proposed_date:       m.scheduled_at ? m.scheduled_at.split('T')[0] : '',
    proposed_start_time: '09:00',
    proposed_end_time:   '10:00',
    notes: '',
  })

  const visualStatus = getVisualStatus(m, userId)
  const cfg     = STATUS[visualStatus] || STATUS.pending
  const isOwner = m.owner_id === userId
  const isReq   = m.requester_id === userId
  const miTurno = esmiturno(m, userId)
  const rol     = rolLabel(m, userId)
  const Icono   = rol.Icono
  const otro    = isReq ? m.owner : m.requester
  const activo  = ['pending','confirmed','counterproposal_entrepreneur','counterproposal_investor'].includes(m.status)
  const esCont  = m.status.startsWith('counterproposal')
  const offerSummary = formatOfferSummary(m)

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icono className="w-3.5 h-3.5"/> {rol.texto}
          </span>
        </div>
        <DialogTitle>{m.mvp?.title || 'Reunión'}</DialogTitle>
        <DialogDescription>
          {otro ? `Con: ${otro.display_name || otro.email || 'Participante'}` : ''}
        </DialogDescription>
      </DialogHeader>

      {/* Mensaje de resultado */}
      {actMsg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
          actMsg.ok
            ? 'bg-brand-50 border-brand-200 text-brand-800'
            : 'bg-destructive/10 border-destructive/40 text-destructive'
        }`}>
          {actMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0"/> : <XCircle className="w-4 h-4 shrink-0"/>}
          {actMsg.txt}
        </div>
      )}

      {/* ── Vista: DETALLE ── */}
      {vista === 'detalle' && (
        <div className="space-y-4 mt-1">
          {m.scheduled_at && (
            <Row icon={<Clock className="w-4 h-4 text-ink-300"/>}>
              <p className="text-sm font-semibold text-foreground capitalize">{fmtFechaLarga(m.scheduled_at)}</p>
              <p className="text-xs text-muted-foreground">{fmtHora(m.scheduled_at)} · {m.duration_minutes} min · {m.timezone || 'UTC'}</p>
            </Row>
          )}
          {otro && (
            <Row icon={<User className="w-4 h-4 text-ink-300"/>}>
              <p className="text-sm font-semibold">{otro.display_name || otro.email}</p>
              {otro.email && <p className="text-xs text-muted-foreground">{otro.email}</p>}
            </Row>
          )}
          {m.meeting_url && m.status === 'confirmed' && (
            <Row icon={<Video className="w-4 h-4 text-ink-300"/>}>
              <a href={m.meeting_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1">
                Unirse a la reunión <ExternalLink className="w-3 h-3"/>
              </a>
            </Row>
          )}
          {offerSummary && (
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl">
              <p className="text-xs font-semibold text-brand-700 uppercase mb-1">Oferta inicial</p>
              <p className="text-sm text-brand-900">
                {offerSummary}
              </p>
            </div>
          )}

          {/* Bloque contrapropuesta */}
          {esCont && (
            <div className="p-3 bg-ink-50 border border-ink-100 rounded-xl text-sm">
              <p className="font-semibold text-ink-900 mb-1">📩 Contrapropuesta recibida</p>
              {m.scheduled_at && <p className="text-ink-500 capitalize">{fmtFechaLarga(m.scheduled_at)} · {fmtHora(m.scheduled_at)}</p>}
              {m.counterproposal_notes && <p className="text-ink-500 mt-1 text-xs italic">&quot;{m.counterproposal_notes}&quot;</p>}
            </div>
          )}

          {/* Notas */}
          {(m.notes || m.requester_notes) && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-ink-300 uppercase mb-1">Mensaje del inversor</p>
              <p className="text-sm text-foreground">{m.requester_notes || m.notes}</p>
            </div>
          )}
          {m.owner_notes && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-ink-300 uppercase mb-1">Nota del emprendedor</p>
              <p className="text-sm text-foreground">{m.owner_notes}</p>
            </div>
          )}
          {m.status === 'rejected' && m.rejection_reason && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-destructive/80 uppercase mb-1">Motivo del rechazo</p>
              <p className="text-sm text-foreground">{m.rejection_reason}</p>
            </div>
          )}

          {/* ── Acciones según quien eres y en qué estado está ── */}
          {activo && miTurno && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">¿Qué deseas hacer?</p>

              {/* Emprendedor: pendiente o contrapropuesta del inversor → puede aceptar, rechazar, contraproponer */}
              {isOwner && (m.status === 'pending' || m.status === 'counterproposal_investor') && (
                <>
                  <div className="space-y-2">
                    <Input
                      placeholder="Link de videollamada (opcional: Zoom, Meet...)"
                      value={meetUrl}
                      onChange={e => setMeetUrl(e.target.value)}
                    />
                    <Input
                      placeholder="Nota para el inversor (opcional)"
                      value={ownerNotes}
                      onChange={e => setONotes(e.target.value)}
                    />
                    <Button className="w-full bg-green-100 border border-green-600 text-green-800 hover:bg-green-600 hover:border-green-700 hover:text-white transition-colors" disabled={actLoading}
                      onClick={() => onConfirm({ meeting_url: meetUrl||undefined, owner_notes: ownerNotes||undefined })}>
                      {actLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                      Aceptar reunión
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="bg-white border border-gray-300 text-gray-700 hover:bg-primary hover:border-primary hover:text-white transition-colors"
                      disabled={actLoading} onClick={() => setVista('contraproponer')}>
                      <RefreshCw className="w-4 h-4 mr-2"/> Proponer otra fecha
                    </Button>
                    <Button variant="outline" className="bg-red-100 border border-red-600 text-red-800 hover:bg-red-600 hover:border-red-700 hover:text-white transition-colors"
                      disabled={actLoading} onClick={() => setVista('rechazar')}>
                      <XCircle className="w-4 h-4 mr-2"/> Rechazar
                    </Button>
                  </div>
                </>
              )}

              {/* Inversor: contrapropuesta del emprendedor → acepta, otra fecha, o rechaza */}
              {isReq && m.status === 'counterproposal_entrepreneur' && (
                <div className="space-y-2">
                  <Button className="w-full bg-green-100 border border-green-600 text-green-800 hover:bg-green-600 hover:border-green-700 hover:text-white transition-colors" disabled={actLoading}
                    onClick={() => onConfirm()}>
                    {actLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                    Aceptar la nueva fecha
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="bg-white border border-gray-300 text-gray-700 hover:bg-primary hover:border-primary hover:text-white transition-colors"
                      disabled={actLoading} onClick={() => setVista('contraproponer')}>
                      <RefreshCw className="w-4 h-4 mr-2"/> Otra fecha
                    </Button>
                    <Button variant="outline" className="bg-red-100 border border-red-600 text-red-800 hover:bg-red-600 hover:border-red-700 hover:text-white transition-colors"
                      disabled={actLoading} onClick={() => setVista('rechazar')}>
                      <XCircle className="w-4 h-4 mr-2"/> Rechazar definitivamente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inversor puede cancelar lo suyo (cuando no es su turno de acción) */}
          {isReq && activo && !miTurno && (
            <div className="border-t pt-3">
              <Button size="sm" className="bg-red-100 border border-red-600 text-red-800 hover:bg-red-600 hover:border-red-700 hover:text-white transition-colors w-full"
                disabled={actLoading} onClick={() => setVista('cancelar')}>
                Cancelar mi solicitud de reunión
              </Button>
            </div>
          )}

          {/* Link al MVP */}
          {m.mvp?.id && (
            <div className="border-t pt-3">
              <a href={`/mvps/${m.mvp.id}`}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver MVP: {m.mvp.title} <ExternalLink className="w-3 h-3"/>
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Vista: RECHAZAR ── */}
      {vista === 'rechazar' && (
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="motivo">Motivo del rechazo <span className="text-ink-300">(opcional)</span></Label>
            <textarea id="motivo" rows={4}
              className="w-full mt-1 rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Explica brevemente por qué rechazas esta reunión..."
              value={motivo} onChange={e => setMotivo(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-white" disabled={actLoading}
              onClick={() => onReject(motivo||undefined)}>
              {actLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <XCircle className="w-4 h-4 mr-1"/>}
              Confirmar rechazo
            </Button>
            <Button variant="outline" onClick={() => setVista('detalle')} disabled={actLoading}>Volver</Button>
          </div>
        </div>
      )}

      {/* ── Vista: CONTRAPROPONER ── */}
      {vista === 'contraproponer' && (
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Propón una nueva fecha y hora. La otra parte podrá aceptarla, rechazarla o volver a contraproponer.
          </p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cp-fecha">Nueva fecha</Label>
              <Input id="cp-fecha" type="date" className="mt-1"
                min={new Date().toISOString().split('T')[0]}
                value={cp.proposed_date}
                onChange={e => setCp(c => ({...c, proposed_date: e.target.value}))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cp-inicio">Hora de inicio</Label>
                <Input id="cp-inicio" type="time" className="mt-1"
                  value={cp.proposed_start_time}
                  onChange={e => setCp(c => ({...c, proposed_start_time: e.target.value}))}
                />
              </div>
              <div>
                <Label htmlFor="cp-fin">Hora de fin</Label>
                <Input id="cp-fin" type="time" className="mt-1"
                  value={cp.proposed_end_time}
                  onChange={e => setCp(c => ({...c, proposed_end_time: e.target.value}))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cp-msg">Mensaje <span className="text-ink-300">(opcional)</span></Label>
              <textarea id="cp-msg" rows={3}
                className="w-full mt-1 rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Explica el motivo del cambio de fecha..."
                value={cp.notes||''} onChange={e => setCp(c => ({...c, notes: e.target.value}))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={actLoading || !cp.proposed_date}
              onClick={() => onCounter(cp)}>
              {actLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <RefreshCw className="w-4 h-4 mr-1"/>}
              Enviar contrapropuesta
            </Button>
            <Button variant="outline" onClick={() => setVista('detalle')} disabled={actLoading}>Volver</Button>
          </div>
        </div>
      )}

      {/* ── Vista: CANCELAR ── */}
      {vista === 'cancelar' && (
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="cancel-r">Motivo de cancelación <span className="text-ink-300">(opcional)</span></Label>
            <textarea id="cancel-r" rows={3}
              className="w-full mt-1 rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="¿Por qué deseas cancelar esta solicitud?"
              value={cancelReason} onChange={e => setCR(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-border text-foreground" disabled={actLoading}
              onClick={() => onCancel(cancelReason||undefined)}>
              {actLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : null}
              Confirmar cancelación
            </Button>
            <Button variant="outline" onClick={() => setVista('detalle')} disabled={actLoading}>Volver</Button>
          </div>
        </div>
      )}
    </>
  )
}

// Pequeño helper de layout
function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>{children}</div>
    </div>
  )
}
