import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Navbar } from "@/components/navbar"
import { MvpReviewActions } from "@/components/admin/MvpReviewActions"
import { DescriptionDialog } from "./DescriptionDialog"
import { CheckCircle2, XCircle, Clock } from "lucide-react"


const ADMIN_EMAIL = "admin123@correo.unimet.edu.ve"

type MvpStatus = "pending_review" | "approved" | "rejected"
type FilterStatus = "all" | MvpStatus

type MvpRow = {
  id: string
  title: string
  one_liner: string | null
  description: string
  status: MvpStatus
  demo_url: string | null
  category: string | null
  cover_image_url: string | null
  images_urls: string[] | null
  published_at: string | null
  created_at: string
  monetization_model: string | null
  minimal_evidence: string | null
  competitive_differentials: string[] | null
  deal_modality: string | null
  price_range: string | null
  transfer_checklist: Record<string, boolean> | null
}

type OwnerViewRow = {
  id: string
  owner_name: string | null
  owner_email: string | null
}

const statusLabel: Record<MvpStatus, string> = {
  pending_review: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}


const statusClass: Record<MvpStatus, string> = {
  pending_review: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
}

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending_review", label: "Pendientes" },
  { key: "approved", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
]

function text(v: string | null | undefined) {
  return v && v.trim() ? v : "—"
}

function list(v: string[] | null | undefined) {
  return v && v.length ? v.join(", ") : "—"
}

function date(v: string | null, fallback: string) {
  return new Date(v ?? fallback).toLocaleString("es-VE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function checklist(v: Record<string, boolean> | null | undefined) {
  if (!v) return []
  const labels: Record<string, string> = {
    ownIp: "IP propia",
    codeAndDocs: "Código y docs",
    domainOrLanding: "Dominio/Landing",
    integrationAccounts: "Cuentas integración",
  }
  return Object.entries(v).map(([k, ok]) => ({
    key: k,
    label: labels[k] ?? k,
    ok: Boolean(ok),
  }))
}

const SECTOR_LABEL: Record<string, string> = {
  tecnologia: 'Tecnología', educacion: 'Educación', salud: 'Salud y Medicina',
  alimentacion: 'Alimentación', finanzas: 'Finanzas y Fintech', ecommerce: 'E-commerce',
  entretenimiento: 'Entretenimiento', viajes: 'Viajes y Turismo', bienes_raices: 'Bienes Raíces',
  logistica: 'Logística', marketing: 'Marketing', rrhh: 'Recursos Humanos',
  legal: 'Legal', agricultura: 'Agricultura', energia: 'Energía',
  deportes: 'Deportes y Fitness', moda: 'Moda y Belleza', higiene: 'Higiene',
  construccion: 'Construcción', manufactura: 'Manufactura', otros: 'Otros',
}

const MONETIZATION_LABEL: Record<string, string> = {
  saas_monthly: 'SaaS mensual',
  one_time_license: 'Licencia única',
  transactional: 'Transaccional',
  advertising: 'Publicidad',
  to_define: 'Por definir',
}

const DEAL_LABEL: Record<string, string> = {
  sale: 'Venta',
  equity: 'Equity',
  license: 'Licencia',
  rev_share: 'Rev-Share',
}

function normalizeFilter(value?: string): FilterStatus {
  if (value === "pending_review" || value === "approved" || value === "rejected") return value
  return "all"
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }> | { status?: string }
}) {
  const supabase = await createClient()

  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<{ status?: string }>).then === "function"
      ? await (searchParams as Promise<{ status?: string }>)
      : (searchParams as { status?: string } | undefined)

  const activeFilter = normalizeFilter(resolvedSearchParams?.status)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")
  if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    redirect("/marketplace")
  }

  // Usar service_role para bypassear RLS y ver MVPs de todos los usuarios
  const adminSupabase = createAdminClient()

  const { data: mvpsData, error: mvpsError } = await adminSupabase
    .from("mvps")
    .select(
      "id, title, one_liner, description, status, demo_url, category, cover_image_url, images_urls, published_at, created_at, monetization_model, minimal_evidence, competitive_differentials, deal_modality, price_range, transfer_checklist"
    )
    .in("status", ["pending_review", "approved", "rejected"])
    .order("created_at", { ascending: false })

  const { data: ownersData, error: ownersError } = await adminSupabase
    .from("mvps_with_owner")
    .select("id, owner_name, owner_email")

  const error = mvpsError ?? ownersError
  const allMvps = (mvpsData ?? []) as MvpRow[]
  const ownersMap = new Map(((ownersData ?? []) as OwnerViewRow[]).map((r) => [r.id, r]))

  const pendingCount = allMvps.filter((m) => m.status === "pending_review").length
  const approvedCount = allMvps.filter((m) => m.status === "approved").length
  const rejectedCount = allMvps.filter((m) => m.status === "rejected").length

  const mvps = activeFilter === "all" ? allMvps : allMvps.filter((m) => m.status === activeFilter)

  return (
    <>
      <Navbar isAuthenticated={true} isAdmin={true} />

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-bold">Panel Admin - MVPs</h1>
          <p className="text-sm text-muted-foreground">Filtra y revisa MVPs enviados.</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{allMvps.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold">{pendingCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Aprobados</p>
            <p className="text-2xl font-bold">{approvedCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Rechazados</p>
            <p className="text-2xl font-bold">{rejectedCount}</p>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = f.key === activeFilter
            return (
              <Link
                key={f.key}
                href={f.key === "all" ? "/admin" : `/admin?status=${f.key}`}
                className={`rounded-full border px-3 py-1.5 text-sm transition-all hover:scale-105 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Error: {error.message}
          </div>
        ) : mvps.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No hay MVPs para el filtro seleccionado.
          </div>
        ) : (
          <section className="space-y-4">
            {mvps.map((mvp) => {
              const owner = ownersMap.get(mvp.id)
              const checks = checklist(mvp.transfer_checklist)

              return (
                <article key={mvp.id} className="rounded-xl border bg-card shadow-sm">
                  <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold">{mvp.title}</h2>
                      <p className="text-sm text-muted-foreground">{text(mvp.one_liner)}</p>
                      <p className="text-xs text-muted-foreground">
                        {text(owner?.owner_name)} · {text(owner?.owner_email)}
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass[mvp.status]}`}
                      >
                        {statusLabel[mvp.status]}
                        {mvp.status === "approved" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {mvp.status === "rejected" && <XCircle className="h-3.5 w-3.5" />}
                        {mvp.status === "pending_review" && <Clock className="h-3.5 w-3.5" />}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Publicado: {date(mvp.published_at, mvp.created_at)}
                      </p>
                      {mvp.status === "pending_review" ? <MvpReviewActions mvpId={mvp.id} /> : null}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Descripción</p>
                        <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed">
                          {(mvp.description?.length ?? 0) > 300 ? (
                            <DescriptionDialog description={mvp.description} />
                          ) : (
                            <p className="whitespace-pre-wrap">{mvp.description || '—'}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Demo</p>
                          {mvp.demo_url ? (
                            <a
                              href={mvp.demo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-sm text-primary hover:underline"
                            >
                              {mvp.demo_url}
                            </a>
                          ) : (
                            <p className="text-sm">—</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">Sector</p>
                            <p className="text-sm">{mvp.category ? (SECTOR_LABEL[mvp.category] ?? mvp.category) : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">Rango precio</p>
                            <p className="text-sm">{text(mvp.price_range)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">Deal</p>
                            <p className="text-sm">{mvp.deal_modality ? (DEAL_LABEL[mvp.deal_modality] ?? mvp.deal_modality) : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-muted-foreground">Monetización</p>
                            <p className="text-sm">{mvp.monetization_model ? (MONETIZATION_LABEL[mvp.monetization_model] ?? mvp.monetization_model) : '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <details className="mt-4 rounded-lg border bg-muted/20 p-3">
                      <summary className="cursor-pointer text-sm font-medium">Ver detalles de evaluación</summary>

                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div className="pl-3">
                          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Evidencia mínima</p>
                          <p className="whitespace-pre-wrap text-sm">{text(mvp.minimal_evidence)}</p>
                        </div>

                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Diferenciales</p>
                          <p className="text-sm">{list(mvp.competitive_differentials)}</p>
                        </div>

                        <div className="pl-3">
                          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Imágenes y videos</p>
                          {(mvp.cover_image_url || mvp.images_urls?.length) ? (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {mvp.cover_image_url && (
                                <a
                                  href={mvp.cover_image_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border hover:opacity-80 transition-opacity"
                                  title="Portada"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={mvp.cover_image_url} alt="Portada" className="h-full w-full object-cover" />
                                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">Portada</span>
                                </a>
                              )}
                              {(mvp.images_urls ?? []).map((url, idx) => {
                                const isVid = /\.(mp4|webm|mov|avi|mkv|ogv)(\?.*)?$/i.test(url)
                                return isVid ? (
                                  <a
                                    key={`${mvp.id}-media-${idx}`}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="relative flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border bg-black overflow-hidden hover:opacity-80 transition-opacity"
                                  >
                                    <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">Video {idx + 1}</span>
                                  </a>
                                ) : (
                                  <a
                                    key={`${mvp.id}-media-${idx}`}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border hover:opacity-80 transition-opacity"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={`Imagen ${idx + 1}`} className="h-full w-full object-cover" />
                                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">{idx + 1}</span>
                                  </a>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-sm">—</p>
                          )}
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                            Checklist transferencia
                          </p>
                          {checks.length ? (
                            <div className="grid grid-cols-2 gap-2">
                              {checks.map((c) => (
                                <span
                                  key={c.key}
                                  className={`rounded-full border px-3 py-1.5 text-xs text-center ${
                                    c.ok
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  {c.label}: {c.ok ? "Sí" : "No"}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm">—</p>
                          )}
                        </div>
                      </div>
                    </details>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </main>
    </>
  )
}