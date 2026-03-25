"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Heart, CheckCircle2, XCircle, CalendarClock, CircleCheckBig,
  CircleX, Repeat, Ban, HandCoins, Trash2, ShieldOff,
  ChevronLeft, ChevronRight, Bell, Check, X
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { NotificationDetails } from '@/components/NotificationDetails'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 20

interface Notification {
  id: string
  type: string
  title: string
  message: string
  created_at: string
  read: boolean
  data: Record<string, unknown> | null
}

const NOTIF_EMOJI: Record<string, string> = {
  mvp_favorited: '❤️',
  mvp_approved: '✅',
  mvp_rejected: '❌',
  meeting_requested: '📅',
  meeting_confirmed: '✅',
  meeting_rejected: '❌',
  meeting_counterproposal: '🔄',
  meeting_cancelled: '🚫',
  offer_pending_review: '🤝',
  mvp_deleted: '🗑️',
  account_banned: '🛡️',
}

function NotifIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4'
  switch (type) {
    case 'mvp_favorited': return <Heart className={`${cls} text-red-500`} />
    case 'mvp_approved': return <CheckCircle2 className={`${cls} text-green-500`} />
    case 'mvp_rejected': return <XCircle className={`${cls} text-red-500`} />
    case 'meeting_requested': return <CalendarClock className={`${cls} text-orange-500`} />
    case 'meeting_confirmed': return <CircleCheckBig className={`${cls} text-green-500`} />
    case 'meeting_rejected': return <CircleX className={`${cls} text-red-500`} />
    case 'meeting_counterproposal': return <Repeat className={`${cls} text-orange-500`} />
    case 'meeting_cancelled': return <Ban className={`${cls} text-gray-500`} />
    case 'offer_pending_review': return <HandCoins className={`${cls} text-yellow-600`} />
    case 'mvp_deleted': return <Trash2 className={`${cls} text-red-500`} />
    case 'account_banned': return <ShieldOff className={`${cls} text-gray-500`} />
    default: return <Bell className={`${cls} text-muted-foreground`} />
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

interface NotificationCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExternalRead: (id: string) => void
  onExternalReadAll: () => void
}

export function NotificationCenter({
  open,
  onOpenChange,
  onExternalRead,
  onExternalReadAll,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Notification | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
      const offset = (p - 1) * PAGE_SIZE
      const res = await fetch(
        `${base}/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' }
      )
      const json = await res.json()
      if (json.success) {
        setNotifications(json.data)
        setTotal(json.total ?? json.data.length)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchPage(page)
  }, [open, page, fetchPage])

  const markRead = async (notif: Notification) => {
    if (notif.read) return
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
    await fetch(`${base}/api/notifications/${notif.id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
    onExternalRead(notif.id)
  }

  const markAllRead = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
    await fetch(`${base}/api/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    onExternalReadAll()
  }

  const openDetail = async (notif: Notification) => {
    await markRead(notif)
    setSelected(notif)
    setDetailOpen(true)
  }

  const hasUnread = notifications.some(n => !n.read)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Centro de notificaciones</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold">Notificaciones</h2>
              {total > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  {total === 1 ? '1 notificación' : `${total} notificaciones`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasUnread && (
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2" onClick={markAllRead}>
                  Marcar todas como leídas
                </Button>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Pagination bar */}
          {total > 0 && (
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/60 bg-muted/30 shrink-0">
              <p className="text-xs text-muted-foreground">
                {loading ? 'Cargando...' : `${rangeStart}–${rangeEnd} de ${total}`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-muted-foreground px-1">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                Cargando notificaciones...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Bell className="h-10 w-10 opacity-30" />
                <p className="text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`group flex items-start gap-3 px-5 py-3.5 border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer ${
                    !notif.read ? 'bg-primary/[0.03]' : ''
                  }`}
                  onClick={() => openDetail(notif)}
                >
                  {/* Unread indicator */}
                  <div className="mt-1 w-2 shrink-0">
                    {!notif.read && (
                      <span className="block h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 border border-border/60 shadow-sm">
                    <NotifIcon type={notif.type} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notif.read ? 'font-semibold' : 'font-medium'}`}>
                      {notif.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()}
                      {NOTIF_EMOJI[notif.type] && (
                        <span className="ml-1">{NOTIF_EMOJI[notif.type]}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">{formatDate(notif.created_at)}</p>
                  </div>

                  {/* Mark read button */}
                  {!notif.read && (
                    <button
                      type="button"
                      title="Marcar como leída"
                      onClick={(e) => { e.stopPropagation(); markRead(notif) }}
                      className="mt-1 shrink-0 opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-md">
            <DialogTitle className="sr-only">Detalle de notificación</DialogTitle>
            <NotificationDetails notification={selected} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
