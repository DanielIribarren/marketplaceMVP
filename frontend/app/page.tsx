import Link from "next/link"
import { ArrowRight, CheckCircle2, Shield, TrendingUp, Users, Zap } from "lucide-react"
import { getUser } from "@/app/actions/auth"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default async function Home() {
  const user = await getUser()
  const isAuthenticated = !!user

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={isAuthenticated} />

      <main>
        <section className="relative overflow-hidden bg-ink-900 py-20 px-4 text-white">
          <div className="pointer-events-none absolute inset-0 orange-grid opacity-[0.15]" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-28 bottom-0 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div className="fade-in-up">
              <Badge className="mb-4" variant="secondary">
                <span className="mr-1">🚀</span>
                El futuro del software está aquí
              </Badge>

              <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
                Compra y vende{" "}
                <span className="text-brand-400">MVPs validados</span>{" "}
                con confianza
              </h1>

              <p className="mb-8 max-w-xl text-lg text-white/75">
                El marketplace que conecta creadores con compradores e
                inversionistas. Transacciones seguras, scoring transparente y
                comunicación directa.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/login">
                  <Button size="lg" className="gap-2">
                    Explorar Marketplace <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/25 bg-white/5 text-white hover:bg-white hover:text-foreground"
                  >
                    Vender mi MVP
                  </Button>
                </Link>
              </div>
            </div>

            <Card className="fade-in-up border-white/10 bg-white/5 text-white">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <Badge className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verificado
                  </Badge>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-brand-400" />
                    <span className="font-semibold">Métricas verificadas</span>
                  </div>
                  <p className="text-sm text-white/70">Transparencia total</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-white/10 py-4">
                  <div>
                    <p className="mb-1 text-sm text-white/65">Usuarios activos</p>
                    <p className="text-2xl font-bold">1,250</p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-white/65">MRR</p>
                    <p className="text-2xl font-bold text-brand-300">$2,400</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm text-white/70">Score técnico</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[92%] bg-primary" />
                    </div>
                    <span className="text-lg font-bold text-brand-300">
                      9.2/10
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 text-sm text-brand-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Auditoría técnica completada</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="brand-surface py-16 px-4">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 text-center md:grid-cols-3">
              <div className="fade-in-up">
                <p className="mb-2 text-5xl font-bold text-primary">150+</p>
                <p className="text-muted-foreground">MVPs listados</p>
              </div>
              <div className="fade-in-up">
                <p className="mb-2 text-5xl font-bold text-primary">$2.5M</p>
                <p className="text-muted-foreground">En transacciones</p>
              </div>
              <div className="fade-in-up">
                <p className="mb-2 text-5xl font-bold text-primary">89%</p>
                <p className="text-muted-foreground">Tasa de cierre</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold">¿Por qué MVPMarket?</h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                El marketplace diseñado para maximizar el valor y minimizar el
                riesgo en cada transacción.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "Transacciones seguras",
                  description:
                    "Sistema de escrow, contratos estandarizados y verificación KYC para proteger compradores y vendedores.",
                },
                {
                  icon: TrendingUp,
                  title: "Métricas verificadas",
                  description:
                    "Auditoría técnica automatizada, scoring transparente y validación de métricas de tracción.",
                },
                {
                  icon: Zap,
                  title: "Proceso rápido",
                  description:
                    "Comunicación directa, data rooms seguros y transferencia verificada de activos digitales.",
                },
                {
                  icon: Users,
                  title: "Comunidad activa",
                  description:
                    "Conecta con creadores, compradores e inversionistas verificados en un ecosistema de confianza.",
                },
                {
                  icon: CheckCircle2,
                  title: "Deal-flow curado",
                  description:
                    "Solo proyectos validados con métricas reales, documentación completa y auditoría técnica.",
                },
                {
                  icon: Shield,
                  title: "Soporte completo",
                  description:
                    "Asistencia durante todo el proceso: negociación, due diligence, cierre y transferencia.",
                },
              ].map(({ icon: Icon, title, description }) => (
                <Card key={title}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">{title}</h3>
                    <p className="text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-ink-900 py-20 px-4 text-white">
          <div className="pointer-events-none absolute inset-0 orange-grid opacity-[0.12]" />
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-4xl font-bold">
              ¿Listo para comprar o vender tu MVP?
            </h2>
            <p className="mb-8 text-lg text-white/80">
              Únete a cientos de creadores e inversionistas que confían en
              MVPMarket.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  Explorar proyectos <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white hover:text-foreground"
                >
                  Comenzar ahora
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
