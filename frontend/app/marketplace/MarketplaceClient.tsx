'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarClock, CalendarDays, Eye, Heart, Share2, SlidersHorizontal } from 'lucide-react'
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
  sort: 'recent' | 'oldest' | 'price_low' | 'price_high'
  priceMin: string
  priceMax: string
  publishedFrom: string
  publishedTo: string
  page: number
  limit: number
}

type MvpListItem = {
  id: string
  title: string
  one_liner?: string | null
  category?: string | null
  cover_image_url?: string | null
  images_urls?: string[] | null
  deal_modality?: string | null
  price_range?: string | null
  price?: number | null
  status?: string | null
  views_count?: number | null
  competitive_differentials?: string[] | null
}

type MarketplaceClientProps = {
  initialMvps: MvpListItem[]
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

  if (q) params.set('q', q)
  if (dealModality) params.set('deal_modality', dealModality)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.priceMin) params.set('price_min', filters.priceMin)
  if (filters.priceMax) params.set('price_max', filters.priceMax)
  if (filters.publishedFrom) params.set('published_from', filters.publishedFrom)
  if (filters.publishedTo) params.set('published_to', filters.publishedTo)
  if (filters.page > 1) params.set('offset', ((filters.page - 1) * filters.limit).toString())
  if (filters.limit !== 24) params.set('limit', filters.limit.toString())

  return params
}

function buildUrlParams(filters: FilterState) {
  const params = new URLSearchParams()

  const q = filters.q?.trim() || ''
  const dealModality = filters.dealModality?.trim() || ''

  if (q) params.set('q', q)
  if (dealModality) params.set('deal_modality', dealModality)
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

export function MarketplaceClient({ initialMvps, initialFilters }: MarketplaceClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    () => Boolean(initialFilters.priceMin || initialFilters.priceMax || initialFilters.publishedFrom || initialFilters.publishedTo)
  )
  const [filters, setFilters] = useState<FilterState>({
    q: initialFilters.q || '',
    dealModality: initialFilters.dealModality || '',
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
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [meetingByMvp, setMeetingByMvp] = useState<Record<string, Meeting>>({})
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [copiedMvpId, setCopiedMvpId] = useState<string | null>(null)
  const isFirstLoad = useRef(true)

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
                className="border-input h-9 w-full rounded-lg border bg-background/85 px-3 py-1 text-sm shadow-xs transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:border-brand-300 focus:bg-background focus:outline-none focus:ring-[3px] focus:ring-brand-300/45"
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
                className="border-input h-9 w-full rounded-lg border bg-background/85 px-3 py-1 text-sm shadow-xs transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:border-brand-300 focus:bg-background focus:outline-none focus:ring-[3px] focus:ring-brand-300/45"
              >
                <option value="recent">Mas recientes</option>
                <option value="oldest">Mas antiguos</option>
                <option value="price_low">Precio mas bajo</option>
                <option value="price_high">Precio mas alto</option>
              </select>
            </div>

            <div className="flex gap-2 md:col-span-1">
              <Button
                type="button"
                variant={showFavoritesOnly ? 'default' : 'outline'}
                className="gap-1.5"
                onClick={() => setShowFavoritesOnly(prev => !prev)}
                title={showFavoritesOnly ? 'Mostrar todos' : 'Solo favoritos'}
              >
                <Heart className={`h-3.5 w-3.5 transition-colors ${showFavoritesOnly ? 'fill-white text-white' : ''}`} />
              </Button>
              <Button
                type="button"
                variant={showAdvancedFilters ? 'secondary' : 'outline'}
                className="gap-1.5"
                onClick={() => setShowAdvancedFilters(prev => !prev)}
                aria-expanded={showAdvancedFilters}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {advancedFilterCount > 0 ? String(advancedFilterCount) : ''}
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
                />
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
                />
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
        ) : (
          <div className="relative z-0 grid gap-6">
            {displayedMvps.map((mvp) => {
              const investorMeeting = meetingByMvp[mvp.id]
              const meetingMeta = investorMeeting
                ? getInvestorMeetingStatusMeta(investorMeeting.status)
                : null
              const meetingDateLabel = formatMeetingDateShort(investorMeeting?.scheduled_at)
              const previewImage = mvp.cover_image_url || mvp.images_urls?.[0] || null

              return (
                <Card key={mvp.id} className="rounded-2xl">
                  <CardContent className="p-4 md:p-5">
                    <div className="grid gap-4 md:grid-cols-[360px_1fr] md:items-stretch">
                      <div className="relative min-h-[220px] md:h-[270px] md:min-h-[270px] overflow-hidden rounded-xl">
                        <div
                          className="absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-50 to-background"
                          style={
                            previewImage
                              ? {
                                backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.32), rgba(0,0,0,0.08)), url(${previewImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }
                              : undefined
                          }
                        />
                        <div className="relative flex h-full min-h-[220px] flex-col justify-between p-5 md:p-6">
                          <div className="flex items-start justify-between">
                            <Badge
                              variant="outline"
                              className="w-fit border-brand-200 bg-brand-50/95 text-brand-800"
                            >
                              {mvp.category || 'Sin categoria'}
                            </Badge>
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(mvp.id, e)}
                              className="group flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-background/95 active:scale-95"
                              title={favoriteIds.has(mvp.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                            >
                              <Heart
                                className={`h-5 w-5 transition-colors duration-200 ${favoriteIds.has(mvp.id)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-muted-foreground group-hover:text-red-400'
                                  }`}
                              />
                            </button>
                          </div>
                          {!previewImage && (
                            <p className="max-w-[18ch] text-sm font-medium text-muted-foreground">
                              Agrega portada para destacar este MVP en el marketplace.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 p-3 md:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-2xl font-bold tracking-tight line-clamp-1">{mvp.title}</h3>
                            {mvp.one_liner && (
                              <p className="mt-2 text-base text-muted-foreground line-clamp-2 leading-relaxed">{mvp.one_liner}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Precio</p>
                            <p className="font-semibold text-lg leading-tight">{mvp.price_range || (mvp.price ? `$${mvp.price}` : 'N/D')}</p>
                          </div>
                          <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estado</p>
                            <p className="font-semibold text-primary capitalize leading-tight">{mvp.status}</p>
                          </div>
                          <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vistas</p>
                            <p className="font-semibold flex items-center gap-1 leading-tight">
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              {mvp.views_count ?? 0}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Oferta</p>
                            <p className="font-semibold leading-tight capitalize">{mvp.deal_modality || 'N/D'}</p>
                          </div>
                        </div>

                        {meetingMeta && (
                          <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <CalendarClock className="w-4 h-4 text-muted-foreground" />
                              <Badge variant="outline" className={meetingMeta.badgeClassName}>
                                {meetingMeta.label}
                              </Badge>
                              {meetingDateLabel && (
                                <span className="text-xs text-muted-foreground">
                                  {meetingDateLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const url = `${window.location.origin}/mvps/${mvp.id}`
                              navigator.clipboard.writeText(url).then(() => {
                                setCopiedMvpId(mvp.id)
                                setTimeout(() => setCopiedMvpId(null), 2000)
                              })
                            }}
                            className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-muted-foreground shadow-sm transition-all duration-200 hover:border-brand-300 hover:text-brand-600 active:scale-95"
                            title="Compartir link"
                          >
                            <Share2 className="h-4 w-4" />
                            {copiedMvpId === mvp.id && (
                              <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg fade-in-up">
                                Link copiado!
                              </span>
                            )}
                          </button>
                          <Link href={`/mvps/${mvp.id}`} className="w-full sm:w-auto">
                            <Button className="w-full sm:w-[220px]">
                              {meetingMeta?.isActive ? 'Ver estado de mi reunión' : 'Ver detalles'}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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
    </>
  )
}
