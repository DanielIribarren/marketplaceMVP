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
  const notificationsRef = useRef<HTMLDivElement | null>(null)
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
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notificationsOpen])

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
                                      <p className="text-sm font-medium leading-5">{notification.title}</p>
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

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="p-0 hover:bg-brand-100">
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

                      <DialogContent>
                        <div className="max-h-[90vh] overflow-y-auto">
                          <DialogTitle>Editar perfil</DialogTitle>
                          <DialogDescription className="mb-4">Actualiza tu información pública</DialogDescription>
                          <ProfileEditor onLogout={() => setLogoutDialogOpen(true)} />
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
