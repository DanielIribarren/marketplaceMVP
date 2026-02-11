'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

type FilterState = {
  q: string
  dealModality: string
  sort: 'recent' | 'oldest' | 'price_low' | 'price_high'
  priceMin: string
  priceMax: string
  publishedFrom: string
  publishedTo: string
}

type MvpListItem = {
  id: string
  title: string
  one_liner?: string | null
  category?: string | null
  deal_modality?: string | null
  price_range?: string | null
  price?: number | null
  status?: string | null
  competitive_differentials?: string[] | null
}

type MarketplaceClientProps = {
  initialMvps: MvpListItem[]
  initialFilters: FilterState
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

  return params
}

export function MarketplaceClient({ initialMvps, initialFilters }: MarketplaceClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [filters, setFilters] = useState<FilterState>({
    q: initialFilters.q || '',
    dealModality: initialFilters.dealModality || '',
    sort: initialFilters.sort || 'recent',
    priceMin: initialFilters.priceMin || '',
    priceMax: initialFilters.priceMax || '',
    publishedFrom: initialFilters.publishedFrom || '',
    publishedTo: initialFilters.publishedTo || ''
  })
  const [mvps, setMvps] = useState<MvpListItem[]>(initialMvps)
  const [error, setError] = useState<string | null>(null)
  const isFirstLoad = useRef(true)

  const apiQuery = useMemo(() => buildApiParams(filters).toString(), [filters])
  const urlQuery = useMemo(() => buildUrlParams(filters).toString(), [filters])

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }

    const handle = setTimeout(async () => {
      router.replace(urlQuery ? `${pathname}?${urlQuery}` : pathname, { scroll: false })

      setError(null)

      try {
        const response = await fetch(`${BACKEND_URL}/api/mvps/public?${apiQuery}`, {
          cache: 'no-store'
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al obtener MVPs')
        }

        setMvps(data.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al obtener MVPs')
        setMvps([])
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
    setFilters({
      q: '',
      dealModality: '',
      sort: 'recent',
      priceMin: '',
      priceMax: '',
      publishedFrom: '',
      publishedTo: ''
    })
  }

  return (
    <>
      <Card className="border-2 mb-8">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                name="q"
                placeholder="Buscar por titulo o one-liner"
                value={filters.q}
                onChange={(event) => handleFilterChange('q', event.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Modalidad</label>
              <select
                name="deal_modality"
                value={filters.dealModality}
                onChange={(event) => handleFilterChange('dealModality', event.target.value)}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Todas</option>
                <option value="sale">Sale</option>
                <option value="equity">Equity</option>
                <option value="license">Licencia</option>
                <option value="rev_share">Rev_Share</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Ordenar</label>
              <select
                name="sort"
                value={filters.sort}
                onChange={(event) => handleFilterChange('sort', event.target.value)}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              >
                <option value="recent">Mas recientes</option>
                <option value="oldest">Mas antiguos</option>
                <option value="price_low">Precio mas bajo</option>
                <option value="price_high">Precio mas alto</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Precio min</label>
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
              <label className="text-sm font-medium">Precio max</label>
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

            <div>
              <label className="text-sm font-medium">Publicado desde</label>
              <Input
                name="published_from"
                type="date"
                value={filters.publishedFrom}
                onChange={(event) => handleFilterChange('publishedFrom', event.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Publicado hasta</label>
              <Input
                name="published_to"
                type="date"
                value={filters.publishedTo}
                onChange={(event) => handleFilterChange('publishedTo', event.target.value)}
              />
            </div>

            <div className="flex items-end lg:col-span-2">
              <Button type="button" variant="outline" className="w-full" onClick={handleClearFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="text-sm text-red-600 mb-4">{error}</div>
      )}

      {mvps.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">
            Aun no hay MVPs aprobados para mostrar.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mvps.map((mvp) => {
            return (
              <Card key={mvp.id} className="border-2 hover:border-primary transition-colors">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{mvp.category || 'Sin categoria'}</p>
                      <h3 className="text-lg font-semibold">{mvp.title}</h3>
                      {mvp.one_liner && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{mvp.one_liner}</p>
                      )}
                    </div>
                    {mvp.deal_modality && (
                      <Badge className="h-fit">{mvp.deal_modality}</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Precio</p>
                      <p className="font-semibold">{mvp.price_range || (mvp.price ? `$${mvp.price}` : 'N/D')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estado</p>
                      <p className="font-semibold text-green-600">{mvp.status}</p>
                    </div>
                  </div>

                  <Link href={`/mvps/${mvp.id}`}>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      Ver detalles
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
