'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getMvpDetails } from '@/app/actions/mvp'
import { recordMvpUniqueView } from '@/app/actions/mvpViews'
import { getMyMeetings } from '@/app/actions/meetings'
import type { Meeting } from '@/app/actions/meetings'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MeetingScheduler } from '@/components/publish/MeetingScheduler'
import {
  Loader2, ArrowLeft, ExternalLink, Star, Eye,
  Heart, Calendar, CalendarClock, Share2
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getInvestorMeetingStatusMeta, pickLatestMeetingByMvp } from '@/lib/investor-meeting-status'
import { getMyFavorites, toggleFavorite } from '@/app/actions/favorites'

interface MVP {
  id: string
  title: string
  slug: string
  one_liner: string
  description: string
  short_description?: string
  category?: string
  deal_modality?: string
  price_range?: string
  price?: number
  competitive_differentials?: string[]
  cover_image_url?: string
  images_urls?: string[]
  video_url?: string
  demo_url?: string
  repository_url?: string
  documentation_url?: string
  tech_stack?: string[]
  features?: string[]
  metrics?: Record<string, unknown>
  views_count?: number
  favorites_count?: number
  status?: string
  published_at?: string
  created_at?: string
  avg_rating?: number
  evaluations_count?: number
  owner_id?: string
  user_profiles?: {
    display_name?: string
    avatar_url?: string
    company?: string
    bio?: string
  }
}

export default function MVPDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [mvp, setMvp] = useState<MVP | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [investorMeeting, setInvestorMeeting] = useState<Meeting | null>(null)
  const [meetingStatusLoading, setMeetingStatusLoading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false
    try { new URL(url); return true } catch { return false }
  }

  const handleImageError = (imageUrl: string) => {
    setImageErrors((prev) => new Set(prev).add(imageUrl))
  }

  useEffect(() => {
    // Obtener usuario actual para determinar si es dueño o inversor
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null)
    })

    // Cargar favoritos
    getMyFavorites().then((result) => {
      if (result.success && params.id) {
        setIsFavorite(result.data.includes(params.id as string))
      }
    })
  }, [params.id])

  useEffect(() => {
    const fetchMVPDetails = async () => {
      try {
        setLoading(true)
        const result = await getMvpDetails(params.id as string)
        if (result.success && result.data) {
          setMvp(result.data)
          // Registrar vista y actualizar contador optimísticamente
          recordMvpUniqueView(params.id as string)
            .then((viewResult) => {
              if (viewResult.ok && viewResult.counted) {
                // Incrementar el contador de vistas localmente solo si es una vista nueva
                setMvp((prev) => prev ? { ...prev, views_count: (prev.views_count || 0) + 1 } : null)
              }
            })
            .catch(() => { })
        } else {
          setError(result.error || 'No se pudo cargar el MVP')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los detalles')
      } finally {
        setLoading(false)
      }
    }
    fetchMVPDetails()
  }, [params.id])

  useEffect(() => {
    if (!mvp?.id || !currentUserId) return
    if (mvp.owner_id === currentUserId) return

    let mounted = true

    const loadInvestorMeetingStatus = async () => {
      setMeetingStatusLoading(true)
      const meetingsResult = await getMyMeetings()

      if (!mounted) return

      if (!meetingsResult.success) {
        setInvestorMeeting(null)
        setMeetingStatusLoading(false)
        return
      }

      const byMvp = pickLatestMeetingByMvp(
        meetingsResult.data.filter((meeting) => meeting.mvp_id === mvp.id)
      )

      setInvestorMeeting(byMvp[mvp.id] || null)
      setMeetingStatusLoading(false)
    }

    loadInvestorMeetingStatus()

    return () => {
      mounted = false
    }
  }, [mvp?.id, mvp?.owner_id, currentUserId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar isAuthenticated={true} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !mvp) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar isAuthenticated={true} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button onClick={() => router.back()} variant="outline" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground text-lg">{error || 'MVP no encontrado'}</p>
          </div>
        </div>
      </div>
    )
  }

  // El usuario es dueño del MVP? → no puede agendar reunión consigo mismo
  const isOwner = currentUserId !== null && mvp.owner_id === currentUserId
  const meetingMeta = !isOwner && investorMeeting
    ? getInvestorMeetingStatusMeta(investorMeeting.status)
    : null
  const hasActiveMeeting = !!meetingMeta?.isActive
  const canRequestMeeting = !meetingStatusLoading && !hasActiveMeeting
  const meetingDateLabel = investorMeeting?.scheduled_at
    ? new Date(investorMeeting.scheduled_at).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    : null

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => router.back()} variant="outline" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold mb-2">{mvp.title}</h1>
              <p className="text-lg text-muted-foreground">{mvp.one_liner}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {/* Boton Compartir */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href).then(() => {
                      setLinkCopied(true)
                      setTimeout(() => setLinkCopied(false), 2000)
                    })
                  }}
                  className="group flex h-11 w-11 items-center justify-center rounded-full border-2 border-border/80 bg-background shadow-sm transition-all duration-200 hover:scale-110 hover:border-brand-300 active:scale-95"
                  title="Compartir link"
                >
                  <Share2 className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-600" />
                </button>
                {linkCopied && (
                  <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
                    ¡Link Copiado!
                  </span>
                )}
              </div>
              {/* Boton Favorito */}
              {currentUserId && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsFavorite(prev => !prev)
                    const result = await toggleFavorite(mvp.id)
                    if (!result.success) {
                      setIsFavorite(result.isFavorite)
                    }
                  }}
                  className="group flex h-11 w-11 items-center justify-center rounded-full border-2 border-border/80 bg-background shadow-sm transition-all duration-200 hover:scale-110 hover:border-red-300 active:scale-95"
                  title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart
                    className={`h-6 w-6 transition-colors duration-200 ${isFavorite
                      ? 'fill-red-500 text-red-500'
                      : 'text-muted-foreground group-hover:text-red-400'
                      }`}
                  />
                </button>
              )}
            </div>
            {mvp.deal_modality && (
              <Badge className="h-fit text-base px-4 py-2">{mvp.deal_modality}</Badge>
            )}
            {meetingMeta && (
              <Badge variant="outline" className={meetingMeta.badgeClassName}>
                Mi reunión: {meetingMeta.label}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Contenido principal ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Imagen de portada */}
            {mvp.cover_image_url && isValidUrl(mvp.cover_image_url) && !imageErrors.has(mvp.cover_image_url) && (
              <Card className="border-2 overflow-hidden">
                <div className="relative w-full h-96 bg-brand-50">
                  <Image
                    src={mvp.cover_image_url}
                    alt={mvp.title}
                    fill
                    className="object-cover"
                    onError={() => handleImageError(mvp.cover_image_url!)}
                  />
                </div>
              </Card>
            )}

            {/* Descripción */}
            <Card className="border-2">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Descripción</h2>
                {mvp.description ? (
                  <p className="text-muted-foreground whitespace-pre-wrap">{mvp.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">Sin descripción disponible</p>
                )}
              </CardContent>
            </Card>

            {/* Galería */}
            {mvp.images_urls && mvp.images_urls.length > 0 && (
              <Card className="border-2">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Galería</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {mvp.images_urls.map((imageUrl, index) => (
                      <div key={index} className="relative w-full h-48 bg-brand-50 rounded-lg overflow-hidden flex items-center justify-center">
                        {isValidUrl(imageUrl) && !imageErrors.has(imageUrl) ? (
                          <Image
                            src={imageUrl}
                            alt={`${mvp.title} - ${index + 1}`}
                            fill
                            className="object-cover hover:scale-105 transition-transform"
                            onError={() => handleImageError(imageUrl)}
                          />
                        ) : (
                          <p className="text-muted-foreground text-xs text-center px-2">Imagen no disponible</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Diferenciales */}
            <Card className="border-2">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Diferenciales Competitivos</h2>
                {mvp.competitive_differentials?.filter(d => d?.trim()).length ? (
                  <div className="flex flex-wrap gap-3">
                    {mvp.competitive_differentials.filter(d => d?.trim()).map((diff, index) => (
                      <Badge key={index} variant="outline" className="px-4 py-2 text-sm">{diff}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No se han definido diferenciales</p>
                )}
              </CardContent>
            </Card>

            {/* Tech Stack */}
            {mvp.tech_stack && mvp.tech_stack.length > 0 && (
              <Card className="border-2">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Tecnologías</h2>
                  <div className="flex flex-wrap gap-2">
                    {mvp.tech_stack.map((tech, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">{tech}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Características */}
            {mvp.features && mvp.features.length > 0 && (
              <Card className="border-2">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Características Principales</h2>
                  <ul className="space-y-2">
                    {mvp.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Métricas */}
            {mvp.metrics && Object.keys(mvp.metrics).length > 0 && (
              <Card className="border-2">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Métricas</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(mvp.metrics as Record<string, unknown>).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <p className="text-2xl font-bold text-primary">{String(value)}</p>
                        <p className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── AGENDADOR DE REUNIÓN (solo visible para inversores) ── */}
            {!isOwner && currentUserId && (
              <div id="agendar-reunion" className="space-y-4">
                {meetingMeta && (
                  <Card className="border-2">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm font-semibold">Tu estado con este MVP</p>
                        </div>
                        <Badge variant="outline" className={meetingMeta.badgeClassName}>
                          {meetingMeta.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{meetingMeta.description}</p>
                      {meetingDateLabel && (
                        <p className="text-sm text-muted-foreground">
                          Fecha de reunión: {meetingDateLabel}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Link href="/calendar">
                          <Button variant="outline" size="sm">Ver reunión en calendario</Button>
                        </Link>
                        {hasActiveMeeting && (
                          <p className="text-xs text-muted-foreground self-center">
                            Ya tienes una reunión activa para este MVP
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {canRequestMeeting && !showScheduler ? (
                  <Card className="border-2 border-primary/30 bg-primary/5">
                    <CardContent className="p-6 text-center">
                      <Calendar className="w-10 h-10 text-primary mx-auto mb-3" />
                      <h2 className="text-xl font-semibold mb-2">¿Te interesa este MVP?</h2>
                      <p className="text-muted-foreground mb-4 text-sm">
                        {meetingMeta
                          ? 'Ya tuviste interacción con este MVP. Si quieres, agenda un nuevo seguimiento con oferta inicial.'
                          : 'Agenda una reunión con el emprendedor y envía tu oferta inicial para discutirla durante la llamada.'
                        }
                      </p>
                      <Button size="lg" onClick={() => setShowScheduler(true)}>
                        <Calendar className="w-4 h-4 mr-2" />
                        {meetingMeta ? 'Agendar seguimiento con oferta inicial' : 'Agendar reunión con oferta inicial'}
                      </Button>
                    </CardContent>
                  </Card>
                ) : canRequestMeeting && showScheduler ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Agendar Reunión</h2>
                      <Button variant="ghost" size="sm" onClick={() => setShowScheduler(false)}>
                        Cancelar
                      </Button>
                    </div>
                    <MeetingScheduler
                      mvpId={mvp.id}
                      mvpTitle={mvp.title}
                      ownerName={mvp.user_profiles?.display_name}
                    />
                  </div>
                ) : (
                  <Card className="border-2 border-dashed">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <p className="text-sm">
                        Tienes una reunión activa para este MVP. Gestiona el estado desde tu calendario.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Mensaje si es el dueño */}
            {isOwner && (
              <Card className="border-2 border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <p className="text-sm">Eres el creador de este MVP. Los inversores pueden agendar reuniones contigo desde esta página.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">

            {/* Estadísticas */}
            {(mvp.avg_rating || mvp.views_count || mvp.favorites_count) && (
              <Card className="border-2">
                <CardContent className="p-6 space-y-4">
                  {mvp.avg_rating && (
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 fill-brand-400 text-brand-400" />
                      <span className="font-semibold">{mvp.avg_rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({mvp.evaluations_count || 0} reseñas)</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{mvp.views_count || 0} vistas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span>{mvp.favorites_count || 0} favoritos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info del deal */}
            <Card className="border-2">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">Información del Deal</h3>
                {mvp.deal_modality && (
                  <div>
                    <p className="text-sm text-muted-foreground">Modalidad</p>
                    <Badge className="mt-1">{mvp.deal_modality}</Badge>
                  </div>
                )}
                {mvp.price_range && (
                  <div>
                    <p className="text-sm text-muted-foreground">Rango de Precio</p>
                    <p className="font-semibold text-lg text-primary">{mvp.price_range}</p>
                  </div>
                )}
                {mvp.published_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Publicado</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        {new Date(mvp.published_at).toLocaleDateString('es-MX', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botón rápido agendar (sidebar, solo inversores) */}
            {!isOwner && currentUserId && (
              <Card className="border-2">
                <CardContent className="p-6">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      setShowScheduler(true)
                      document.getElementById('agendar-reunion')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Agendar reunión
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Selecciona un horario disponible del emprendedor
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Demo */}
            {mvp.demo_url && (
              <Card className="border-2">
                <CardContent className="p-6">
                  <Link href={mvp.demo_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full" size="lg" variant="outline">
                      Ver Demo
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Creador */}
            {mvp.user_profiles && (mvp.user_profiles.display_name || mvp.user_profiles.company || mvp.user_profiles.bio) && (
              <Card className="border-2">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-lg font-semibold">Creador</h3>
                  {mvp.user_profiles.display_name && <p className="font-semibold">{mvp.user_profiles.display_name}</p>}
                  {mvp.user_profiles.company && <p className="text-sm text-muted-foreground">{mvp.user_profiles.company}</p>}
                  {mvp.user_profiles.bio && <p className="text-sm text-muted-foreground">{mvp.user_profiles.bio}</p>}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
