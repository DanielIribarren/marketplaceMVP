import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Navbar } from "@/components/navbar"
import { MvpReviewActions } from "@/components/admin/MvpReviewActions"
import { MvpDeleteButton } from "./MvpDeleteButton"
import { DescriptionDialog } from "./DescriptionDialog"
import { UsersTab } from "./UsersTab"
import { CheckCircle2, XCircle, Clock, ShieldCheck, Users, Package, Check } from "lucide-react"


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

function normalizeTab(v?: string): 'mvps' | 'users' {
  return v === 'users' ? 'users' : 'mvps'
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; tab?: string; view?: string }> | { status?: string; tab?: string; view?: string }
}) {
  const supabase = await createClient()

  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<{ status?: string; tab?: string; view?: string }>).then === "function"
      ? await (searchParams as Promise<{ status?: string; tab?: string; view?: string }>)
      : (searchParams as { status?: string; tab?: string; view?: string } | undefined)

  const activeFilter = normalizeFilter(resolvedSearchParams?.status)
  const activeTab = normalizeTab(resolvedSearchParams?.tab)
  const usersView = resolvedSearchParams?.view === 'banned' ? 'banned' : 'registered'

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
        <header className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-md shadow-brand-500/25">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Panel de Administración</h1>
              <p className="text-sm text-muted-foreground">Gestiona MVPs y usuarios de la plataforma</p>
            </div>
          </div>
        </header>

        {/* Tab navigation */}
        <div className="flex justify-center"><div className="flex gap-2 p-1 bg-background rounded-xl border border-border/50 w-fit">
          <Link href="/admin?tab=mvps" className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'mvps' ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm' : 'bg-background text-muted-foreground hover:text-foreground'}`}>
            <Package className="w-4 h-4" /> MVPs
          </Link>
          <Link href="/admin?tab=users" className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm' : 'bg-background text-muted-foreground hover:text-foreground'}`}>
            <Users className="w-4 h-4" /> Usuarios
          </Link>
        </div></div>

        {activeTab === 'users' ? (
          <UsersTab view={usersView} />
        ) : (
          <>
            {/* Stat cards as filter buttons */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { key: 'all' as FilterStatus,           label: 'Total MVPs',  count: allMvps.length, accent: 'border-l-brand-400',   shadow: 'shadow-brand-200',   bg: 'bg-brand-50/60'   },
                { key: 'pending_review' as FilterStatus, label: 'Pendientes',  count: pendingCount,   accent: 'border-l-amber-400',   shadow: 'shadow-amber-200',   bg: 'bg-amber-50/60'   },
                { key: 'approved' as FilterStatus,       label: 'Aprobados',   count: approvedCount,  accent: 'border-l-emerald-400', shadow: 'shadow-emerald-200', bg: 'bg-emerald-50/60' },
                { key: 'rejected' as FilterStatus,       label: 'Rechazados',  count: rejectedCount,  accent: 'border-l-rose-400',    shadow: 'shadow-rose-200',    bg: 'bg-rose-50/60'    },
              ].map(({ key, label, count, accent, shadow, bg }) => {
                const isActive = key === activeFilter
                return (
                  <Link
                    key={key}
                    href={key === 'all' ? '/admin?tab=mvps' : `/admin?tab=mvps&status=${key}`}
                    className={`rounded-xl border bg-card p-4 border-l-4 ${accent} transition-all hover:scale-[1.02] hover:${bg} ${
                      isActive ? `shadow-md ${shadow} ${bg} scale-[1.02]` : 'hover:shadow-sm'
                    }`}
                  >
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-3xl font-bold mt-1">{count}</p>
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
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold">{mvp.title}</h2>
                            {mvp.status === "approved" && <MvpDeleteButton mvpId={mvp.id} mvpTitle={mvp.title} />}
                          </div>
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
                          {mvp.status === "pending_review" && <MvpReviewActions mvpId={mvp.id} />}
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
                              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Diferenciales</p>
                              {mvp.competitive_differentials?.filter(d => d?.trim()).length ? (
                                <ul className="space-y-1.5">
                                  {mvp.competitive_differentials.filter(d => d?.trim()).map((d, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                      <span className="relative mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border-2 border-brand-500 bg-white">
                                        <Check className="absolute h-[18px] w-[18px] text-brand-600 stroke-[3]" />
                                      </span>
                                      <span className="text-sm leading-snug">{d}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                              )}
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
          </>
        )}
      </main>
    </>
  )
}
