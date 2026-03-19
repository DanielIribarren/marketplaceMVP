'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Activity, BookOpen, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Cpu, Droplets, Eye, Factory, Film, Hammer, Heart, Home, Layers, Leaf, LayoutList, LayoutGrid, Megaphone, Package, Plane, PlayCircle, Scale, Share2, ShoppingCart, SlidersHorizontal, Tag, Truck, TrendingUp, Trophy, Users, Utensils, X, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { getMyMeetings } from '@/app/actions/meetings'
import type { Meeting } from '@/app/actions/meetings'
import { getInvestorMeetingStatusMeta, pickLatestMeetingByMvp } from '@/lib/investor-meeting-status'
import { getMyFavorites, toggleFavorite } from '@/app/actions/favorites'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

type FilterState = {
  q: string
  dealModality: string
  sector: string
  sort: 'recent' | 'oldest' | 'price_low' | 'price_high' | 'most_views' | 'most_favorites'
  priceMin: string
  priceMax: string
  publishedFrom: string
  publishedTo: string
  page: number
  limit: number
}

const SECTOR_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'tecnologia', label: 'Tecnología', Icon: Cpu },
  { value: 'educacion', label: 'Educación', Icon: BookOpen },
  { value: 'salud', label: 'Salud y Medicina', Icon: Activity },
  { value: 'alimentacion', label: 'Alimentación', Icon: Utensils },
  { value: 'finanzas', label: 'Finanzas y Fintech', Icon: TrendingUp },
  { value: 'ecommerce', label: 'E-commerce', Icon: ShoppingCart },
  { value: 'entretenimiento', label: 'Entretenimiento', Icon: Film },
  { value: 'viajes', label: 'Viajes y Turismo', Icon: Plane },
  { value: 'bienes_raices', label: 'Bienes Raíces', Icon: Home },
  { value: 'logistica', label: 'Logística', Icon: Truck },
  { value: 'marketing', label: 'Marketing', Icon: Megaphone },
  { value: 'rrhh', label: 'Recursos Humanos', Icon: Users },
  { value: 'legal', label: 'Legal', Icon: Scale },
  { value: 'agricultura', label: 'Agricultura', Icon: Leaf },
  { value: 'energia', label: 'Energía', Icon: Zap },
  { value: 'deportes', label: 'Deportes y Fitness', Icon: Trophy },
  { value: 'moda', label: 'Moda y Belleza', Icon: Tag },
  { value: 'higiene', label: 'Higiene', Icon: Droplets },
  { value: 'construccion', label: 'Construcción', Icon: Hammer },
  { value: 'manufactura', label: 'Manufactura', Icon: Factory },
  { value: 'otros', label: 'Otros', Icon: Package },
]

const SECTOR_LABEL: Record<string, string> = Object.fromEntries(
  SECTOR_OPTIONS.map(({ value, label }) => [value, label])
)

const MONETIZATION_LABEL: Record<string, string> = {
  saas_monthly: 'SaaS mensual',
  one_time_license: 'Licencia única',
  transactional: 'Transaccional',
  advertising: 'Publicidad',
  to_define: 'Por definir',
}

const DEAL_MODALITY_LABEL: Record<string, string> = {
  sale: 'Venta',
  equity: 'Equity',
  license: 'Licencia',
  rev_share: 'Rev-Share',
}

type MvpListItem = {
  id: string
  title: string
  one_liner?: string | null
  category?: string | null
  cover_image_url?: string | null
  images_urls?: string[] | null
  deal_modality?: string | null
  monetization_model?: string | null
  price_range?: string | null
  price?: number | null
  status?: string | null
  views_count?: number | null
  favorites_count?: number | null
  competitive_differentials?: string[] | null
  owner_id?: string | null
}

type MarketplaceClientProps = {
  initialMvps: MvpListItem[]
  initialCount: number
  userId: string
  initialFilters: FilterState
}

function formatMeetingDateShort(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function buildApiParams(filters: FilterState) {
  const params = new URLSearchParams()
  params.set('status', 'approved')

  const q = filters.q?.trim() || ''
  const dealModality = filters.dealModality?.trim() || ''
  const sector = filters.sector?.trim() || ''

  if (q) params.set('q', q)
  if (dealModality) params.set('deal_modality', dealModality)
  if (sector) params.set('category', sector)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.priceMin) params.set('price_min', filters.priceMin)
  if (filters.priceMax) params.set('price_max', filters.priceMax)
  if (filters.publishedFrom) params.set('published_from', filters.publishedFrom)
  if (filters.publishedTo) params.set('published_to', filters.publishedTo)
  if (filters.page > 1) params.set('offset', ((filters.page - 1) * filters.limit).toString())
  params.set('limit', filters.limit.toString())

  return params
}

function buildUrlParams(filters: FilterState) {
  const params = new URLSearchParams()

  const q = filters.q?.trim() || ''
  const dealModality = filters.dealModality?.trim() || ''
  const sector = filters.sector?.trim() || ''

  if (q) params.set('q', q)
  if (dealModality) params.set('deal_modality', dealModality)
  if (sector) params.set('sector', sector)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.priceMin) params.set('price_min', filters.priceMin)
  if (filters.priceMax) params.set('price_max', filters.priceMax)
  if (filters.publishedFrom) params.set('published_from', filters.publishedFrom)
  if (filters.publishedTo) params.set('published_to', filters.publishedTo)
  if (filters.page > 1) params.set('page', filters.page.toString())

  return params
}

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateLabel(value: string): string {
  const parsed = parseDateValue(value)
  if (!parsed) return 'dd/mm/yyyy'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed)
}

type DateFilterFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: (date: Date) => boolean
}

function DateFilterField({ label, value, onChange, disabled }: DateFilterFieldProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="border-input mt-1 flex h-9 w-full items-center justify-between rounded-lg border bg-background/85 px-3 py-1 text-sm shadow-xs transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-brand-300 focus:outline-none focus:ring-[3px] focus:ring-brand-300/45"
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {formatDateLabel(value)}
        </span>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[280px] rounded-2xl border border-border/80 bg-background p-3 shadow-xl brand-border-glow">
          <Calendar
            mode="single"
            selected={parseDateValue(value)}
            onSelect={(date) => {
              if (!(date instanceof Date)) return
              onChange(formatDateValue(date))
              setOpen(false)
            }}
            disabled={disabled}
          />
          {value && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                Limpiar fecha
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function MarketplaceClient({ initialMvps, initialCount, userId, initialFilters }: MarketplaceClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    () => Boolean(initialFilters.priceMin || initialFilters.priceMax || initialFilters.publishedFrom || initialFilters.publishedTo)
  )
  const [filters, setFilters] = useState<FilterState>({
    q: initialFilters.q || '',
    dealModality: initialFilters.dealModality || '',
    sector: initialFilters.sector || '',
    sort: initialFilters.sort || 'recent',
    priceMin: initialFilters.priceMin || '',
    priceMax: initialFilters.priceMax || '',
    publishedFrom: initialFilters.publishedFrom || '',
    publishedTo: initialFilters.publishedTo || '',
    page: initialFilters.page || 1,
    limit: 24
  })
  const [mvps, setMvps] = useState<MvpListItem[]>(initialMvps)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(initialCount)
  const [loading, setLoading] = useState<boolean>(false)
  const [meetingByMvp, setMeetingByMvp] = useState<Record<string, Meeting>>({})
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [copiedMvpId, setCopiedMvpId] = useState<string | null>(null)
  const [mediaIndexes, setMediaIndexes] = useState<Record<string, number>>({})
  const [videoModal, setVideoModal] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [groupBySector, setGroupBySector] = useState(false)
  const isFirstLoad = useRef(true)

  function getMediaItems(mvp: MvpListItem): string[] {
    const getPath = (url: string) => {
      try { return new URL(url).pathname } catch { return url }
    }
    const seenPaths = new Set<string>()
    const items: string[] = []
    const addIfNew = (url: string) => {
      const path = getPath(url)
      if (!seenPaths.has(path)) { seenPaths.add(path); items.push(url) }
    }
    if (mvp.cover_image_url) addIfNew(mvp.cover_image_url)
    if (mvp.images_urls) {
      for (const url of mvp.images_urls) addIfNew(url)
    }
    return items
  }

  function isVideoUrl(url: string): boolean {
    return /\.(mp4|webm|mov|avi|mkv|ogv)(\?.*)?$/i.test(url)
  }

  function getMediaIndex(mvpId: string) {
    return mediaIndexes[mvpId] || 0
  }

  function setMediaIndex(mvpId: string, index: number) {
    setMediaIndexes(prev => ({ ...prev, [mvpId]: index }))
  }

  const apiQuery = useMemo(() => buildApiParams(filters).toString(), [filters])
  const urlQuery = useMemo(() => buildUrlParams(filters).toString(), [filters])
  const advancedFilterCount = useMemo(
    () => [filters.priceMin, filters.priceMax, filters.publishedFrom, filters.publishedTo].filter(Boolean).length,
    [filters.priceMin, filters.priceMax, filters.publishedFrom, filters.publishedTo]
  )
  const hasNonDefaultFilters = useMemo(
    () =>
      Boolean(
        filters.q ||
        filters.dealModality ||
        filters.sector ||
        filters.priceMin ||
        filters.priceMax ||
        filters.publishedFrom ||
        filters.publishedTo ||
        filters.sort !== 'recent'
      ),
    [filters]
  )

  useEffect(() => {
    let mounted = true

    const loadMeetingStatuses = async () => {
      const result = await getMyMeetings()
      if (!result.success || !mounted) return
      setMeetingByMvp(pickLatestMeetingByMvp(result.data))
    }

    const loadFavorites = async () => {
      const result = await getMyFavorites()
      if (!result.success || !mounted) return
      setFavoriteIds(new Set(result.data))
    }

    loadMeetingStatuses()
    loadFavorites()

    return () => {
      mounted = false
    }
  }, [])

  const handleToggleFavorite = useCallback(async (mvpId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Optimistic UI
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (next.has(mvpId)) {
        next.delete(mvpId)
      } else {
        next.add(mvpId)
      }
      return next
    })

    const result = await toggleFavorite(mvpId)
    if (!result.success) {
      // Revert on failure
      setFavoriteIds(prev => {
        const next = new Set(prev)
        if (result.isFavorite) {
          next.add(mvpId)
        } else {
          next.delete(mvpId)
        }
        return next
      })
    }
  }, [])

  const displayedMvps = useMemo(
    () => showFavoritesOnly ? mvps.filter(mvp => favoriteIds.has(mvp.id)) : mvps,
    [mvps, showFavoritesOnly, favoriteIds]
  )

  const sectorGroups = useMemo(() => {
    if (!groupBySector) return null
    const validValues = new Set(SECTOR_OPTIONS.map(opt => opt.value))
    const grouped: Record<string, MvpListItem[]> = {}
    for (const mvp of displayedMvps) {
      const raw = mvp.category?.toLowerCase().trim() || ''
      const key = validValues.has(raw) ? raw : 'otros'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(mvp)
    }
    return SECTOR_OPTIONS
      .filter(opt => grouped[opt.value]?.length)
      .map(opt => ({ ...opt, mvps: grouped[opt.value] }))
  }, [groupBySector, displayedMvps])

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }

    const handle = setTimeout(async () => {
      router.replace(urlQuery ? `${pathname}?${urlQuery}` : pathname, { scroll: false })

      setError(null)
      setLoading(true)

      try {
        const response = await fetch(`${BACKEND_URL}/api/mvps/public?${apiQuery}`, {
          cache: 'no-store'
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al obtener MVPs')
        }

        setMvps(data.data || [])
        setTotalCount(data.count || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al obtener MVPs')
        setMvps([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(handle)
  }, [apiQuery, pathname, router, urlQuery])

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleClearFilters = () => {
    router.replace(pathname, { scroll: false })
    setError(null)
    setMvps(initialMvps)
    setTotalCount(0)
    setFilters({
      q: '',
      dealModality: '',
      sector: '',
      sort: 'recent',
      priceMin: '',
      priceMax: '',
      publishedFrom: '',
      publishedTo: '',
      page: 1,
      limit: 24
    })
    setShowAdvancedFilters(false)
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }))
  }

  const renderMvpCard = (mvp: MvpListItem, isGridMode: boolean) => {
    const investorMeeting = meetingByMvp[mvp.id]
    const meetingMeta = investorMeeting ? getInvestorMeetingStatusMeta(investorMeeting.status) : null
    const meetingDateLabel = formatMeetingDateShort(investorMeeting?.scheduled_at)
    const isOwnMvp = mvp.owner_id === userId
    const mediaItems = getMediaItems(mvp)
    const currentIdx = getMediaIndex(mvp.id)
    const currentMedia = mediaItems[currentIdx] || null
    const isCurrentVideo = currentMedia ? isVideoUrl(currentMedia) : false

    return (
      <Card key={mvp.id} className="rounded-2xl">
        <CardContent className="p-4 md:p-5">
          <div className={`grid gap-4 ${!isGridMode ? 'md:grid-cols-[360px_1fr] md:items-stretch' : ''}`}>
            <div className={`relative overflow-hidden rounded-xl ${!isGridMode ? 'min-h-[220px] md:min-h-[270px] md:ml-3' : 'h-[200px]'}`}>
              {currentMedia && !isCurrentVideo && (
                <>
                  <img
                    key={currentMedia}
                    src={currentMedia}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.32), rgba(0,0,0,0.08))' }} />
                </>
              )}
              {currentMedia && isCurrentVideo && (
                <div className="absolute inset-0">
                  <video
                    key={currentMedia}
                    src={currentMedia}
                    preload="metadata"
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Link href={`/mvps/${mvp.id}`} className="flex flex-col items-center gap-2 group">
                      <div className="bg-white/20 hover:bg-white/30 rounded-full p-4 backdrop-blur-sm transition-all group-hover:scale-110">
                        <PlayCircle className="h-12 w-12 text-white" />
                      </div>
                      <span className="text-white/80 text-sm font-medium">Ver video</span>
                    </Link>
                  </div>
                </div>
              )}
              {!currentMedia && (<div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-50 to-background" />)}
              {/* Clickable overlay to navigate to details (below arrows at z-20) */}
              <Link href={`/mvps/${mvp.id}`} className="absolute inset-0 z-10" aria-label={`Ver detalles de ${mvp.title}`} />
              {mediaItems.length > 1 && (
                <>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMediaIndex(mvp.id, currentIdx - 1) }} disabled={currentIdx === 0} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/65 disabled:opacity-0 rounded-full p-1.5 text-white transition-all backdrop-blur-sm"><ChevronLeft className="h-5 w-5" /></button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMediaIndex(mvp.id, currentIdx + 1) }} disabled={currentIdx === mediaItems.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/65 disabled:opacity-0 rounded-full p-1.5 text-white transition-all backdrop-blur-sm"><ChevronRight className="h-5 w-5" /></button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                    {mediaItems.map((_, i) => (<button key={i} type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMediaIndex(mvp.id, i) }} className={`rounded-full transition-all ${i === currentIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`} />))}
                  </div>
                </>
              )}
              {isOwnMvp && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="relative">
                    <div className="bg-green-600 text-white px-4 py-1.5 rounded-lg font-semibold text-sm shadow-lg flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />Tu MVP
                    </div>
                    <div className="absolute -bottom-1 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-green-700 border-r-[8px] border-r-green-700" />
                  </div>
                </div>
              )}
              <div className="relative flex h-full min-h-[220px] flex-col justify-between p-5 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className="w-fit border-brand-200 bg-brand-50/95 text-brand-800">
                      {mvp.category ? (SECTOR_LABEL[mvp.category] ?? mvp.category) : 'Otros'}
                    </Badge>
                  </div>
                  {!isOwnMvp && (
                    <button type="button" onClick={(e) => handleToggleFavorite(mvp.id, e)} className="group flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-background/95 active:scale-95" title={favoriteIds.has(mvp.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                      <Heart className={`h-5 w-5 transition-colors duration-200 ${favoriteIds.has(mvp.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground group-hover:text-red-400'}`} />
                    </button>
                  )}
                </div>
                {!currentMedia && (<p className="max-w-[18ch] text-sm font-medium text-muted-foreground">Agrega portada para destacar este MVP en el marketplace.</p>)}
              </div>
            </div>
            {isGridMode ? (
              /* ── VISTA CUADRÍCULA (vertical) ── */
              <div className="flex flex-col gap-3 p-3">
                {/* Título + vistas/favs */}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold tracking-tight line-clamp-1 flex-1">{mvp.title}</h3>
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{mvp.views_count ?? 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{mvp.favorites_count ?? 0}</span>
                  </div>
                </div>

                {/* One-liner — caja gris, siempre 2 líneas */}
                <div className="rounded-lg border border-border/60 bg-muted/35 px-3 py-2.5 h-[66px] overflow-hidden">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {mvp.one_liner || <span className="italic opacity-50">Sin descripción</span>}
                  </p>
                </div>

                {/* Sección inferior */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border/80 bg-background/70 px-2 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Precio</p><p className="font-semibold text-sm leading-tight truncate">{mvp.price_range || (mvp.price ? `$${mvp.price}` : 'N/D')}</p></div>
                    <div className="rounded-lg border border-border/80 bg-background/70 px-2 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monetización</p><p className="font-semibold text-sm leading-tight truncate">{mvp.monetization_model ? (MONETIZATION_LABEL[mvp.monetization_model] ?? mvp.monetization_model) : 'N/D'}</p></div>
                    <div className="rounded-lg border border-border/80 bg-background/70 px-2 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Oferta</p><p className="font-semibold text-sm leading-tight truncate">{mvp.deal_modality ? (DEAL_MODALITY_LABEL[mvp.deal_modality] ?? mvp.deal_modality) : 'N/D'}</p></div>
                  </div>
                  {meetingMeta ? (
                    <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                        <Badge variant="outline" className={meetingMeta.badgeClassName}>{meetingMeta.label}</Badge>
                        {meetingDateLabel && <span className="text-xs text-muted-foreground">{meetingDateLabel}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-transparent px-3 py-3.5">
                      <p className="text-xs text-muted-foreground/40 italic">Sin reuniones programadas con este MVP</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const url = `${window.location.origin}/mvps/${mvp.id}`; navigator.clipboard.writeText(url).then(() => { setCopiedMvpId(mvp.id); setTimeout(() => setCopiedMvpId(null), 2000) }) }} className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-muted-foreground shadow-sm transition-all duration-200 hover:border-brand-300 hover:text-brand-600 active:scale-95" title="Compartir link">
                      <Share2 className="h-4 w-4" />
                      {copiedMvpId === mvp.id && <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg fade-in-up">¡Link Copiado!</span>}
                    </button>
                    <Link href={`/mvps/${mvp.id}`} className="flex-1">
                      <Button className="w-full text-sm">{meetingMeta?.isActive ? 'Ver estado' : 'Ver detalles'}</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* ── VISTA LISTA (horizontal) ── */
              <div className="flex flex-col p-4 md:p-5 gap-4">
                {/* Título */}
                <h3 className="text-2xl font-bold tracking-tight line-clamp-1">{mvp.title}</h3>

                {/* Descripción breve en caja */}
                {mvp.one_liner && (
                  <div className="rounded-lg border border-border/60 bg-muted/35 px-4 py-3">
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{mvp.one_liner}</p>
                  </div>
                )}

                {/* Empuja stats y botones al fondo */}
                <div className="mt-auto space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2.5"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Precio</p><p className="font-semibold text-lg leading-tight">{mvp.price_range || (mvp.price ? `$${mvp.price}` : 'N/D')}</p></div>
                    <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2.5"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Monetización</p><p className="font-semibold text-base leading-tight truncate">{mvp.monetization_model ? (MONETIZATION_LABEL[mvp.monetization_model] ?? mvp.monetization_model) : 'N/D'}</p></div>
                    <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2.5"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Oferta</p><p className="font-semibold text-base leading-tight">{mvp.deal_modality ? (DEAL_MODALITY_LABEL[mvp.deal_modality] ?? mvp.deal_modality) : 'N/D'}</p></div>
                  </div>

                  {/* Estado reunión (si aplica) */}
                  {meetingMeta && (
                    <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-muted-foreground" />
                        <Badge variant="outline" className={meetingMeta.badgeClassName}>{meetingMeta.label}</Badge>
                        {meetingDateLabel && <span className="text-xs text-muted-foreground">{meetingDateLabel}</span>}
                      </div>
                    </div>
                  )}

                  {/* Botones — vistas/favs izquierda, compartir+detalles derecha */}
                  <div className="flex items-center justify-between pb-1 pr-1">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pl-1">
                      <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" />{mvp.views_count ?? 0}</span>
                      <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" />{mvp.favorites_count ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const url = `${window.location.origin}/mvps/${mvp.id}`; navigator.clipboard.writeText(url).then(() => { setCopiedMvpId(mvp.id); setTimeout(() => setCopiedMvpId(null), 2000) }) }} className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-border/80 bg-background/80 text-muted-foreground shadow-sm transition-all duration-200 hover:border-brand-400 hover:text-brand-600 active:scale-95" title="Compartir link">
                        <Share2 className="h-4 w-4" />
                        {copiedMvpId === mvp.id && <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg fade-in-up">¡Link Copiado!</span>}
                      </button>
                      <Link href={`/mvps/${mvp.id}`}>
                        <Button size="lg" className="w-[220px] text-base font-semibold shadow-md">{meetingMeta?.isActive ? 'Ver estado de mi reunión' : 'Ver detalles'}</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="relative z-40 mb-6 border-border/70 bg-background/80 hover:translate-y-0 overflow-visible">
        <CardContent className="p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <Input
                name="q"
                placeholder="Buscar por titulo o one-liner"
                value={filters.q}
                onChange={(event) => handleFilterChange('q', event.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <select
                name="deal_modality"
                value={filters.dealModality}
                onChange={(event) => handleFilterChange('dealModality', event.target.value)}
                className="border-input h-9 w-full rounded-lg border bg-background/85 pl-3 pr-8 py-1 text-sm shadow-xs transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:border-brand-300 focus:bg-background focus:outline-none focus:ring-[3px] focus:ring-brand-300/45"
              >
                <option value="">Todas las modalidades</option>
                <option value="sale">Sale</option>
                <option value="equity">Equity</option>
                <option value="license">Licencia</option>
                <option value="rev_share">Rev_Share</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                name="sort"
                value={filters.sort}
                onChange={(event) => handleFilterChange('sort', event.target.value)}
                className="border-input h-9 w-full rounded-lg border bg-background/85 pl-3 pr-8 py-1 text-sm shadow-xs transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:border-brand-300 focus:bg-background focus:outline-none focus:ring-[3px] focus:ring-brand-300/45"
              >
                <option value="recent">Mas recientes</option>
                <option value="oldest">Mas antiguos</option>
                <option value="price_low">Precio mas bajo</option>
                <option value="price_high">Precio mas alto</option>
                <option value="most_views">Más vistos</option>
                <option value="most_favorites">Más favoritos</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={showFavoritesOnly ? 'default' : 'outline'}
                size="icon"
                onClick={() => setShowFavoritesOnly(prev => !prev)}
                title={showFavoritesOnly ? 'Mostrar todos' : 'Solo favoritos'}
              >
                <Heart className={`h-3.5 w-3.5 transition-colors ${showFavoritesOnly ? 'fill-white text-white' : ''}`} />
              </Button>
              <Button
                type="button"
                variant={showAdvancedFilters ? 'secondary' : 'outline'}
                className="gap-1.5 min-w-[44px]"
                onClick={() => setShowAdvancedFilters(prev => !prev)}
                aria-expanded={showAdvancedFilters}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {advancedFilterCount > 0 && (
                  <span className="text-xs font-semibold">{advancedFilterCount}</span>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {showAdvancedFilters
                ? 'Filtros avanzados visibles'
                : 'Vista compacta. Abre filtros avanzados si necesitas más precisión.'}
            </span>
            {hasNonDefaultFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="font-medium text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {showAdvancedFilters && (
            <div className="mt-3 grid gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3 md:grid-cols-4 fade-in-up">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Sector</label>
                <select
                  value={filters.sector}
                  onChange={(e) => handleFilterChange('sector', e.target.value)}
                  className="border-input mt-1 h-9 w-full rounded-lg border bg-background/85 pl-3 pr-8 py-1 text-sm shadow-xs transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:border-brand-300 focus:bg-background focus:outline-none focus:ring-[3px] focus:ring-brand-300/45"
                >
                  <option value="">Todos los sectores</option>
                  {SECTOR_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Ordenar por actividad</label>
                <select
                  value={['most_views', 'most_favorites'].includes(filters.sort) ? filters.sort : ''}
                  onChange={(e) => handleFilterChange('sort', e.target.value || 'recent')}
                  className="border-input mt-1 h-9 w-full rounded-lg border bg-background/85 pl-3 pr-8 py-1 text-sm shadow-xs transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:border-brand-300 focus:bg-background focus:outline-none focus:ring-[3px] focus:ring-brand-300/45"
                >
                  <option value="">Sin filtro</option>
                  <option value="most_views">Más vistos</option>
                  <option value="most_favorites">Más favoritos</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Precio min</label>
                <Input
                  name="price_min"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={(event) => handleFilterChange('priceMin', event.target.value)}
                  className={
                    filters.priceMin && filters.priceMax &&
                    Number(filters.priceMin) >= Number(filters.priceMax)
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }
                />
                {filters.priceMin && filters.priceMax && Number(filters.priceMin) >= Number(filters.priceMax) && (
                  <p className="text-xs text-destructive mt-1">Debe ser menor que el precio máximo</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Precio max</label>
                <Input
                  name="price_max"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="10000"
                  value={filters.priceMax}
                  onChange={(event) => handleFilterChange('priceMax', event.target.value)}
                  className={
                    filters.priceMin && filters.priceMax &&
                    Number(filters.priceMax) <= Number(filters.priceMin)
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }
                />
                {filters.priceMin && filters.priceMax && Number(filters.priceMax) <= Number(filters.priceMin) && (
                  <p className="text-xs text-destructive mt-1">Debe ser mayor que el precio mínimo</p>
                )}
              </div>

              <DateFilterField
                label="Publicado desde"
                value={filters.publishedFrom}
                onChange={(value) => handleFilterChange('publishedFrom', value)}
                disabled={filters.publishedTo ? (date) => date > (parseDateValue(filters.publishedTo) as Date) : undefined}
              />

              <DateFilterField
                label="Publicado hasta"
                value={filters.publishedTo}
                onChange={(value) => handleFilterChange('publishedTo', value)}
                disabled={filters.publishedFrom ? (date) => date < (parseDateValue(filters.publishedFrom) as Date) : undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Control bar: Ver por sectores + view toggles */}
      <div className="flex items-center justify-between gap-3 mb-6 mt-1">
        <button
          type="button"
          onClick={() => setGroupBySector(prev => !prev)}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
            groupBySector
              ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
              : 'border-border bg-background text-muted-foreground hover:border-brand-300 hover:text-foreground'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Ver por sectores
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-lg p-2 transition-colors ${viewMode === 'list' ? 'bg-brand-100 text-brand-700' : 'text-muted-foreground hover:bg-muted/60'}`}
            title="Vista lista"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-lg p-2 transition-colors ${viewMode === 'grid' ? 'bg-brand-100 text-brand-700' : 'text-muted-foreground hover:bg-muted/60'}`}
            title="Vista cuadrícula"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="relative z-0 py-2">
          <div className="mb-4 flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Cargando MVPs...</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/80 bg-card/90 p-5"
              >
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="mb-3 h-5 w-4/5" />
                <Skeleton className="mb-4 h-4 w-full" />
                <Skeleton className="mb-5 h-4 w-3/4" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        mvps.length === 0 ? (
          <div className="relative z-0 rounded-2xl border-2 border-dashed border-brand-200 p-12 text-center brand-surface">
            <p className="text-muted-foreground text-lg">
              Aun no hay MVPs aprobados para mostrar.
            </p>
          </div>
        ) : sectorGroups ? (
          /* Vista agrupada por sector */
          <div className="relative z-0 space-y-10">
            {sectorGroups.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-brand-200 p-12 text-center brand-surface">
                <p className="text-muted-foreground text-lg">No hay MVPs en este sector todavía.</p>
              </div>
            ) : sectorGroups.map(group => {
              const SectorIcon = group.Icon
              return (
                <div key={group.value}>
                  <div className="flex items-center gap-3 mb-5">
                    <SectorIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <h2 className="text-xl font-bold tracking-tight">{group.label}</h2>
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-sm text-muted-foreground shrink-0">
                      {group.mvps.length} MVP{group.mvps.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}>
                    {group.mvps.map(mvp => renderMvpCard(mvp, viewMode === 'grid'))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Vista plana (lista o cuadrícula) */
          <div className={`relative z-0 grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}>
            {displayedMvps.map(mvp => renderMvpCard(mvp, viewMode === 'grid'))}
          </div>
        )
      )}

      {/* Pagination */}
      {totalCount > filters.limit && (
        <div className="mt-8 flex flex-col gap-3 rounded-xl border border-border/80 bg-card/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((filters.page - 1) * filters.limit) + 1} - {Math.min(filters.page * filters.limit, totalCount)} de {totalCount} resultados
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page <= 1 || loading}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {filters.page} de {Math.ceil(totalCount / filters.limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= Math.ceil(totalCount / filters.limit) || loading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Video modal */}
      {videoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setVideoModal(null)}
        >
          <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setVideoModal(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors"
            >
              <X className="h-7 w-7" />
            </button>
            <video
              src={videoModal}
              controls
              autoPlay
              className="w-full rounded-xl max-h-[80vh] bg-black"
            />
          </div>
        </div>
      )}
    </>
  )
}
