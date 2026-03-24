import Link from "next/link"
import {
  ArrowRight, Shield, Users, Zap,
  CheckCircle2, Package, Handshake, TrendingUp
} from "lucide-react"
import { getUser, isAdmin as checkIsAdmin } from "@/app/actions/auth"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

const CATEGORIES = ['SaaS', 'FinTech', 'IA / ML', 'EdTech', 'E-commerce']

export default async function Home() {
  const user = await getUser()
  const isAuthenticated = !!user
  const userIsAdmin = await checkIsAdmin()

  const supabase = await createClient()
  const [{ count: userCount }, { count: mvpCount }] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('mvps').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
  ])

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={isAuthenticated} isAdmin={userIsAdmin} />

      <main>
        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-ink-900 pb-28 pt-20 px-4 text-white">
          <div className="pointer-events-none absolute inset-0 orange-grid opacity-[0.12]" />
          <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-500/20 blur-[110px]" />
          <div className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-brand-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/8 blur-[80px]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">

            {/* ── Texto ── */}
            <div className="fade-in-up">
              <Badge className="mb-6 gap-2 border-brand-400/30 bg-brand-500/15 text-brand-300 backdrop-blur-sm px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
                </span>
                Plataforma activa · LATAM
              </Badge>

              <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight md:text-[3.75rem]">
                El marketplace de{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-brand-400">MVPs validados</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-brand-500 via-brand-400 to-transparent opacity-70" />
                </span>
                {" "}para LATAM
              </h1>

              <p className="mb-9 max-w-lg text-lg leading-relaxed text-white/70">
                Conecta creadores con compradores e inversionistas.
                Publica tu MVP, agenda reuniones y cierra tratos en un
                ecosistema seguro y transparente.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link href={isAuthenticated ? "/marketplace" : "/login"}>
                  <Button size="lg" className="gap-2 shadow-lg shadow-brand-500/30 hover:shadow-brand-500/45 transition-shadow">
                    Explorar Marketplace <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={isAuthenticated ? "/publish?from=home" : "/login"}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-foreground"
                  >
                    Publicar mi MVP
                  </Button>
                </Link>
              </div>

              {/* Trust bar */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-white/45">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0" />
                  <span>Revisión manual de MVPs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-brand-400 shrink-0" />
                  <span>Reuniones verificadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-brand-400 shrink-0" />
                  <span>Ofertas directas</span>
                </div>
              </div>
            </div>

            {/* ── Tarjeta plataforma ── */}
            <div className="fade-in-up lg:pl-4" style={{ animationDelay: '120ms' }}>
              <Card className="border-white/10 bg-white/[0.06] backdrop-blur-sm text-white overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(255,107,53,0.6)]" />
                    <span className="text-sm font-semibold tracking-wide text-white/80">MVPMarket</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                    </span>
                    <span className="text-xs text-green-400 font-medium">En vivo</span>
                  </div>
                </div>

                <CardContent className="p-5 space-y-5">
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.06] border border-white/10 p-4">
                      <p className="text-[11px] text-white/45 mb-2 uppercase tracking-wider font-medium">Usuarios activos</p>
                      <div className="flex items-center gap-2">
                        <p className="text-4xl font-black text-white">{userCount ?? 0}</p>
                        <span className="relative flex h-2.5 w-2.5 shrink-0 self-center translate-y-px">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/[0.06] border border-white/10 p-4">
                      <p className="text-[11px] text-white/45 mb-2 uppercase tracking-wider font-medium">MVPs aprobados</p>
                      <p className="text-4xl font-black text-brand-300 leading-none">{mvpCount ?? 0}</p>
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <p className="text-[11px] text-white/45 mb-2.5 uppercase tracking-wider font-medium">Categorías disponibles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(cat => (
                        <span
                          key={cat}
                          className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/65 hover:border-brand-400/40 hover:text-white/90 transition-colors"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Mini steps */}
                  <div className="space-y-2.5 border-t border-white/10 pt-4">
                    {[
                      { icon: Package, label: 'Publica tu MVP', sub: 'Con métricas reales' },
                      { icon: Handshake, label: 'Agenda reuniones', sub: 'Con inversores directos' },
                      { icon: TrendingUp, label: 'Cierra el trato', sub: 'Con oferta verificada' },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 border border-brand-500/25">
                          <Icon className="h-4 w-4 text-brand-400" />
                        </div>
                        <p className="flex-1 text-sm font-medium text-white/85">{label}</p>
                        <p className="text-xs text-white/35 shrink-0">{sub}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CÓMO FUNCIONA
        ══════════════════════════════════════ */}
        <section className="brand-surface pb-24 pt-14 px-4 relative">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Proceso simple</p>
              <h2 className="text-4xl font-bold text-foreground">¿Cómo funciona?</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {([
                {
                  step: '01',
                  icon: Package,
                  title: 'Publica tu MVP',
                  description: 'Describe tu proyecto, sube métricas reales, define tu precio y envíalo a revisión. Aprobación en menos de 48 horas.',
                  gradient: 'from-brand-500 to-brand-600',
                },
                {
                  step: '02',
                  icon: Handshake,
                  title: 'Conecta con inversores',
                  description: 'Recibe solicitudes de reunión, revisa las ofertas y agenda llamadas directamente desde el calendario integrado.',
                  gradient: 'from-brand-400 to-brand-500',
                },
                {
                  step: '03',
                  icon: TrendingUp,
                  title: 'Cierra el trato',
                  description: 'Negocia en tiempo real, acepta la oferta que mejor se adapte y formaliza la transacción con respaldo de la plataforma.',
                  gradient: 'from-brand-300 to-brand-400',
                },
              ] as const).map(({ step, icon: Icon, title, description, gradient }) => (
                <Card key={step} className="group relative overflow-hidden motion-lift border-border/60 hover:border-brand-300 hover:brand-border-glow">
                  <CardContent className="p-7">
                    <div className="mb-5 flex items-start justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-md`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="select-none text-5xl font-black text-border group-hover:text-brand-200 transition-colors duration-300">
                        {step}
                      </span>
                    </div>
                    <h3 className="mb-2 text-xl font-bold">{title}</h3>
                    <p className="leading-relaxed text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Curva de transición naranja → blanco */}
          <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none pointer-events-none">
            <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-20">
              <defs>
                <linearGradient id="waveOrangeWhite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(21 100% 80%)" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="white" stopOpacity="1" />
                </linearGradient>
              </defs>
              <path d="M0,0 Q360,80 720,50 Q1080,20 1440,70 L1440,80 L0,80 Z" fill="url(#waveOrangeWhite)" />
            </svg>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FEATURES
        ══════════════════════════════════════ */}
        <section className="py-14 px-4">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Por qué elegirnos</p>
              <h2 className="mb-4 text-4xl font-bold">Todo lo que necesitas en un solo lugar</h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Construido para maximizar el valor en cada transacción y minimizar el riesgo de ambos lados.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {([
                {
                  icon: Shield,
                  title: "Revisión manual",
                  description: "Cada MVP pasa por un proceso de aprobación antes de ser visible. Solo proyectos con métricas reales y documentación completa.",
                },
                {
                  icon: Users,
                  title: "Conexiones directas",
                  description: "Sin intermediarios. Comunícate directamente con inversores, agenda reuniones y negocia condiciones en tiempo real.",
                },
                {
                  icon: Zap,
                  title: "Proceso ágil",
                  description: "Desde la publicación hasta el cierre del trato, todo en la misma plataforma. Sin fricciones, sin correos interminables.",
                },
              ] as const).map(({ icon: Icon, title, description }) => (
                <Card key={title} className="group motion-lift border-border/60 hover:border-brand-300 hover:brand-border-glow">
                  <CardContent className="p-7">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 transition-colors group-hover:bg-brand-100">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold">{title}</h3>
                    <p className="leading-relaxed text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CTA FINAL
        ══════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-ink-900 py-16 px-4 text-white">
          <div className="pointer-events-none absolute inset-0 orange-grid opacity-[0.10]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/12 blur-[120px]" />

          <div className="relative mx-auto max-w-3xl text-center">
            <Badge className="mb-6 border-brand-400/30 bg-brand-500/15 px-4 py-1 text-brand-300">
              Empieza hoy · Es gratis
            </Badge>

            <h2 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">
              ¿Listo para dar el{" "}
              <span className="text-brand-400">siguiente paso?</span>
            </h2>

            <p className="mb-10 mx-auto max-w-xl text-lg leading-relaxed text-white/70">
              Únete a la comunidad de creadores e inversores que están
              transformando el ecosistema de startups en LATAM.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href={isAuthenticated ? "/marketplace" : "/login"}>
                <Button size="lg" className="gap-2 shadow-lg shadow-brand-500/30">
                  Explorar proyectos <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={isAuthenticated ? "/publish?from=home" : "/login"}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/5 text-white hover:bg-white hover:text-foreground"
                >
                  Publicar mi MVP
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <div className="-mt-20">
        <Footer />
      </div>
    </div>
  )
}
