'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

function semana(ref: Date): Date[] {
  const d = new Date(ref); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0)
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate()+i); return x })
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

const STATUS: Record<string,{label:string;dot:string;bg:string;text:string}> = {
  pending:                      {label:'Pendiente',         dot:'bg-amber-400',  bg:'bg-amber-50 border-amber-200',   text:'text-amber-800'},
  confirmed:                    {label:'Confirmada',        dot:'bg-blue-400',   bg:'bg-blue-50 border-blue-200',     text:'text-blue-800'},
  completed:                    {label:'Completada',        dot:'bg-green-400',  bg:'bg-green-50 border-green-200',   text:'text-green-800'},
  cancelled:                    {label:'Cancelada',         dot:'bg-gray-300',   bg:'bg-gray-50 border-gray-200',     text:'text-gray-500'},
  rejected:                     {label:'Rechazada',         dot:'bg-red-400',    bg:'bg-red-50 border-red-200',       text:'text-red-800'},
  counterproposal_entrepreneur: {label:'Contrapropuesta',  dot:'bg-purple-400', bg:'bg-purple-50 border-purple-200', text:'text-purple-800'},
  counterproposal_investor:     {label:'Contrapropuesta',  dot:'bg-purple-400', bg:'bg-purple-50 border-purple-200', text:'text-purple-800'},
}

function esmiturno(m: Meeting, uid: string) {
  if (m.status === 'pending')                      return m.owner_id === uid
  if (m.status === 'counterproposal_entrepreneur') return m.requester_id === uid  // le toca al inversor
  if (m.status === 'counterproposal_investor')     return m.owner_id === uid      // le toca al emprendedor
  return false
}

function rolLabel(m: Meeting, uid: string): { texto: string; Icono: React.ElementType } {
  return m.mvp?.owner_id === uid
    ? { texto: 'Emprendedor', Icono: Building2 }
    : { texto: 'Inversor',    Icono: TrendingUp }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CalendarClient({ userId }: { userId: string }) {
  const [cursor,      setCursor]   = useState(new Date())
  const [meetings,    setMeetings] = useState<Meeting[]>([])
  const [loading,     setLoading]  = useState(true)
  const [selMeeting,  setSel]      = useState<Meeting | null>(null)
  const [openDialog,  setOpen]     = useState(false)
  const [actLoading,  setActLoad]  = useState(false)
  const [actMsg,      setActMsg]   = useState<{ok:boolean;txt:string}|null>(null)

  const hoy   = useMemo(() => { const h = new Date(); h.setHours(0,0,0,0); return h }, [])
  const dias  = useMemo(() => semana(cursor), [cursor])
  const inicio = dias[0], fin = dias[6]
  const inicioKey = inicio.toISOString().split('T')[0]
  const finKey    = fin.toISOString().split('T')[0]

  const recargar = useCallback(async () => {
    setLoading(true)
    const from = new Date(inicioKey); from.setDate(from.getDate()-45)
    const to   = new Date(finKey);    to.setDate(to.getDate()+45)
    const r = await getMyMeetings({ from_date: from.toISOString(), to_date: to.toISOString() })
    if (r.success) setMeetings(r.data)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicioKey, finKey])

  useEffect(() => { recargar() }, [recargar])

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

  const headerMes = `${MESES[inicio.getMonth()]}${
    inicio.getMonth()!==fin.getMonth() ? ' – '+MESES[fin.getMonth()] : ''
  } ${fin.getFullYear()}`

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario de reuniones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona tus reuniones como emprendedor o inversor</p>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
      </div>

      {/* ── Navegación semana ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Controles */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCursor(d => { const n=new Date(d); n.setDate(n.getDate()-7); return n })}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-xs px-3" onClick={() => setCursor(new Date())}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCursor(d => { const n=new Date(d); n.setDate(n.getDate()+7); return n })}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-sm font-semibold text-gray-700">{headerMes}</span>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Pendiente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Confirmada</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block"/>Contrapropuesta</span>
          </div>
        </div>

        {/* Rejilla de días */}
        <div className="grid grid-cols-7 divide-x border-b">
          {dias.map((dia, i) => {
            const esHoy = mismodia(dia, hoy)
            return (
              <div key={i} className="text-center py-2 bg-gray-50">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{DIAS[i]}</p>
                <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mt-0.5 ${esHoy ? 'bg-primary text-white' : 'text-gray-700'}`}>
                  {dia.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-7 divide-x min-h-[200px]">
          {dias.map((dia, i) => {
            const key = `${dia.getFullYear()}-${String(dia.getMonth()+1).padStart(2,'0')}-${String(dia.getDate()).padStart(2,'0')}`
            const reuniones = porDia.get(key) || []
            const esPasado  = dia < hoy && !mismodia(dia,hoy)

            return (
              <div key={`c${i}`} className={`p-1 space-y-1 ${esPasado ? 'bg-gray-50/60' : ''}`}>
                {reuniones.map(m => {
                  const cfg  = STATUS[m.status] || STATUS.pending
                  const rol  = rolLabel(m, userId)
                  const Icono = rol.Icono
                  const accion = esmiturno(m, userId)
                  const offerSummary = formatOfferSummary(m)

                  return (
                    <button key={m.id} onClick={() => abrirDetalle(m)}
                      className={`w-full text-left rounded-lg border px-2 py-1.5 transition-all hover:shadow-md ${cfg.bg} ${accion ? 'ring-2 ring-amber-300' : ''}`}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}/>
                        <span className={`text-[10px] font-bold truncate ${cfg.text}`}>
                          {m.scheduled_at ? fmtHora(m.scheduled_at) : '--:--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icono className="w-3 h-3 text-gray-400 shrink-0"/>
                        <p className="text-[10px] text-gray-600 font-semibold truncate leading-tight">
                          {rol.texto}
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate leading-tight">
                        {m.mvp?.title || 'Reunión'}
                      </p>
                      {offerSummary && (
                        <p className="text-[9px] text-gray-500 truncate leading-tight">
                          {m.offer_type === 'economic' ? 'Oferta:' : 'Aporte:'} {offerSummary}
                        </p>
                      )}
                      {accion && (
                        <p className="text-[9px] text-amber-600 font-bold mt-0.5">⚡ Tu turno</p>
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
      <div className="flex gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-gray-400"/> Emprendedor = eres el creador del MVP</span>
        <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-gray-400"/> Inversor = estás evaluando el MVP</span>
      </div>

      {/* ── Sin reuniones ── */}
      {!loading && meetings.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CalendarDays className="w-14 h-14 mx-auto mb-3 text-gray-200"/>
          <p className="font-medium text-gray-500">No tienes reuniones registradas</p>
          <p className="text-sm mt-1">Las reuniones se agendan desde la vista de detalle de un MVP en el marketplace.</p>
        </div>
      )}

      {/* ── Panel: reuniones que necesitan tu atención ── */}
      {pendientesAccion.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500"/>
            <h2 className="text-lg font-semibold text-gray-900">
              Requieren tu atención ({pendientesAccion.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {pendientesAccion.map(m => {
              const rol   = rolLabel(m, userId)
              const Icono = rol.Icono
              const cfg   = STATUS[m.status] || STATUS.pending
              const otro  = m.requester_id === userId ? m.owner : m.requester
              const esCont = m.status.startsWith('counterproposal')
              const offerSummary = formatOfferSummary(m)

              return (
                <div key={m.id} className="bg-white border-2 border-amber-200 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Icono className="w-3 h-3"/> {rol.texto}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm mt-1 truncate">{m.mvp?.title || 'MVP'}</p>
                      {m.scheduled_at && (
                        <p className="text-xs text-gray-500 capitalize">{fmtFechaLarga(m.scheduled_at)} · {fmtHora(m.scheduled_at)}</p>
                      )}
                      {otro && (
                        <p className="text-xs text-gray-400">Con: {otro.display_name || otro.email || 'Participante'}</p>
                      )}
                      {offerSummary && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          <span className="font-semibold text-gray-600">
                            {m.offer_type === 'economic' ? 'Oferta inicial: ' : 'Aporte inicial: '}
                          </span>
                          {offerSummary}
                        </p>
                      )}
                    </div>
                  </div>

                  {esCont && m.counterproposal_notes && (
                    <p className="text-xs bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-purple-700">
                      💬 &quot;{m.counterproposal_notes}&quot;
                    </p>
                  )}

                  {/* Acciones rápidas */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Emprendedor ve solicitud pendiente o contrapropuesta del inversor */}
                    {m.owner_id === userId && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          disabled={actLoading}
                          onClick={() => accion(() => confirmMeeting(m.id))}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1"/> Aceptar
                        </Button>
                        <Button size="sm" variant="outline"
                          className="border-purple-300 text-purple-700 flex-1"
                          onClick={() => abrirDetalle(m)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1"/> Contraproponer
                        </Button>
                        <Button size="sm" variant="outline"
                          className="border-red-300 text-red-700 flex-1"
                          disabled={actLoading}
                          onClick={() => accion(() => rejectMeeting(m.id))}>
                          <XCircle className="w-3.5 h-3.5 mr-1"/> Rechazar
                        </Button>
                      </>
                    )}
                    {/* Inversor ve contrapropuesta del emprendedor */}
                    {m.requester_id === userId && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          disabled={actLoading}
                          onClick={() => accion(() => confirmMeeting(m.id))}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1"/> Aceptar nueva fecha
                        </Button>
                        <Button size="sm" variant="outline"
                          className="border-purple-300 text-purple-700 flex-1"
                          onClick={() => abrirDetalle(m)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1"/> Otra fecha
                        </Button>
                        <Button size="sm" variant="outline"
                          className="border-red-300 text-red-700 flex-1"
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

  const cfg     = STATUS[m.status] || STATUS.pending
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
          <span className="flex items-center gap-1 text-xs text-gray-500">
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
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {actMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0"/> : <XCircle className="w-4 h-4 shrink-0"/>}
          {actMsg.txt}
        </div>
      )}

      {/* ── Vista: DETALLE ── */}
      {vista === 'detalle' && (
        <div className="space-y-4 mt-1">
          {m.scheduled_at && (
            <Row icon={<Clock className="w-4 h-4 text-gray-400"/>}>
              <p className="text-sm font-semibold text-gray-900 capitalize">{fmtFechaLarga(m.scheduled_at)}</p>
              <p className="text-xs text-gray-500">{fmtHora(m.scheduled_at)} · {m.duration_minutes} min · {m.timezone || 'UTC'}</p>
            </Row>
          )}
          {otro && (
            <Row icon={<User className="w-4 h-4 text-gray-400"/>}>
              <p className="text-sm font-semibold">{otro.display_name || otro.email}</p>
              {otro.email && <p className="text-xs text-gray-500">{otro.email}</p>}
            </Row>
          )}
          {m.meeting_url && m.status === 'confirmed' && (
            <Row icon={<Video className="w-4 h-4 text-gray-400"/>}>
              <a href={m.meeting_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1">
                Unirse a la reunión <ExternalLink className="w-3 h-3"/>
              </a>
            </Row>
          )}
          {offerSummary && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Oferta inicial</p>
              <p className="text-sm text-blue-900">
                {offerSummary}
              </p>
            </div>
          )}

          {/* Bloque contrapropuesta */}
          {esCont && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm">
              <p className="font-semibold text-purple-800 mb-1">📩 Contrapropuesta recibida</p>
              {m.scheduled_at && <p className="text-purple-700 capitalize">{fmtFechaLarga(m.scheduled_at)} · {fmtHora(m.scheduled_at)}</p>}
              {m.counterproposal_notes && <p className="text-purple-600 mt-1 text-xs italic">&quot;{m.counterproposal_notes}&quot;</p>}
            </div>
          )}

          {/* Notas */}
          {(m.notes || m.requester_notes) && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Mensaje del inversor</p>
              <p className="text-sm text-gray-700">{m.requester_notes || m.notes}</p>
            </div>
          )}
          {m.owner_notes && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Nota del emprendedor</p>
              <p className="text-sm text-gray-700">{m.owner_notes}</p>
            </div>
          )}
          {m.status === 'rejected' && m.rejection_reason && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-red-400 uppercase mb-1">Motivo del rechazo</p>
              <p className="text-sm text-gray-700">{m.rejection_reason}</p>
            </div>
          )}

          {/* ── Acciones según quien eres y en qué estado está ── */}
          {activo && miTurno && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">¿Qué deseas hacer?</p>

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
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={actLoading}
                      onClick={() => onConfirm({ meeting_url: meetUrl||undefined, owner_notes: ownerNotes||undefined })}>
                      {actLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                      Aceptar reunión
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      disabled={actLoading} onClick={() => setVista('contraproponer')}>
                      <RefreshCw className="w-4 h-4 mr-2"/> Proponer otra fecha
                    </Button>
                    <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
                      disabled={actLoading} onClick={() => setVista('rechazar')}>
                      <XCircle className="w-4 h-4 mr-2"/> Rechazar
                    </Button>
                  </div>
                </>
              )}

              {/* Inversor: contrapropuesta del emprendedor → acepta, otra fecha, o rechaza */}
              {isReq && m.status === 'counterproposal_entrepreneur' && (
                <div className="space-y-2">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={actLoading}
                    onClick={() => onConfirm()}>
                    {actLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                    Aceptar la nueva fecha
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      disabled={actLoading} onClick={() => setVista('contraproponer')}>
                      <RefreshCw className="w-4 h-4 mr-2"/> Otra fecha
                    </Button>
                    <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
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
              <Button variant="ghost" size="sm" className="text-gray-400 w-full hover:text-red-500"
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
            <Label htmlFor="motivo">Motivo del rechazo <span className="text-gray-400">(opcional)</span></Label>
            <textarea id="motivo" rows={4}
              className="w-full mt-1 rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Explica brevemente por qué rechazas esta reunión..."
              value={motivo} onChange={e => setMotivo(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={actLoading}
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
          <p className="text-sm text-gray-600">
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
              <Label htmlFor="cp-msg">Mensaje <span className="text-gray-400">(opcional)</span></Label>
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
            <Label htmlFor="cancel-r">Motivo de cancelación <span className="text-gray-400">(opcional)</span></Label>
            <textarea id="cancel-r" rows={3}
              className="w-full mt-1 rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="¿Por qué deseas cancelar esta solicitud?"
              value={cancelReason} onChange={e => setCR(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-gray-300 text-gray-700" disabled={actLoading}
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
