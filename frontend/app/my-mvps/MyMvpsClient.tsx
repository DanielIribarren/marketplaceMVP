'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, Rocket, Heart, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

type MvpItem = {
  id: string
  title: string
  one_liner?: string | null
  category?: string | null
  cover_image_url?: string | null
  images_urls?: string[] | null
  status?: string | null
  views_count?: number | null
  favorites_count?: number | null
  created_at?: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-700 border-green-300' },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700 border-red-300' },
}

export function MyMvpsClient({ userId }: { userId: string }) {
  const [mvps, setMvps] = useState<MvpItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMyMvps = async () => {
      try {
        setLoading(true)
        setError(null)

        // Primero obtener drafts
        const draftResponse = await fetch(`${BACKEND_URL}/api/mvps/my-drafts`, {
          credentials: 'include',
        })

        if (!draftResponse.ok) {
          throw new Error('Error al cargar tus MVPs')
        }

        const draftData = await draftResponse.json()
        const allMvps = draftData.data || []

        // Ordenar por fecha de creación (más reciente primero)
        allMvps.sort((a: MvpItem, b: MvpItem) => {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateB - dateA
        })

        setMvps(allMvps)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    void fetchMyMvps()
  }, [userId])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="brand-surface border border-brand-100/90 rounded-2xl p-6 mb-8 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 orange-grid opacity-[0.14]" />
        <div className="relative flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tus MVPs</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona y visualiza todos los MVPs que has creado.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/publish">
              <Button size="lg" className="gap-2">
                <Rocket className="w-4 h-4" />
                Publicar MVP
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-4 md:p-5">
                <div className="grid gap-4 md:grid-cols-[360px_1fr]">
                  <Skeleton className="h-[220px] md:h-[270px] rounded-xl" />
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && mvps.length === 0 && (
        <div className="text-center py-16">
          <div className="mb-6">
            <Rocket className="w-20 h-20 mx-auto text-brand-200" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            ¡No tienes creado ningún MVP!
          </h2>
          <p className="text-muted-foreground mb-6">
            Crea tu primer MVP y empieza a recibir ofertas de inversores.
          </p>
          <Link href="/publish">
            <Button size="lg" className="gap-2">
              <Rocket className="w-4 h-4" />
              Publicar MVP
            </Button>
          </Link>
        </div>
      )}

      {/* MVPs Grid */}
      {!loading && mvps.length > 0 && (
        <div className="space-y-4">
          {mvps.map((mvp) => {
            const statusInfo = STATUS_LABELS[mvp.status || 'draft'] || STATUS_LABELS.draft
            const previewImage = mvp.cover_image_url || mvp.images_urls?.[0] || null
            const isDraft = mvp.status === 'draft'

            return (
              <Card key={mvp.id} className="rounded-2xl hover:shadow-lg transition-shadow">
                <CardContent className="p-4 md:p-5">
                  <div className="grid gap-4 md:grid-cols-[360px_1fr] md:items-stretch">
                    {/* Image */}
                    <div className="relative min-h-[220px] md:h-[270px] md:min-h-[270px] overflow-hidden rounded-xl">
                      <div
                        className="absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-50 to-background"
                        style={
                          previewImage
                            ? {
                                backgroundImage: `url(${previewImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }
                            : {}
                        }
                      />
                      {!previewImage && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Rocket className="w-16 h-16 text-brand-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${statusInfo.color} border font-semibold`}>
                              {statusInfo.label}
                            </Badge>
                            {mvp.category && (
                              <Badge variant="outline" className="font-normal">
                                {mvp.category}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-foreground line-clamp-2">
                            {mvp.title}
                          </h3>
                        </div>
                      </div>

                      {mvp.one_liner && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {mvp.one_liner}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{mvp.views_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{mvp.favorites_count || 0}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        {isDraft ? (
                          <Link href="/publish" className="flex-1">
                            <Button variant="outline" className="w-full gap-2">
                              <Edit3 className="w-4 h-4" />
                              Continuar editando
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/mvps/${mvp.id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              Ver detalles
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
