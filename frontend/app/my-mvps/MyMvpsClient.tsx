'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Eye, Rocket, Heart, Edit3, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

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
  pending_review: { label: 'En revisión', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-700 border-green-300' },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700 border-red-300' },
}

type StatusFilter = 'all' | 'draft' | 'pending' | 'approved' | 'rejected'

export function MyMvpsClient({ initialMvps, isAdmin = false }: { initialMvps: MvpItem[]; isAdmin?: boolean }) {
  const [mvps, setMvps] = useState<MvpItem[]>(initialMvps)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteDraft = async (id: string) => {
    setDeletingId(id)
    setDeleteError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('No autenticado')

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
      const res = await fetch(`${backendUrl}/api/mvps/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'No se pudo eliminar el borrador')
      }

      setMvps(prev => prev.filter(m => m.id !== id))
      setConfirmDeleteId(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  // Contadores por estado
  const counts = useMemo(() => {
    return {
      all: mvps.length,
      draft: mvps.filter(m => m.status === 'draft').length,
      pending: mvps.filter(m => m.status === 'pending' || m.status === 'pending_review').length,
      approved: mvps.filter(m => m.status === 'approved').length,
      rejected: mvps.filter(m => m.status === 'rejected').length,
    }
  }, [mvps])

  // MVPs filtrados
  const filteredMvps = useMemo(() => {
    if (statusFilter === 'all') return mvps
    if (statusFilter === 'pending') return mvps.filter(m => m.status === 'pending' || m.status === 'pending_review')
    return mvps.filter(m => m.status === statusFilter)
  }, [mvps, statusFilter])

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
            <Link href="/publish?from=my-mvps">
              <Button size="lg" className="gap-2">
                <Rocket className="w-4 h-4" />
                {isAdmin ? 'Publicar de prueba' : 'Publicar MVP'}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs de filtro por estado */}
      {mvps.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos {counts.all > 0 && `(${counts.all})`}
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendientes {counts.pending > 0 && `(${counts.pending})`}
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'approved'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Aprobados {counts.approved > 0 && `(${counts.approved})`}
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rechazados {counts.rejected > 0 && `(${counts.rejected})`}
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'draft'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Borradores {counts.draft > 0 && `(${counts.draft})`}
          </button>
        </div>
      )}

      {/* Empty State */}
      {mvps.length === 0 && (
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

      {/* Empty state cuando el filtro no tiene resultados */}
      {mvps.length > 0 && filteredMvps.length === 0 && (
        <div className="text-center py-16">
          <div className="mb-6">
            <Rocket className="w-20 h-20 mx-auto text-brand-200" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            No tienes MVPs en esta categoría
          </h2>
          <p className="text-muted-foreground mb-6">
            Selecciona otra categoría o crea un nuevo MVP.
          </p>
        </div>
      )}

      {/* MVPs Grid */}
      {filteredMvps.length > 0 && (
        <div className="space-y-4">
          {filteredMvps.map((mvp) => {
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
                            {mvp.title || <span className="text-muted-foreground italic">Sin título</span>}
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
                          <>
                            <Link href={`/publish?draft=${mvp.id}&from=my-mvps`} className="flex-1">
                              <Button variant="outline" className="w-full gap-2">
                                <Edit3 className="w-4 h-4" />
                                Continuar editando
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => { setDeleteError(null); setConfirmDeleteId(mvp.id) }}
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 shrink-0"
                              title="Eliminar borrador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
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

      {/* Delete draft confirmation dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              ¿Eliminar borrador?
            </DialogTitle>
            <DialogDescription className="pt-2">
              Esta acción es permanente. El borrador y todos sus datos serán eliminados y no podrás recuperarlos.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-rose-600">{deleteError}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              disabled={!!deletingId}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && handleDeleteDraft(confirmDeleteId)}
              disabled={!!deletingId}
            >
              {deletingId ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</>
              ) : (
                'Sí, eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
