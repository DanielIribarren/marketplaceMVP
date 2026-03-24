"use client"

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  User,
  Calendar,
  Heart,
  CalendarClock,
  CircleCheckBig,
  CircleX,
  Repeat,
  Ban,
  Bell,
  HandCoins,
  CheckCircle2,
  XCircle,
  Rocket,
  LogOut,
  Shield,
  Settings,
  Wrench,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  Trash2,
  ShieldOff,
} from 'lucide-react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import ProfileEditor from '@/components/ProfileEditor'
import { NotificationDetails } from '@/components/NotificationDetails'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  unreadMessages?: number
  isAuthenticated?: boolean
  isAdmin?: boolean
}

interface ProfileUpdatedEvent extends CustomEvent {
  detail: { avatar_url: string | null }
}

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  data: Record<string, unknown> | null
}

const NOTIF_EMOJI: Record<string, string> = {
  mvp_favorited:            '❤️',
  mvp_approved:             '🎉',
  mvp_rejected:             '❌',
  mvp_deleted:              '🗑️',
  meeting_requested:        '📅',
  meeting_confirmed:        '✅',
  meeting_rejected:         '❌',
  meeting_counterproposal:  '🔄',
  meeting_cancelled:        '🚫',
  offer_pending_review:     '💰',
  account_banned:           '🚫',
}

function NotificationTypeIcon({ type }: { type: string }) {
  const iconClass = 'h-4 w-4'
  const themedColorClass = 'text-primary'

  switch (type) {
    case 'mvp_favorited':
      return <Heart className={`${iconClass} ${themedColorClass}`} />
    case 'mvp_approved':
      return <CheckCircle2 className={`${iconClass} text-green-600`} />
    case 'mvp_rejected':
      return <XCircle className={`${iconClass} text-red-600`} />
    case 'mvp_deleted':
      return <Trash2 className={`${iconClass} text-red-600`} />
    case 'account_banned':
      return <ShieldOff className={`${iconClass} text-gray-500`} />
    case 'meeting_requested':
      return <CalendarClock className={`${iconClass} ${themedColorClass}`} />
    case 'offer_pending_review':
      return <HandCoins className={`${iconClass} ${themedColorClass}`} />
    case 'meeting_confirmed':
      return <CircleCheckBig className={`${iconClass} ${themedColorClass}`} />
    case 'meeting_rejected':
      return <CircleX className={`${iconClass} ${themedColorClass}`} />
    case 'meeting_counterproposal':
      return <Repeat className={`${iconClass} ${themedColorClass}`} />
    case 'meeting_cancelled':
      return <Ban className={`${iconClass} ${themedColorClass}`} />
    default:
      return <Bell className={`${iconClass} ${themedColorClass}`} />
  }
}

function formatRelativeDate(dateString: string) {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diffMinutes = Math.max(1, Math.floor((now - date) / 60000))

  if (diffMinutes < 60) return `hace ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)
  return `hace ${diffDays} d`
}

export function Navbar({ unreadMessages = 0, isAuthenticated = false, isAdmin = false }: NavbarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null)
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)
  const [profileUnsavedDialog, setProfileUnsavedDialog] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [supportDialogOpen, setSupportDialogOpen] = useState(false)
  const [faqDialogOpen, setFaqDialogOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const settingsRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()

  const totalUnread = unreadNotifications > 0 ? unreadNotifications : unreadMessages

  const loadNotifications = async () => {
    try {
      const supabase = createClient()
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes?.data?.session?.access_token
      if (!token) return

      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
      const response = await fetch(`${base}/api/notifications?limit=8`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })

      if (!response.ok) return

      const data = await response.json()
      const items = (data?.data || []) as NotificationItem[]
      setNotifications(items)
      setUnreadNotifications(
        Number.isFinite(data?.unread_count)
          ? Number(data.unread_count)
          : items.filter((item) => !item.read).length
      )
    } catch {
      // ignore
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient()
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes?.data?.session?.access_token
      if (!token) return

      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
      await fetch(`${base}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch {
      // ignore
    }
  }

  const markAllNotificationsAsRead = async () => {
    try {
      const supabase = createClient()
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes?.data?.session?.access_token
      if (!token) return

      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
      const response = await fetch(`${base}/api/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) return

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          read: true
        }))
      )
      setUnreadNotifications(0)
    } catch {
      // ignore
    }
  }

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id)
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: true
              }
            : item
        )
      )
      setUnreadNotifications((prev) => Math.max(0, prev - 1))
    }

    // Abrir diálogo con los detalles de la notificación
    setSelectedNotification(notification)
    setNotificationDialogOpen(true)
    setNotificationsOpen(false)
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const navLinkClass = (href: string) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive(href)
        ? 'text-primary font-semibold'
        : 'text-muted-foreground hover:text-primary'
    }`

  useEffect(() => {
    if (!isAuthenticated) return
    let mounted = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: authData } = await supabase.auth.getUser()
        const sessionRes = await supabase.auth.getSession()
        const user = authData?.user
        const session = sessionRes?.data?.session
        if (!user) return

        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
        const res = await fetch(`${base}/api/profile`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        })
        if (!res.ok) return
        const data = await res.json()
        if (mounted) setAvatarUrl(data?.avatar_url || null)
      } catch {
        // ignore
      }
    })()

    // Cargar notificaciones en el siguiente tick para evitar renders en cascada
    setTimeout(loadNotifications, 0)

    const pollingInterval = setInterval(loadNotifications, 60_000)
    return () => {
      mounted = false
      clearInterval(pollingInterval)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!notificationsOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [notificationsOpen])

  useEffect(() => {
    if (!settingsOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [settingsOpen])

  useEffect(() => {
    const handler = (e: Event) => {
      const profileEvent = e as ProfileUpdatedEvent
      setAvatarUrl(profileEvent.detail.avatar_url)
    }
    window.addEventListener('profile:updated', handler)
    return () => window.removeEventListener('profile:updated', handler)
  }, [])

  return (
    <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/85 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-primary-foreground flex items-center justify-center shadow-sm shadow-brand-500/35">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="font-bold text-xl tracking-tight">
              MVP<span className="text-primary">Market</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {isAdmin && (
              <Link href="/admin" className={navLinkClass('/admin')}>
                Panel Administración
              </Link>
            )}
            {!isAdmin && (
              <Link href="/" className={navLinkClass('/')}>
                Inicio
              </Link>
            )}
            {!isAdmin && (
              <Link href="/how-it-works" className={navLinkClass('/how-it-works')}>
                Cómo funciona
              </Link>
            )}
            {isAuthenticated ? (
              <Link href="/marketplace" className={navLinkClass('/marketplace')}>
                Marketplace
              </Link>
            ) : (
              <Link href="/login" className={navLinkClass('/marketplace')}>
                Marketplace
              </Link>
            )}
            {isAuthenticated && (
              <>
                <Link href="/calendar" className={navLinkClass('/calendar')}>
                  Calendario y Ofertas
                </Link>
                <Link href="/my-mvps" className={navLinkClass('/my-mvps')}>
                  Tus MVPs
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/calendar" className="md:hidden">
                  <Button
                    variant={isActive('/calendar') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="hover:bg-brand-100"
                  >
                    <Calendar className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/my-mvps" className="md:hidden">
                  <Button
                    variant={isActive('/my-mvps') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="hover:bg-brand-100"
                  >
                    <Rocket className="h-5 w-5" />
                  </Button>
                </Link>
{isAdmin ? (
                  // UI para administrador
                  <>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold flex items-center gap-1.5 px-3 py-1.5">
                        <Shield className="h-4 w-4" />
                        Modo Administrador
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="bg-brand-500 hover:bg-brand-600 hover:scale-105 text-white hover:text-white gap-2 transition-transform"
                        onClick={() => setLogoutDialogOpen(true)}
                      >
                        <LogOut className="h-4 w-4" />
                        Salir
                      </Button>
                    </div>
                  </>
                ) : (
                  // UI normal para usuarios
                  <>
                    <div className="relative" ref={notificationsRef}>
                      <Button
                        variant={isActive('/messages') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="hover:bg-brand-100"
                        onClick={async () => {
                          const willOpen = !notificationsOpen
                          setNotificationsOpen(willOpen)
                          if (willOpen) {
                            await loadNotifications()
                          }
                        }}
                      >
                        <MessageSquare className="h-5 w-5" />
                        {totalUnread > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[11px]">
                            {totalUnread}
                          </Badge>
                        )}
                      </Button>

                      {notificationsOpen && (
                        <div className="absolute right-0 top-12 w-80 rounded-xl border border-border bg-background shadow-lg z-50">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                            <p className="text-sm font-semibold">Notificaciones</p>
                            {unreadNotifications > 0 && (
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline"
                                onClick={markAllNotificationsAsRead}
                              >
                                Marcar todas
                              </button>
                            )}
                          </div>

                          <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                              <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                                No tienes notificaciones por ahora.
                              </div>
                            ) : (
                              notifications.map((notification) => (
                                <button
                                  key={notification.id}
                                  type="button"
                                  className={`w-full text-left px-3 py-3 border-b border-border/70 hover:bg-muted/40 ${
                                    notification.read ? 'opacity-80' : ''
                                  }`}
                                  onClick={() => handleNotificationClick(notification)}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 min-w-0">
                                      <div className="mt-0.5 rounded-md bg-muted/60 p-1.5">
                                        <NotificationTypeIcon type={notification.type} />
                                      </div>
                                      <p className="text-sm font-medium leading-5">
                                        {notification.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()}
                                        {NOTIF_EMOJI[notification.type] && (
                                          <span className="ml-1">{NOTIF_EMOJI[notification.type]}</span>
                                        )}
                                      </p>
                                    </div>
                                    {!notification.read && (
                                      <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-9">{notification.message}</p>
                                  <p className="text-[11px] text-muted-foreground mt-1">
                                    {formatRelativeDate(notification.created_at)}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Dialog open={profileOpen} onOpenChange={(open) => {
                      if (!open && profileDirty) {
                        setProfileUnsavedDialog(true)
                      } else {
                        setProfileOpen(open)
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="p-0 hover:bg-brand-100" onClick={() => setProfileOpen(true)}>
                          {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatarUrl}
                              alt="avatar"
                              className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-200"
                            />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="p-0 gap-0 [&>button]:hidden">
                        <DialogTitle className="sr-only">Editar perfil</DialogTitle>
                        <DialogDescription className="sr-only">Actualiza tu información pública</DialogDescription>
                        {/* Header fijo */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                          <div>
                            <p className="text-base font-bold leading-tight">Editar perfil</p>
                            <p className="text-xs text-muted-foreground">Actualiza tu información pública</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (profileDirty) {
                                setProfileUnsavedDialog(true)
                              } else {
                                setProfileOpen(false)
                              }
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                        {/* Contenido scrolleable */}
                        <div className="overflow-y-auto max-h-[80vh] px-6 py-4">
                          <ProfileEditor
                            onLogout={() => setLogoutDialogOpen(true)}
                            onDirtyChange={setProfileDirty}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Tuerquita de ajustes */}
                    <div className="relative" ref={settingsRef}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={() => setSettingsOpen(prev => !prev)}
                      >
                        <Settings className="h-[18px] w-[18px]" />
                      </Button>

                      {settingsOpen && (
                        <div className="absolute right-0 top-12 w-52 rounded-xl border border-border bg-background shadow-lg z-50 py-1 overflow-hidden">
                          <button
                            type="button"
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
                            onClick={() => { setSettingsOpen(false); setProfileOpen(true) }}
                          >
                            <User className="h-4 w-4 text-muted-foreground" />
                            Perfil
                          </button>
                          <div className="my-1 border-t border-border/60" />
                          <button
                            type="button"
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
                            onClick={() => { setSettingsOpen(false); setSupportDialogOpen(true) }}
                          >
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            Soporte técnico
                          </button>
                          <button
                            type="button"
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
                            onClick={() => { setSettingsOpen(false); setFaqDialogOpen(true) }}
                          >
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            Preguntas frecuentes
                          </button>
                          <div className="my-1 border-t border-border/60" />
                          <button
                            type="button"
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left text-rose-600"
                            onClick={() => { setSettingsOpen(false); setLogoutDialogOpen(true) }}
                          >
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Dialog: Soporte técnico */}
                    <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
                      <DialogContent className="max-w-sm text-center">
                        <DialogTitle className="sr-only">Soporte técnico</DialogTitle>
                        <div className="flex flex-col items-center gap-4 py-2">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <Wrench className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold">Soporte técnico</h2>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                              Esta función está actualmente en desarrollo.<br />
                              Pronto podrás contactar a nuestro equipo directamente desde aquí.
                            </p>
                          </div>
                          <div className="w-full rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-3">
                            <p className="text-xs text-muted-foreground">🚧 En construcción — disponible próximamente</p>
                          </div>
                          <Button className="w-full" onClick={() => setSupportDialogOpen(false)}>Entendido</Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Dialog: Preguntas frecuentes */}
                    <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
                      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 [&>button]:hidden">
                        <DialogTitle className="sr-only">Preguntas frecuentes</DialogTitle>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-bold">Preguntas frecuentes</h2>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200 tracking-wide">FAQs</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFaqDialogOpen(false)}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-3">
                          {[
                            { q: '¿Cuánto tarda la revisión de un MVP?', a: 'El equipo revisa cada publicación en menos de 24 horas hábiles. Recibirás un email con el resultado y, si hay correcciones, tendrás instrucciones claras para ajustar tu listing.' },
                            { q: '¿Necesito cuenta para explorar el marketplace?', a: 'Puedes navegar y ver las tarjetas públicas sin cuenta. Para ver el demo URL, capturas completas y solicitar reuniones necesitas registrarte. El registro es gratuito y tarda menos de 2 minutos.' },
                            { q: '¿Qué pasa si el emprendedor no puede en el horario que seleccioné?', a: 'El sistema de reuniones permite contrapropuestas. El emprendedor puede rechazar la fecha y proponer un horario alternativo. Tú puedes aceptar, volver a contraproposer, o cancelar sin penalización.' },
                            { q: '¿MVPMarket cobra comisión por las transacciones?', a: 'MVPMarket no interviene en el cierre del deal ni cobra comisión sobre el precio de venta. El valor está en la conexión y la confianza: el acuerdo final es entre tú y el comprador.' },
                            { q: '¿Puedo publicar más de un MVP?', a: 'Sí. Puedes tener múltiples listings activos simultáneamente. Cada uno pasa por revisión independiente y tiene su propio sistema de reuniones y estado.' },
                            { q: '¿Cómo se protege el código durante las negociaciones?', a: 'El código fuente nunca se comparte en la plataforma. Tú decides qué muestras (demo, capturas, repositorio privado con acceso puntual). MVPMarket facilita el contacto, el control del activo es tuyo.' },
                          ].map((item, i) => {
                            const isOpen = openFaqIndex === i
                            return (
                              <div
                                key={i}
                                className="rounded-xl border border-border overflow-hidden transition-all"
                              >
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
                                  onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                                >
                                  <span className="font-medium text-sm">{item.q}</span>
                                  <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                </button>
                                {isOpen && (
                                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                                    {item.a}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Dialog cambios sin guardar en perfil */}
                    <Dialog open={profileUnsavedDialog} onOpenChange={setProfileUnsavedDialog}>
                      <DialogContent className="max-w-md">
                        <DialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" /> ¡Tienes cambios sin guardar!
                        </DialogTitle>
                        <DialogDescription>
                          Si cierras sin guardar, perderás los cambios realizados en tu perfil.
                        </DialogDescription>
                        <div className="flex gap-2 mt-4 justify-end">
                          <Button variant="outline" onClick={() => setProfileUnsavedDialog(false)}>
                            OK
                          </Button>
                          <Button variant="destructive" onClick={() => {
                            setProfileUnsavedDialog(false)
                            setProfileDirty(false)
                            setProfileOpen(false)
                          }}>
                            Salir de todos modos
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}

                {/* Diálogo de detalles de notificación */}
                <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
                  <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogTitle className="sr-only">Detalles de la notificación</DialogTitle>
                    <DialogDescription className="sr-only">Información detallada sobre esta notificación</DialogDescription>
                    {selectedNotification && (
                      <NotificationDetails notification={selectedNotification} />
                    )}
                  </DialogContent>
                </Dialog>

                {/* Diálogo de confirmación de logout */}
                <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogTitle>
                      {isAdmin ? 'Cerrar sesión de administrador' : 'Cerrar sesión'}
                    </DialogTitle>
                    <DialogDescription>
                      {isAdmin
                        ? '¿Estás seguro de que deseas salir del modo administrador? Tendrás que iniciar sesión nuevamente para acceder al panel.'
                        : '¿Estás seguro que deseas cerrar sesión?'
                      }
                    </DialogDescription>
                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setLogoutDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1 bg-brand-500 hover:bg-brand-600"
                        onClick={async () => {
                          const supabase = createClient()
                          await supabase.auth.signOut()
                          window.location.href = '/login'
                        }}
                      >
                        Sí, cerrar sesión
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Link href="/marketplace" className="md:hidden">
                  <Button>Marketplace</Button>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <Button>Iniciar sesión</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
