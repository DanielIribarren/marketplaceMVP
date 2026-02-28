import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminNavbar } from "@/components/AdminNavBar"
import { MvpReviewActions } from "@/components/admin/MvpReviewActions"


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
  pending_review: "pendiente",
  approved: "aprobado",
  rejected: "rechazado",
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

  const { data: mvpsData, error: mvpsError } = await supabase
    .from("mvps")
    .select(
      "id, title, one_liner, description, status, demo_url, images_urls, published_at, created_at, monetization_model, minimal_evidence, competitive_differentials, deal_modality, price_range, transfer_checklist"
    )
    .in("status", ["pending_review", "approved", "rejected"])
    .order("created_at", { ascending: false })

  const { data: ownersData, error: ownersError } = await supabase
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
      <AdminNavbar />

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
                className={`rounded-full border px-3 py-1.5 text-sm ${
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
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass[mvp.status]}`}
                      >
                        {statusLabel[mvp.status]}
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
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{mvp.description}</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">De.</p>
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

                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Monetización</p>
                          <p className="text-sm">{text(mvp.monetization_model)}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Deal</p>
                          <p className="text-sm">{text(mvp.deal_modality)}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Rango precio</p>
                          <p className="text-sm">{text(mvp.price_range)}</p>
                        </div>
                      </div>
                    </div>

                    <details className="mt-4 rounded-lg border bg-muted/20 p-3">
                      <summary className="cursor-pointer text-sm font-medium">Ver detalles de evaluación</summary>

                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Evidencia mínima</p>
                          <p className="whitespace-pre-wrap text-sm">{text(mvp.minimal_evidence)}</p>
                        </div>

                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Diferenciales</p>
                          <p className="text-sm">{list(mvp.competitive_differentials)}</p>
                        </div>

                        <div className="md:col-span-2">
                          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Capturas clave</p>
                          {mvp.images_urls?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {mvp.images_urls.map((img, idx) => (
                                <a
                                  key={`${mvp.id}-img-${idx}`}
                                  href={img}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
                                >
                                  Captura {idx + 1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm">—</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                            Checklist transferencia
                          </p>
                          {checks.length ? (
                            <div className="flex flex-wrap gap-2">
                              {checks.map((c) => (
                                <span
                                  key={c.key}
                                  className={`rounded-full border px-3 py-1 text-xs ${
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