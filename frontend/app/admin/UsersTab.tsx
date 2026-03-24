import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserDeleteButton } from './UserDeleteButton'
import { Users, Mail, Calendar, Package, ShieldBan, Handshake } from 'lucide-react'

const ADMIN_EMAIL = 'admin123@correo.unimet.edu.ve'

function getInitials(name: string) {
  const parts = (name || '?').trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' })
}

export async function UsersTab({ view }: { view: 'registered' | 'banned' }) {
  const adminClient = createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const { data: mvpRows } = await adminClient.from('mvps').select('owner_id').eq('status', 'approved')
  const { data: profiles } = await adminClient.from('user_profiles').select('id, display_name, avatar_url, bio')
  const { data: bannedRows } = await adminClient.from('banned_users').select('email, reason, banned_at').order('banned_at', { ascending: false })
  const { data: offerRows } = await adminClient.from('meetings').select('requester_id')

  if (authError) return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      Error cargando usuarios: {authError.message}
    </div>
  )

  const mvpCountMap = new Map<string, number>()
  for (const m of (mvpRows ?? [])) mvpCountMap.set(m.owner_id, (mvpCountMap.get(m.owner_id) || 0) + 1)
  const offerCountMap = new Map<string, number>()
  for (const o of (offerRows ?? [])) offerCountMap.set(o.requester_id, (offerCountMap.get(o.requester_id) || 0) + 1)
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
  const users = (authData?.users ?? []).filter(u => u.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase())
  const banned = bannedRows ?? []

  return (
    <div className="space-y-3">

      {/* Filter cards */}
      <div className="grid gap-5 sm:grid-cols-2 isolate">
        <Link
          href="/admin?tab=users&view=registered"
          className={`rounded-xl border p-4 border-l-4 border-l-brand-500 flex items-center gap-4 transition-all hover:scale-[1.02] ${
            view === 'registered' ? 'bg-brand-50/60 shadow-md shadow-brand-200 scale-[1.02]' : 'bg-card hover:shadow-sm'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-white border border-border/60 shadow-sm flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Usuarios registrados</p>
            <p className="text-3xl font-bold mt-1">{users.length}</p>
            <p className="text-xs text-muted-foreground">({users.length} cuenta{users.length !== 1 ? 's' : ''} en total)</p>
          </div>
        </Link>

        <Link
          href="/admin?tab=users&view=banned"
          className={`rounded-xl border p-4 border-l-4 border-l-rose-500 flex items-center gap-4 transition-all hover:scale-[1.02] ${
            view === 'banned' ? 'bg-rose-50/60 shadow-md shadow-rose-200 scale-[1.02]' : 'bg-card hover:shadow-sm'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-white border border-border/60 shadow-sm flex items-center justify-center shrink-0">
            <ShieldBan className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Usuarios baneados</p>
            <p className="text-3xl font-bold mt-1">{banned.length}</p>
            <p className="text-xs text-muted-foreground">({banned.length === 0 ? 'ninguno eliminado' : `${banned.length} correo${banned.length !== 1 ? 's' : ''} en lista negra`})</p>
          </div>
        </Link>
      </div>

      {/* Registered users list */}
      {view === 'registered' && (
        users.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No hay usuarios registrados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(user => {
              const profile = profileMap.get(user.id)
              const displayName = profile?.display_name || (user.user_metadata?.display_name as string) || (user.user_metadata?.name as string) || 'Sin nombre'
              const email = user.email || '—'
              const mvpCount = mvpCountMap.get(user.id) || 0
              const offerCount = offerCountMap.get(user.id) || 0
              const provider = (user.app_metadata?.provider as string) || 'email'

              return (
                <article key={user.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0">
                        {profile?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={profile.avatar_url} alt={displayName} className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-100" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center ring-2 ring-brand-200">
                            <span className="text-sm font-bold text-brand-700">{getInitials(displayName)}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{displayName}</p>
                          {provider === 'google' && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">Google</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 shrink-0" /><span>{email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 shrink-0" /><span>Registrado: {formatDate(user.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <div className="flex items-center gap-2">
                        {offerCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-full font-medium">
                            <Handshake className="w-3 h-3" />{offerCount} {offerCount === 1 ? 'oferta' : 'ofertas'}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-full font-medium">
                          <Package className="w-3 h-3" />{mvpCount} {mvpCount === 1 ? 'MVP' : 'MVPs'}
                        </span>
                      </div>
                      <UserDeleteButton userId={user.id} userEmail={email} userName={displayName} />
                    </div>
                  </div>
                  {profile?.bio && (
                    <div className="px-5 pb-4 border-t border-border/40 pt-3">
                      <p className="text-xs text-muted-foreground italic line-clamp-2">&quot;{profile.bio}&quot;</p>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )
      )}

      {/* Banned users list */}
      {view === 'banned' && (
        banned.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <ShieldBan className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No hay usuarios baneados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {banned.map((b) => (
              <div key={b.email} className="rounded-xl border border-rose-200 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                      <ShieldBan className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-rose-800">{b.email}</p>
                      <p className="text-xs text-muted-foreground italic mt-0.5">{b.reason || 'Actividad sospechosa'}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {b.banned_at ? formatDate(b.banned_at) : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
