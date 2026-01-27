import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, CheckCircle2, TrendingUp, Shield, Zap, Users } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/30 py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4" variant="secondary">
                  <span className="mr-1">🚀</span>
                  El futuro del software está aquí
                </Badge>
                
                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                  Compra y vende{' '}
                  <span className="text-primary">MVPs validados</span>{' '}
                  con confianza
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                  El marketplace que conecta creadores con compradores e inversionistas. 
                  Transacciones seguras, scoring transparente y comunicación directa.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link href="/marketplace">
                    <Button size="lg" className="gap-2">
                      Explorar Marketplace <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline">
                      Vender mi MVP
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="relative">
                <Card className="shadow-2xl border-2">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <Badge className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Verificado
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          <span className="font-semibold">Métricas verificadas</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Transparencia total</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-4 border-y">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Usuarios activos</p>
                          <p className="text-2xl font-bold">1,250</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">MRR</p>
                          <p className="text-2xl font-bold text-green-600">$2,400</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Score técnico</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-[92%]"></div>
                          </div>
                          <span className="text-lg font-bold text-primary">9.2/10</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-green-600 pt-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Auditoría técnica completada</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-secondary/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-5xl font-bold text-primary mb-2">150+</p>
                <p className="text-muted-foreground">MVPs listados</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-primary mb-2">$2.5M</p>
                <p className="text-muted-foreground">En transacciones</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-primary mb-2">89%</p>
                <p className="text-muted-foreground">Tasa de cierre</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">¿Por qué MVPMarket?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                El marketplace diseñado para maximizar el valor y minimizar el riesgo en cada transacción
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-2 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Transacciones seguras</h3>
                  <p className="text-muted-foreground">
                    Sistema de escrow, contratos estandarizados y verificación KYC para proteger compradores y vendedores.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Métricas verificadas</h3>
                  <p className="text-muted-foreground">
                    Auditoría técnica automatizada, scoring transparente y validación de métricas de tracción.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Proceso rápido</h3>
                  <p className="text-muted-foreground">
                    Comunicación directa, data rooms seguros y transferencia verificada de activos digitales.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Comunidad activa</h3>
                  <p className="text-muted-foreground">
                    Conecta con creadores, compradores e inversionistas verificados en un ecosistema de confianza.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Deal-flow curado</h3>
                  <p className="text-muted-foreground">
                    Solo proyectos validados con métricas reales, documentación completa y auditoría técnica.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Soporte completo</h3>
                  <p className="text-muted-foreground">
                    Asistencia durante todo el proceso: negociación, due diligence, cierre y transferencia.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              ¿Listo para comprar o vender tu MVP?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Únete a cientos de creadores e inversionistas que confían en MVPMarket
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/marketplace">
                <Button size="lg" variant="secondary" className="gap-2">
                  Explorar proyectos <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary">
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
