"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, User, Calendar } from 'lucide-react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import ProfileEditor from '@/components/ProfileEditor'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  unreadMessages?: number
  isAuthenticated?: boolean
}

interface ProfileUpdatedEvent extends CustomEvent {
  detail: { avatar_url: string | null }
}

export function Navbar({ unreadMessages = 0, isAuthenticated = false }: NavbarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const pathname = usePathname()

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
    return () => { mounted = false }
  }, [isAuthenticated])

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
            <Link href="/" className={navLinkClass('/')}>
              Inicio
            </Link>
            {isAuthenticated ? (
              <Link href="/marketplace" className={navLinkClass('/marketplace')}>
                Marketplace
              </Link>
            ) : (
              <Link href="/login" className={navLinkClass('/marketplace')}>
                Marketplace
              </Link>
            )}
            <Link href="/how-it-works" className={navLinkClass('/how-it-works')}>
              Cómo funciona
            </Link>
            {isAuthenticated && (
              <Link href="/calendar" className={navLinkClass('/calendar')}>
                Calendario
              </Link>
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
                <Link href="/messages" className="relative">
                  <Button
                    variant={isActive('/messages') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="hover:bg-brand-100"
                  >
                    <MessageSquare className="h-5 w-5" />
                    {unreadMessages > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[11px]">
                        {unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>

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
                      <ProfileEditor />
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
