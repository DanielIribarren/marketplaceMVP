'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Eye, Rocket, Heart, Edit3, Trash2, AlertTriangle, Loader2, MessageSquareWarning,
  FileText, LinkIcon, DollarSign, CheckSquare, Image as ImageIcon, Tag, Lightbulb,
  TrendingUp, Clock, CheckCircle2, XCircle, PlayCircle, ChevronLeft, ChevronRight, ArrowRight, ImagePlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

type FullMvpData = {
  id: string
  title?: string | null
  one_liner?: string | null
  category?: string | null
  cover_image_url?: string | null
  images_urls?: string[] | null
  status?: string | null
  description?: string | null
  demo_url?: string | null
  monetization_model?: string | null
  deal_modality?: string | null
  price_range?: string | null
  minimal_evidence?: string | null
  competitive_differentials?: string[] | null
  transfer_checklist?: Record<string, boolean> | null
}

const DEAL_LABELS: Record<string, string> = {
  sale: 'Venta directa',
  equity: 'Equity',
  license: 'Licencia',
  rev_share: 'Revenue Share',
}
const MONETIZATION_LABELS: Record<string, string> = {
  saas_monthly: 'SaaS mensual',
  one_time_license: 'Licencia única',
  transactional: 'Transaccional',
  advertising: 'Publicidad',
  to_define: 'Por definir',
}
const CHECKLIST_LABELS: Record<string, string> = {
  codeAndDocs: 'Código + Documentación',
  domainOrLanding: 'Dominio / Landing',
  integrationAccounts: 'Cuentas de integración',
  ownIp: 'IP propia; sin terceros',
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|avi|mkv|ogv)(\?.*)?$/i.test(url)
}

type MvpItem = {
  id: string
  title: string
  one_liner?: string | null
  category?: string | null
  cover_image_url?: string | null
  images_urls?: string[] | null
  status?: string | null
  rejection_reason?: string | null
  views_count?: number | null
  favorites_count?: number | null
  created_at?: string
  price_range?: string | null
  monetization_model?: string | null
  deal_modality?: string | null
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
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false)
  const [rejectionDialogData, setRejectionDialogData] = useState<{ id: string; title: string; reason: string | null } | null>(null)
  const [previewData, setPreviewData] = useState<FullMvpData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({})

  const getImgIdx = (id: string) => imageIndexes[id] ?? 0
  const setImgIdx = (id: string, idx: number) => setImageIndexes(prev => ({ ...prev, [id]: idx }))

  const openPreview = async (id: string) => {
    setPreviewLoading(true)
    setPreviewData(null)
    const supabase = createClient()
    const { data } = await supabase.from('mvps').select('*').eq('id', id).single()
    setPreviewData(data as FullMvpData ?? { id })
    setPreviewLoading(false)
  }

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
            const isDraft = mvp.status === 'draft'

            return (() => {
              const allImages = [
                ...(mvp.cover_image_url ? [mvp.cover_image_url] : []),
                ...(mvp.images_urls?.filter(u => u && u !== mvp.cover_image_url) ?? []),
              ]
              const imgIdx = getImgIdx(mvp.id)
              const clampedIdx = Math.min(imgIdx, Math.max(0, allImages.length - 1))

              return (
                <Card key={mvp.id} className="rounded-2xl hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 pl-5 md:p-5 md:pl-6">
                    <div className="flex gap-5 md:gap-6 items-stretch">

                      {/* ── Media panel — gradient border wrapper ── */}
                      <div
                        className="shrink-0 rounded-[14px]"
                        style={{ padding: '2.5px', background: 'conic-gradient(from 0deg at 50% 50%, #ea580c, #f97316, #fb923c, #fdba74, #fb923c, #f97316, #ea580c)' }}
                      >
                      <div className="relative w-[220px] md:w-[240px] h-[172px] overflow-hidden rounded-[12px] bg-muted">
                        {allImages.length === 0 ? (
                          /* Empty state */
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3" style={{ background: 'linear-gradient(135deg, #fffaf7 0%, #fff5ec 50%, #ffeedd 100%)' }}>
                            <ImagePlus className="w-12 h-12 text-orange-300" />
                            <p className="text-[11.5px] text-center text-orange-600/80 leading-tight font-medium">
                              ¡Agrega tu primer archivo multimedia!
                            </p>
                          </div>
                        ) : allImages.length === 1 ? (
                          /* Single image — fixed */
                          isVideo(allImages[0]) ? (
                            <video src={allImages[0]} className="absolute inset-0 w-full h-full object-cover" muted />
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={allImages[0]} alt="portada" className="absolute inset-0 w-full h-full object-cover" />
                          )
                        ) : (
                          /* Carousel */
                          <>
                            {isVideo(allImages[clampedIdx]) ? (
                              <video src={allImages[clampedIdx]} className="absolute inset-0 w-full h-full object-cover" muted />
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={allImages[clampedIdx]} alt={`imagen ${clampedIdx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                            )}
                            {/* Prev */}
                            {clampedIdx > 0 && (
                              <button
                                type="button"
                                onClick={() => setImgIdx(mvp.id, clampedIdx - 1)}
                                className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                              >
                                <ChevronLeft className="w-3.5 h-3.5 text-white" />
                              </button>
                            )}
                            {/* Next */}
                            {clampedIdx < allImages.length - 1 && (
                              <button
                                type="button"
                                onClick={() => setImgIdx(mvp.id, clampedIdx + 1)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                              >
                                <ChevronRight className="w-3.5 h-3.5 text-white" />
                              </button>
                            )}
                            {/* Dots */}
                            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                              {allImages.map((_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setImgIdx(mvp.id, i)}
                                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === clampedIdx ? 'bg-white' : 'bg-white/40'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      </div>{/* end gradient border wrapper */}

                      {/* ── Content panel ── */}
                      <div className="flex flex-col flex-1 min-w-0 py-1">

                        {/* Row 1: badge + title on left, stats on right */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge className={`${statusInfo.color} border font-semibold text-[11px] px-2 py-0 shrink-0`}>
                              {statusInfo.label}
                            </Badge>
                            <h3 className="text-lg font-bold text-foreground line-clamp-1 leading-snug">
                              {mvp.title || <span className="text-muted-foreground italic">Sin título</span>}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground shrink-0">
                            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{mvp.views_count || 0}</span>
                            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{mvp.favorites_count || 0}</span>
                          </div>
                        </div>

                        {/* Row 2: one-liner labeled */}
                        <div className="flex items-center gap-2.5 mb-0.5 text-sm text-muted-foreground">
                          <span className="font-semibold uppercase tracking-wide text-[11px] text-muted-foreground/60 shrink-0">One-liner</span>
                          {mvp.one_liner
                            ? <span className="line-clamp-1">{mvp.one_liner}</span>
                            : <span className="italic text-muted-foreground/50">Sin rellenar</span>
                          }
                        </div>

                        {/* Row 3: Info boxes — label + value on same line */}
                        <div className="flex gap-2 mt-auto mb-6">
                          {[
                            { label: 'Precio', value: mvp.price_range },
                            { label: 'Monetización', value: mvp.monetization_model ? (MONETIZATION_LABELS[mvp.monetization_model] ?? mvp.monetization_model) : null },
                            { label: 'Oferta', value: mvp.deal_modality ? (DEAL_LABELS[mvp.deal_modality] ?? mvp.deal_modality) : null },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex-1 min-w-0 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 flex items-center gap-2">
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">{label}</p>
                              {value
                                ? <p className="text-[13px] font-medium text-foreground truncate">{value}</p>
                                : <p className="text-[13px] italic text-muted-foreground/50">Sin rellenar</p>
                              }
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {isDraft ? (
                            <>
                              <Link href={`/publish?draft=${mvp.id}&from=my-mvps`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full gap-1.5 text-[13px] h-8">
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Continuar editando
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => { setDeleteError(null); setConfirmDeleteId(mvp.id) }}
                                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 shrink-0 h-8 w-8"
                                title="Eliminar borrador"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : mvp.status === 'rejected' ? (
                            <>
                              <Link href={`/publish?draft=${mvp.id}&from=my-mvps`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full gap-1.5 text-[13px] h-8 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400">
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Volver a editar
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 h-8 w-8"
                                title="Ver razón de rechazo"
                                onClick={() => { setRejectionDialogData({ id: mvp.id, title: mvp.title, reason: mvp.rejection_reason ?? null }); setRejectionDialogOpen(true) }}
                              >
                                <MessageSquareWarning className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (mvp.status === 'pending' || mvp.status === 'pending_review') ? (
                            <Button variant="outline" size="sm" className="w-full gap-1.5 text-[13px] h-8" onClick={() => openPreview(mvp.id)}>
                              <Eye className="w-3.5 h-3.5" />
                              Ver vista previa
                            </Button>
                          ) : (
                            <Link href={`/mvps/${mvp.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full text-[13px] h-8 gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
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
            })()
          })}
        </div>
      )}

      {/* Preview dialog for pending MVPs */}
      <Dialog open={previewLoading || !!previewData} onOpenChange={(open) => { if (!open) { setPreviewData(null) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span className="truncate">{previewData?.title || 'Vista previa del MVP'}</span>
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 border font-semibold shrink-0">En revisión</Badge>
            </DialogTitle>
          </DialogHeader>

          {previewLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
            </div>
          )}

          {previewData && !previewLoading && (
            <div className="space-y-5">
              {/* Cover image */}
              {previewData.cover_image_url && (
                <div className="overflow-hidden rounded-xl border border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewData.cover_image_url} alt="Portada" className="w-full h-48 object-cover" />
                </div>
              )}

              {/* One-liner + sector */}
              <div className="space-y-2">
                {previewData.one_liner && (
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-foreground">{previewData.one_liner}</p>
                  </div>
                )}
                {previewData.category && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground capitalize">{previewData.category}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {previewData.description && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descripción</p>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{previewData.description}</p>
                </div>
              )}

              {/* Demo URL */}
              {previewData.demo_url && (
                <div className="border-t pt-4 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-brand-500 shrink-0" />
                  <a href={previewData.demo_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate">
                    {previewData.demo_url}
                  </a>
                </div>
              )}

              {/* Screenshots */}
              {previewData.images_urls && previewData.images_urls.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-4 h-4 text-brand-500 shrink-0" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Imágenes y videos ({previewData.images_urls.length})
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {previewData.images_urls.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                        {isVideo(url) ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                            <PlayCircle className="h-7 w-7 text-white" />
                            <span className="text-xs text-white/70 mt-1">Video</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deal + Price */}
              {(previewData.deal_modality || previewData.price_range) && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-brand-500 shrink-0" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deal y precio</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {previewData.deal_modality && (
                      <Badge variant="outline">{DEAL_LABELS[previewData.deal_modality] ?? previewData.deal_modality}</Badge>
                    )}
                    {previewData.price_range && (
                      <Badge variant="outline" className="font-mono">{previewData.price_range}</Badge>
                    )}
                    {previewData.monetization_model && (
                      <Badge variant="outline">{MONETIZATION_LABELS[previewData.monetization_model] ?? previewData.monetization_model}</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Minimal evidence */}
              {previewData.minimal_evidence && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-brand-500 shrink-0" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Evidencia mínima</p>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{previewData.minimal_evidence}</p>
                </div>
              )}

              {/* Competitive differentials */}
              {previewData.competitive_differentials && previewData.competitive_differentials.filter(Boolean).length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-brand-500 shrink-0" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diferenciales competitivos</p>
                  </div>
                  <ul className="space-y-1">
                    {previewData.competitive_differentials.filter(Boolean).map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-brand-500 font-bold mt-0.5">{i + 1}.</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transfer checklist */}
              {previewData.transfer_checklist && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare className="w-4 h-4 text-brand-500 shrink-0" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Checklist de transferencia</p>
                  </div>
                  <ul className="space-y-1.5">
                    {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
                      const checked = previewData.transfer_checklist?.[key]
                      return (
                        <li key={key} className="flex items-center gap-2 text-sm">
                          {checked
                            ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                            : <XCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                          <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Footer note */}
              <div className="border-t pt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Pendiente de revisión por el equipo. Te notificaremos cuando haya una decisión.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection reason dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={(open) => { if (!open) setRejectionDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <MessageSquareWarning className="h-5 w-5 text-red-500 shrink-0" />
              Aspecto a mejorar
            </DialogTitle>
            <DialogDescription className="pt-1">
              <span className="font-medium text-foreground">{rejectionDialogData?.title}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            {rejectionDialogData?.reason ? (
              <p className="text-sm text-red-800 leading-relaxed">{rejectionDialogData.reason}</p>
            ) : (
              <p className="text-sm text-red-600 italic">
                No se especificó una razón de rechazo. Revisa las señales de calidad y asegúrate de que el MVP cumpla todos los requisitos.
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Edita los campos indicados y vuelve a enviar tu MVP para revisión.
          </p>
          <DialogFooter>
            <Link href={`/publish?draft=${rejectionDialogData?.id ?? ''}&from=my-mvps`} className="flex-1">
              <Button className="w-full gap-2">
                <Edit3 className="w-4 h-4" />
                Ir a editar
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
