'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getMvpDetails, getCreatorPublicData } from '@/app/actions/mvp'
import { recordMvpUniqueView } from '@/app/actions/MvpViews'
import { getMyMeetings } from '@/app/actions/meetings'
import type { Meeting } from '@/app/actions/meetings'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MeetingScheduler } from '@/components/publish/MeetingScheduler'
import {
  Loader2, ArrowLeft, ExternalLink, Star, Eye,
  Heart, Calendar, CalendarClock, Share2,
  Banknote, Layers, CalendarDays,
  ChevronLeft, ChevronRight, PlayCircle,
  FileText, Images, Zap, Code2, ListChecks, BarChart2, Info, Tag, TrendingUp,
  Linkedin, MapPin, Building2, Globe
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogTitle
} from '@/components/ui/dialog'
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
  monetization_model?: string | null
  transfer_checklist?: Record<string, boolean> | null
  owner_id?: string
  user_profiles?: {
    display_name?: string
    avatar_url?: string
    company?: string
    bio?: string
    linkedin_url?: string
    location?: string
    website?: string
  }
}

const CHECKLIST_LABELS: Record<string, string> = {
  codeAndDocs: 'Código + Documentación',
  domainOrLanding: 'Dominio / Landing',
  integrationAccounts: 'Cuentas de integración',
  ownIp: 'IP propia; sin terceros',
}

const DEAL_MODALITY_LABELS: Record<string, string> = {
  sale: 'Venta',
  equity: 'Equity',
  license: 'Licencia',
  rev_share: 'Rev-Share',
}

const MONETIZATION_LABELS: Record<string, string> = {
  saas_monthly: 'SaaS mensual',
  one_time_license: 'Licencia única',
  transactional: 'Transaccional',
  advertising: 'Publicidad',
  to_define: 'Por definir',
}

const SECTOR_LABEL: Record<string, string> = {
  tecnologia: 'Tecnología',
  educacion: 'Educación',
  salud: 'Salud y Medicina',
  alimentacion: 'Alimentación',
  finanzas: 'Finanzas y Fintech',
  ecommerce: 'E-commerce',
  entretenimiento: 'Entretenimiento',
  viajes: 'Viajes y Turismo',
  bienes_raices: 'Bienes Raíces',
  logistica: 'Logística',
  marketing: 'Marketing',
  rrhh: 'Recursos Humanos',
  legal: 'Legal',
  agricultura: 'Agricultura',
  energia: 'Energía',
  deportes: 'Deportes y Fitness',
  moda: 'Moda y Belleza',
  higiene: 'Higiene',
  construccion: 'Construcción',
  manufactura: 'Manufactura',
  otros: 'Otros',
}

interface CreatorProfile {
  display_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  company?: string | null
  linkedin_url?: string | null
  location?: string | null
  website?: string | null
  github_url?: string | null
  created_at?: string | null
}

interface OtherMvp {
  id: string
  title: string
  cover_image_url?: string | null
  views_count?: number
  favorites_count?: number
  deal_modality?: string | null
  one_liner?: string | null
  slug?: string
}

interface CreatorData {
  profile: CreatorProfile
  email: string | null
  joinedAt: string | null
  otherMvps: OtherMvp[]
  meetingsCount: number
  totalMvps: number
}

function getInitials(name?: string | null) {
  const v = (name || '').trim()
  if (!v) return '?'
  const parts = v.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1][0] || '')).toUpperCase()
}

export function MvpDetailsClient({ isAdmin: isAdminUser }: { isAdmin: boolean }) {
  const params = useParams()
  const router = useRouter()
  const [mvp, setMvp] = useState<MVP | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [schedulerBooked, setSchedulerBooked] = useState(false)
  const [investorMeeting, setInvestorMeeting] = useState<Meeting | null>(null)
  const [meetingStatusLoading, setMeetingStatusLoading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; isVideo: boolean } | null>(null)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showDifferentialsDialog, setShowDifferentialsDialog] = useState(false)
  const [showCreatorDialog, setShowCreatorDialog] = useState(false)
  const [creatorData, setCreatorData] = useState<CreatorData | null>(null)
  const [creatorDataLoading, setCreatorDataLoading] = useState(false)

  const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video')

  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false
    try { new URL(url); return true } catch { return false }
  }

  const handleImageError = (imageUrl: string) => {
    setImageErrors((prev) => new Set(prev).add(imageUrl))
  }

  const handleViewCreator = async () => {
    if (!mvp?.owner_id) return
    setShowCreatorDialog(true)
    if (creatorData) return
    setCreatorDataLoading(true)

    // Usar inmediatamente lo que ya viene del MVP (evita RLS)
    const initialProfile: CreatorProfile = {
      display_name: mvp.user_profiles?.display_name,
      avatar_url: mvp.user_profiles?.avatar_url,
      company: mvp.user_profiles?.company,
      bio: mvp.user_profiles?.bio,
      linkedin_url: mvp.user_profiles?.linkedin_url,
      location: mvp.user_profiles?.location,
      website: mvp.user_profiles?.website,
    }
    setCreatorData({ profile: initialProfile, email: null, joinedAt: null, otherMvps: [], meetingsCount: 0, totalMvps: 0 })

    const result = await getCreatorPublicData(mvp.owner_id, mvp.id)
    if (result.success && result.data) {
      setCreatorData({
        profile: {
          ...initialProfile,
          ...(result.data.profile as CreatorProfile),
          display_name: (result.data.profile as CreatorProfile).display_name || initialProfile.display_name,
          avatar_url: (result.data.profile as CreatorProfile).avatar_url || initialProfile.avatar_url,
        },
        email: result.data.email as string | null,
        joinedAt: result.data.joinedAt as string | null,
        otherMvps: result.data.otherMvps as OtherMvp[],
        meetingsCount: result.data.meetingsCount,
        totalMvps: result.data.totalMvps,
      })
    }
    setCreatorDataLoading(false)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null)
    })
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
          recordMvpUniqueView(params.id as string)
            .then((viewResult) => {
              if (viewResult.ok && viewResult.counted) {
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
        <Navbar isAuthenticated={true} isAdmin={isAdminUser} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !mvp) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar isAuthenticated={true} isAdmin={isAdminUser} />
        <div className="border-b bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Button onClick={() => router.back()} variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground text-lg">{error || 'MVP no encontrado'}</p>
          </div>
        </div>
      </div>
    )
  }

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
      <Navbar isAuthenticated={true} isAdmin={isAdminUser} />

      {/* Back button — top bar con mensaje contextual */}
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>

          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">
              A continuación se muestra la información del MVP.
            </span>
          </div>

          {/* Sector del MVP */}
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm shrink-0">
            <Tag className="w-3.5 h-3.5" />
            <span>{mvp.category ? (SECTOR_LABEL[mvp.category] ?? mvp.category) : 'Otros'}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Hero: título, acciones y stats ── */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            {/* Título + one-liner + demo */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <h1 className="text-4xl font-bold leading-tight">{mvp.title}</h1>
                {mvp.demo_url && isValidUrl(mvp.demo_url) && (
                  <Link href={mvp.demo_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2 border-brand-300 text-brand-700 hover:bg-brand-50">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver Demo
                    </Button>
                  </Link>
                )}
              </div>
              <p className="text-base text-muted-foreground">{mvp.one_liner}</p>
            </div>

            {/* Stats + Share + Favorite (esquina superior derecha) */}
            <div className="flex flex-col items-end gap-4 flex-shrink-0">
              {/* Stats */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-xl bg-brand-50 border border-brand-100 px-3 py-1.5">
                  <Eye className="w-3.5 h-3.5 text-brand-500" />
                  <span className="text-base font-bold text-brand-700">{mvp.views_count || 0}</span>
                  <span className="text-xs text-brand-500 font-medium">vistas</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-100 px-3 py-1.5">
                  <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                  <span className="text-base font-bold text-red-700">{mvp.favorites_count || 0}</span>
                  <span className="text-xs text-red-500 font-medium">favoritos</span>
                </div>
                {mvp.avg_rating != null && mvp.avg_rating > 0 && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-base font-bold text-amber-700">{mvp.avg_rating.toFixed(1)}</span>
                    <span className="text-xs text-amber-500 font-medium">/ 5</span>
                  </div>
                )}
              </div>
              {/* Share + Favorite */}
              <div className="flex items-center gap-2">
              {/* Creado por */}
              {mvp.owner_id && (
                <button
                  type="button"
                  onClick={handleViewCreator}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <span className="text-sm">Creado por:</span>
                  <span className="text-sm font-semibold text-foreground underline underline-offset-2 decoration-dotted group-hover:decoration-solid transition-all">
                    {mvp.user_profiles?.display_name || 'Ver perfil'}
                  </span>
                </button>
              )}
              <div className="relative ml-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href).then(() => {
                      setLinkCopied(true)
                      setTimeout(() => setLinkCopied(false), 2000)
                    })
                  }}
                  className="group flex h-10 w-10 items-center justify-center rounded-full border-2 border-border/80 bg-background shadow-sm transition-all duration-200 hover:scale-110 hover:border-brand-300 active:scale-95"
                  title="Compartir link"
                >
                  <Share2 className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-brand-600" />
                </button>
                {linkCopied && (
                  <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
                    ¡Link Copiado!
                  </span>
                )}
              </div>
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
                  className="group flex h-10 w-10 items-center justify-center rounded-full border-2 border-border/80 bg-background shadow-sm transition-all duration-200 hover:scale-110 hover:border-red-300 active:scale-95"
                  title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart
                    className={`h-5 w-5 transition-colors duration-200 ${isFavorite
                      ? 'fill-red-500 text-red-500'
                      : 'text-muted-foreground group-hover:text-red-400'
                      }`}
                  />
                </button>
              )}
            </div>
            </div>
          </div>
        </div>

        {/* ── CTA principal: Agendar reunión (solo inversores) ── */}
        {!isOwner && currentUserId && (
          <div className="mb-8" id="agendar-reunion">
            {meetingMeta && (
              <Card className="border-2 mb-4">
                <CardContent className="p-5">
                  {/* Tres columnas iguales: título+desc | botón+fecha | badge */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="text-sm font-semibold text-muted-foreground">Tu estado con este MVP</p>
                      </div>
                      <p className="text-sm text-foreground mt-1.5">{meetingMeta.description}</p>
                    </div>
                    <div className="flex-1 flex flex-wrap items-center justify-center gap-3">
                      <Link href="/calendar">
                        <Button variant="outline" size="sm">Ver reunión en calendario</Button>
                      </Link>
                      {meetingDateLabel && (
                        <p className="text-xs text-muted-foreground">Fecha de reunión: {meetingDateLabel}</p>
                      )}
                    </div>
                    <div className="flex-1 flex justify-end">
                      <Badge variant="outline" className={`${meetingMeta.badgeClassName} shrink-0`}>
                        {meetingMeta.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {canRequestMeeting && !showScheduler && (
              <Card className="border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-8">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 ml-5 shrink-0">
                        <Calendar className="w-8 h-8 text-brand-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg leading-tight mb-1">
                          {meetingMeta ? '¿Quieres hacer seguimiento?' : '¿Te interesa este MVP?'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {meetingMeta
                            ? 'Agenda un nuevo seguimiento con oferta inicial.'
                            : 'Agenda una reunión y envía tu oferta inicial al emprendedor.'
                          }
                        </p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="shrink-0 mr-4"
                      onClick={() => setShowScheduler(true)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {meetingMeta ? 'Agendar seguimiento' : 'Agendar reunión'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {canRequestMeeting && showScheduler && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Agendar Reunión</h2>
                  {!schedulerBooked && (
                    <Button variant="ghost" size="sm" onClick={() => setShowScheduler(false)}>
                      Cancelar
                    </Button>
                  )}
                </div>
                <MeetingScheduler
                  mvpId={mvp.id}
                  mvpTitle={mvp.title}
                  ownerName={mvp.user_profiles?.display_name}
                  onBooked={() => setSchedulerBooked(true)}
                />
              </div>
            )}

            {!canRequestMeeting && !meetingStatusLoading && (
              <Card className="border-2 border-dashed">
                <CardContent className="p-5 text-center text-muted-foreground">
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
          <Card className="border-2 border-dashed mb-8">
            <CardContent className="p-5 text-center text-muted-foreground">
              <p className="text-sm">Eres el creador de este MVP. Los inversores pueden agendar reuniones contigo desde esta página.</p>
            </CardContent>
          </Card>
        )}


        {/* Grid 2 columnas */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── Fila 1: Descripción (izq) + Info Deal (der) — misma altura ── */}

          {/* Descripción */}
          <Card className="border-2 flex flex-col">
            <CardContent className="px-6 pt-1 pb-3 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-semibold">Descripción</h2>
                <FileText className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <div className="flex-1">
                {mvp.description ? (
                  <div className="rounded-lg bg-muted/40 border px-4 py-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{mvp.description}</p>
                    {mvp.description.length > 200 && (
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => setShowFullDescription(true)}
                          className="inline-flex items-center rounded-full bg-background border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-brand-300 transition-colors shadow-sm"
                        >
                          Mostrar más
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sin descripción disponible</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información del Deal */}
          <Card className="border-2 flex flex-col">
            <CardContent className="px-6 pt-1 pb-3 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-semibold">Información del Deal</h2>
                <Info className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                {/* Col izquierda: Modalidad + Precio */}
                <div className="flex flex-col gap-4">
                  {mvp.deal_modality && (
                    <div className="flex items-center gap-4">
                      <Layers className="w-6 h-6 text-brand-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Modalidad</p>
                        <p className="font-semibold mt-0.5">{DEAL_MODALITY_LABELS[mvp.deal_modality] ?? mvp.deal_modality}</p>
                      </div>
                    </div>
                  )}
                  {mvp.price_range && (
                    <div className="flex items-center gap-4">
                      <Banknote className="w-6 h-6 text-brand-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Precio</p>
                        <p className="font-semibold mt-0.5">{mvp.price_range}</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Col derecha: Monetización + Publicado */}
                <div className="flex flex-col gap-4">
                  {mvp.monetization_model && (
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-6 h-6 text-brand-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Monetización</p>
                        <p className="font-semibold mt-0.5">{MONETIZATION_LABELS[mvp.monetization_model] ?? mvp.monetization_model}</p>
                      </div>
                    </div>
                  )}
                  {mvp.published_at && (
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-6 h-6 text-brand-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Publicado</p>
                        <p className="font-semibold mt-0.5">
                          {new Date(mvp.published_at).toLocaleDateString('es-MX', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Fila 2: Galería (izq) + Diferenciales (der) ── */}

          {/* Galería */}
          {(() => {
            const galleryUrls: string[] = []
            const getPath = (url: string) => { try { return new URL(url).pathname } catch { return url } }
            const seenPaths = new Set<string>()
            const addGallery = (url: string) => {
              if (!isValidUrl(url) || imageErrors.has(url)) return
              const path = getPath(url)
              if (!seenPaths.has(path)) { seenPaths.add(path); galleryUrls.push(url) }
            }
            if (mvp.cover_image_url) addGallery(mvp.cover_image_url)
            if (mvp.images_urls) mvp.images_urls.forEach(u => addGallery(u))
            if (galleryUrls.length === 0) return null
            const PER_PAGE = 2
            const canLeft = galleryIndex > 0
            const canRight = galleryIndex + PER_PAGE < galleryUrls.length
            const visible = galleryUrls.slice(galleryIndex, galleryIndex + PER_PAGE)
            return (
              <Card className="border-2">
                <CardContent className="px-6 pt-1 pb-3">
                  <div className="flex items-center justify-between mb-10">
                    <h2 className="text-2xl font-semibold">Galería (Imágenes/Videos)</h2>
                    <Images className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {visible.map((url, i) => {
                      const vid = isVideo(url)
                      return (
                        <button
                          key={galleryIndex + i}
                          type="button"
                          onClick={() => setSelectedMedia({ url, isVideo: vid })}
                          className="relative w-full h-52 bg-brand-50 rounded-lg overflow-hidden group focus:outline-none"
                        >
                          {vid ? (
                            <div className="absolute inset-0">
                              <video
                                src={url}
                                preload="metadata"
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <PlayCircle className="w-12 h-12 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                              </div>
                            </div>
                          ) : (
                            <Image
                              src={url}
                              alt={`${mvp.title} - ${galleryIndex + i + 1}`}
                              fill
                              unoptimized
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={() => handleImageError(url)}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {(canLeft || canRight) && (
                    <div className="flex items-center justify-between mt-3">
                      <button
                        type="button"
                        disabled={!canLeft}
                        onClick={() => setGalleryIndex(i => Math.max(0, i - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm disabled:opacity-30 hover:bg-muted transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {galleryIndex + 1}–{Math.min(galleryIndex + PER_PAGE, galleryUrls.length)} de {galleryUrls.length}
                      </span>
                      <button
                        type="button"
                        disabled={!canRight}
                        onClick={() => setGalleryIndex(i => i + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm disabled:opacity-30 hover:bg-muted transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })()}

          {/* Diferenciales + Checklist apilados */}
          <div className="flex flex-col gap-6">
            {/* Diferenciales Competitivos */}
            <Card className="border-2 flex flex-col flex-1">
              <CardContent className="px-6 pt-1 pb-3 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-semibold">Diferenciales Competitivos</h2>
                  <Zap className="w-5 h-5 text-muted-foreground/40" />
                </div>
                {mvp.competitive_differentials?.filter(d => d?.trim()).length ? (
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex gap-2">
                      {mvp.competitive_differentials.filter(d => d?.trim()).map((diff, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setShowDifferentialsDialog(true)}
                          className="flex-1 min-w-0 text-left px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 hover:border-brand-300 transition-colors"
                        >
                          <p className="text-xs text-muted-foreground mb-0.5">Diferencial {index + 1}</p>
                          <p className="text-sm font-medium truncate">{diff}</p>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground/70 text-center italic">
                      Haz click sobre cualquier diferencial para verlos detalladamente
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No se han definido diferenciales</p>
                )}
              </CardContent>
            </Card>

            {/* Checklist de Transferencia */}
            <Card className="border-2 flex flex-col flex-1">
              <CardContent className="px-6 pt-1 pb-3 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-semibold">Checklist de Transferencia</h2>
                  <ListChecks className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
                    const checked = mvp.transfer_checklist?.[key] === true
                    return (
                      <div key={key} className="flex items-center gap-2.5">
                        {checked ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 flex-shrink-0">
                            <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                            </svg>
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted flex-shrink-0">
                            <svg className="w-3 h-3 text-muted-foreground/50" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l6 6M9 3l-6 6" />
                            </svg>
                          </div>
                        )}
                        <span className={`text-sm ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tech Stack — ancho completo */}
          {mvp.tech_stack && mvp.tech_stack.length > 0 && (
            <Card className="border-2 lg:col-span-2">
              <CardContent className="px-6 pt-1 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-semibold">Tecnologías</h2>
                  <Code2 className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {mvp.tech_stack.map((tech, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">{tech}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Características — ancho completo */}
          {mvp.features && mvp.features.length > 0 && (
            <Card className="border-2 lg:col-span-2">
              <CardContent className="px-6 pt-1 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-semibold">Características Principales</h2>
                  <ListChecks className="w-5 h-5 text-muted-foreground/40" />
                </div>
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

          {/* Métricas — ancho completo */}
          {mvp.metrics && Object.keys(mvp.metrics).length > 0 && (
            <Card className="border-2 lg:col-span-2">
              <CardContent className="px-6 pt-1 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-semibold">Métricas</h2>
                  <BarChart2 className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        </div>
      </div>

      {/* Dialog descripción completa */}
      {mounted && (
      <Dialog open={showFullDescription} onOpenChange={setShowFullDescription}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogTitle className="text-xl font-semibold mb-1">Descripción completa</DialogTitle>
          <div className="rounded-lg bg-muted/40 border px-4 py-3 mt-3">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{mvp.description}</p>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Dialog diferenciales competitivos */}
      {mounted && (
      <Dialog open={showDifferentialsDialog} onOpenChange={setShowDifferentialsDialog}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-xl font-semibold">Diferenciales Competitivos</DialogTitle>
          <div className="mt-2 overflow-hidden rounded-xl border border-border">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr] bg-muted/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
              <span className="w-28">N° Diferencial</span>
              <span>Descripción</span>
            </div>
            {/* Rows */}
            {mvp?.competitive_differentials?.filter(d => d?.trim()).map((diff, index) => (
              <div
                key={index}
                className={`grid grid-cols-[auto_1fr] px-4 py-3 gap-3 items-start ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} ${index !== 0 ? 'border-t border-border/50' : ''}`}
              >
                <span className="w-28 text-sm font-medium text-brand-600 shrink-0">Diferencial {index + 1}</span>
                <span className="text-sm text-foreground leading-relaxed">{diff}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* ── Dialog: Perfil del Creador ── */}
      {mounted && (
      <Dialog open={showCreatorDialog} onOpenChange={setShowCreatorDialog}>
        <DialogContent className="max-w-xl p-0 gap-0 [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:top-3 [&>button]:right-3 [&>button]:z-10">
          <DialogTitle className="sr-only">Perfil del creador</DialogTitle>

          {/* Banner con avatar + nombre encima */}
          <div className="h-[116px] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 relative flex-shrink-0 rounded-t-xl" style={{ overflow: 'visible' }}>
            <div className="absolute inset-0 opacity-[0.07] rounded-t-xl" style={{ backgroundImage: 'linear-gradient(rgba(255,107,53,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,0.6) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            {/* Avatar: mitad en el banner, mitad en blanco */}
            <div className="absolute bottom-0 left-6 translate-y-1/2 z-20">
              {creatorData?.profile.avatar_url ? (
                <Image
                  src={creatorData.profile.avatar_url}
                  alt={creatorData.profile.display_name || 'Avatar'}
                  width={112} height={112}
                  className="w-28 h-28 rounded-2xl border-4 border-background object-cover shadow-md"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl border-4 border-background bg-brand-100 flex items-center justify-center shadow-md">
                  <span className="text-3xl font-bold text-brand-700">
                    {getInitials(creatorData?.profile.display_name)}
                  </span>
                </div>
              )}
            </div>

            {/* Nombre + empresa + fecha — a la derecha del avatar, sobre el banner */}
            <div className="absolute bottom-0 left-[152px] right-4 pb-4 flex flex-col justify-end gap-0.5">
              <h2 className="text-xl font-bold text-white leading-tight line-clamp-1">
                {creatorData?.profile.display_name || 'Usuario'}
              </h2>
              {creatorData?.profile.company && (
                <p className="text-[11px] text-white/65 flex items-center gap-1 line-clamp-1">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  {creatorData.profile.company}
                </p>
              )}
              {creatorData?.joinedAt && (
                <p className="text-[10px] text-white/50 mt-0.5">
                  Se unió el {new Date(creatorData.joinedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Contenido scrolleable */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 9rem)' }}>

            {creatorDataLoading && !creatorData ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin w-7 h-7 text-muted-foreground" />
              </div>
            ) : creatorData ? (
              <div className="px-6 pb-6">

                {/* Zona de transición: avatar (espacio) a la izquierda, email+linkedin a la derecha */}
                <div className="flex items-start gap-4 pt-1">
                  {/* Hueco para el avatar que sobresale del banner */}
                  <div className="w-28 flex-shrink-0" />
                  {/* Contacto alineado con el nombre en el banner */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ minHeight: '56px' }}>
                    {creatorData.email && (
                      <p className="text-[12px] text-zinc-500 mb-0.5">{creatorData.email}</p>
                    )}
                    {creatorData.profile.linkedin_url && (
                      <Link
                        href={creatorData.profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#0077b5] hover:underline"
                      >
                        <Linkedin className="w-3 h-3" />
                        {creatorData.profile.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {creatorData.profile.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed pl-3 border-l-2 border-brand-200 mt-4 mb-1">
                    {creatorData.profile.bio}
                  </p>
                )}

                {/* Separador */}
                <div className="border-t border-border/50 my-4" />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { value: creatorData.totalMvps, label: 'MVPs publicados' },
                    { value: creatorData.meetingsCount, label: 'Reuniones recibidas' },
                    { value: creatorData.otherMvps.reduce((acc, m) => acc + (m.favorites_count || 0), mvp?.favorites_count || 0), label: 'Total favoritos' },
                  ].map(({ value, label }) => (
                    <div key={label} className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-center">
                      <p className="text-2xl font-extrabold text-brand-700">{value}</p>
                      <p className="text-[11px] text-brand-500 font-medium mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Otros MVPs */}
                {creatorData.otherMvps.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold">Otros MVPs</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {creatorData.otherMvps.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'scroll', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
                      {creatorData.otherMvps.map((m) => (
                        <Link
                          key={m.id}
                          href={`/mvps/${m.id}`}
                          onClick={() => setShowCreatorDialog(false)}
                          style={{ flexShrink: 0, width: '176px' }}
                          className="rounded-xl border border-border bg-muted/30 overflow-hidden hover:border-brand-300 hover:shadow-md transition-all duration-200 group block"
                        >
                          <div className="relative h-24 bg-muted overflow-hidden">
                            {m.cover_image_url ? (
                              <Image
                                src={m.cover_image_url}
                                alt={m.title}
                                fill
                                unoptimized
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Layers className="w-8 h-8 text-muted-foreground/30" />
                              </div>
                            )}
                            {m.deal_modality && (
                              <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-sm">
                                {DEAL_MODALITY_LABELS[m.deal_modality] ?? m.deal_modality}
                              </span>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-semibold text-foreground line-clamp-1 mb-1">{m.title}</p>
                            {m.one_liner && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight mb-2">{m.one_liner}</p>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {m.views_count || 0}</span>
                              <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {m.favorites_count || 0}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Este es el único MVP publicado por este creador.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No se pudo cargar el perfil del creador.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Dialog para ver imagen/video en grande */}
      {mounted && (
      <Dialog open={!!selectedMedia} onOpenChange={(open) => { if (!open) setSelectedMedia(null) }}>
        <DialogContent className="max-w-5xl w-[90vw] p-0 border border-white/10 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl [&>button]:text-white/70 [&>button]:hover:text-white [&>button]:top-3 [&>button]:right-3 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:bg-white/10 [&>button]:hover:bg-white/20 [&>button]:ring-offset-zinc-900 [&>button]:flex [&>button]:items-center [&>button]:justify-center">
          <DialogTitle className="sr-only">Vista ampliada</DialogTitle>
          {selectedMedia?.isVideo ? (
            <div className="p-3">
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className="w-full max-h-[85vh] rounded-xl"
              />
            </div>
          ) : selectedMedia ? (
            <div className="flex flex-col">
              <div className="relative w-full bg-zinc-950 rounded-t-2xl" style={{ height: '75vh' }}>
                <Image
                  src={selectedMedia.url}
                  alt="Vista ampliada"
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div className="px-5 py-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                <span className="text-xs text-zinc-400 font-medium">Galería del MVP</span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      )}
    </div>
  )
}
