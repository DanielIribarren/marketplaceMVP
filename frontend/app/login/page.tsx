'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login } from '@/app/actions/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Eye, EyeOff, ScrollText, ShieldCheck, ShieldOff, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function LegalDialogShell({
  open,
  onClose,
  icon,
  iconBg,
  title,
  subtitle,
  children,
}: {
  open: boolean
  onClose: () => void
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
              {icon}
            </div>
            <div>
              <p className="text-base font-bold leading-tight">{title}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-5 text-sm text-muted-foreground leading-relaxed space-y-5">
          {children}
        </div>
        {/* Footer */}
        <div className="border-t border-border px-6 py-3 flex-shrink-0 flex justify-end">
          <Button onClick={onClose} className="bg-brand-500 hover:bg-brand-600 text-white">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const [error, setError] = useState<string | null>(
    errorParam === 'verification_failed'
      ? 'Error al verificar tu email. Por favor intenta registrarte nuevamente.'
      : null
  )
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formValues, setFormValues] = useState({ email: '', password: '' })
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [bannedDialogOpen, setBannedDialogOpen] = useState(errorParam === 'banned')

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/welcome`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('email', formValues.email)
    formData.append('password', formValues.password)

    const result = await login(formData)

    if (result?.error) {
      if (result.error === 'ACCOUNT_BANNED') {
        setBannedDialogOpen(true)
      } else {
        setError(result.error)
      }
      setFormValues(prev => ({ ...prev, password: '' }))
      setLoading(false)
    }
  }

  return (
    <div suppressHydrationWarning className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="absolute top-6 left-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
      </div>

      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">M</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Bienvenido a <span className="text-primary">MVPMarket</span>
            </CardTitle>
            <CardDescription>
              Inicia sesión para acceder a tu cuenta
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  disabled={loading}
                  value={formValues.email}
                  onChange={(e) => setFormValues(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    autoComplete="off"
                    value={formValues.password}
                    onChange={(e) => setFormValues(prev => ({ ...prev, password: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O continúa con</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <GoogleIcon />
              Continuar con Google
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Regístrate gratis
              </Link>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Al iniciar sesión, aceptas nuestros{' '}
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="underline hover:text-foreground transition-colors"
          >
            Términos de Servicio
          </button>{' '}
          y{' '}
          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            className="underline hover:text-foreground transition-colors"
          >
            Política de Privacidad
          </button>
        </p>
      </div>

      {/* ── Dialog: Cuenta suspendida ── */}
      <Dialog open={bannedDialogOpen} onOpenChange={setBannedDialogOpen}>
        <DialogContent className="max-w-sm text-center [&>button]:hidden">
          <DialogTitle className="sr-only">Cuenta suspendida</DialogTitle>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
              <ShieldOff className="w-8 h-8 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-700">Cuenta suspendida</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Esta cuenta fue eliminada por actividad sospechosa.<br />
                No es posible acceder ni crear una nueva cuenta con este correo.
              </p>
            </div>
            <div className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs text-rose-700">Si crees que esto es un error, contacta al soporte en <strong>soporte@mvpmarket.com</strong></p>
            </div>
            <Button className="w-full" onClick={() => setBannedDialogOpen(false)}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Términos de Servicio ── */}
      <LegalDialogShell
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        icon={<ScrollText className="w-5 h-5 text-brand-600" />}
        iconBg="bg-brand-50 border border-brand-200"
        title="Términos de Servicio"
        subtitle="Última actualización: marzo 2026"
      >
        <p>
          Bienvenido a <strong>MVPMarket</strong>. Al acceder o utilizar nuestra plataforma, aceptas quedar vinculado por los presentes Términos de Servicio. Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar la plataforma.
        </p>

        <Section title="1. Descripción del servicio">
          <p>
            MVPMarket es una plataforma en línea que conecta a emprendedores y desarrolladores que desean vender o transferir productos de software en etapa MVP (<em>Minimum Viable Product</em>) con inversores, compradores y otros emprendedores interesados en adquirirlos.
          </p>
          <p>
            MVPMarket actúa únicamente como intermediario y facilitador del contacto. No somos parte de ningún acuerdo de compraventa ni asumimos responsabilidad sobre las transacciones que se realicen fuera de la plataforma.
          </p>
        </Section>

        <Section title="2. Registro y cuenta">
          <p>Para publicar o interactuar con listings debes crear una cuenta con información veraz y actualizada. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades realizadas desde tu cuenta.</p>
          <p>Nos reservamos el derecho de suspender o cancelar cuentas que incumplan estos términos o que presenten información falsa.</p>
        </Section>

        <Section title="3. Publicación de MVPs">
          <p>Al publicar un MVP en la plataforma declaras que:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Eres el titular legítimo del producto o cuentas con autorización para transferirlo.</li>
            <li>La información publicada es veraz, completa y no induce a error.</li>
            <li>El producto no infringe derechos de propiedad intelectual de terceros.</li>
            <li>No contiene código malicioso, spyware ni vulnerabilidades intencionales.</li>
          </ul>
          <p>Cada publicación pasa por un proceso de revisión editorial. MVPMarket puede rechazar o retirar cualquier listing que no cumpla nuestros estándares.</p>
        </Section>

        <Section title="4. Reuniones y negociaciones">
          <p>MVPMarket facilita la coordinación de reuniones entre compradores y vendedores mediante un sistema de agenda. El acuerdo final, precio y condiciones son responsabilidad exclusiva de las partes involucradas.</p>
        </Section>

        <Section title="5. Conducta prohibida">
          <p>Está prohibido utilizar la plataforma para:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Publicar contenido fraudulento, engañoso o difamatorio.</li>
            <li>Hacer scraping automatizado o extraer datos masivamente.</li>
            <li>Hacerse pasar por otra persona o entidad.</li>
            <li>Contactar a otros usuarios fuera de la plataforma con fines de spam.</li>
            <li>Intentar eludir los sistemas de revisión o moderación.</li>
          </ul>
        </Section>

        <Section title="6. Propiedad intelectual">
          <p>Todo el contenido de MVPMarket (diseño, textos, logotipos, interfaz) es propiedad de MVPMarket o de sus licenciantes. Los MVPs publicados son propiedad de sus respectivos creadores y no se transfieren a MVPMarket en ningún momento.</p>
        </Section>

        <Section title="7. Limitación de responsabilidad">
          <p>MVPMarket no garantiza la exactitud de la información publicada por los usuarios ni el resultado de ninguna transacción. En ningún caso seremos responsables por daños indirectos, pérdida de beneficios o daños derivados del uso o la imposibilidad de usar la plataforma.</p>
        </Section>

        <Section title="8. Modificaciones">
          <p>Podemos actualizar estos términos en cualquier momento. Te notificaremos sobre cambios significativos por email o mediante un aviso en la plataforma. El uso continuado de MVPMarket tras la publicación de los cambios constituye tu aceptación de los nuevos términos.</p>
        </Section>

        <Section title="9. Contacto">
          <p>Para dudas sobre estos términos puedes escribirnos a <strong>legal@mvpmarket.com</strong>.</p>
        </Section>
      </LegalDialogShell>

      {/* ── Dialog: Política de Privacidad ── */}
      <LegalDialogShell
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        iconBg="bg-emerald-50 border border-emerald-200"
        title="Política de Privacidad"
        subtitle="Última actualización: marzo 2026"
      >
        <p>
          En <strong>MVPMarket</strong> nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política describe qué datos recopilamos, cómo los utilizamos y qué derechos tienes sobre ellos.
        </p>

        <Section title="1. Datos que recopilamos">
          <p><strong>Datos que tú nos proporcionas:</strong> nombre, dirección de email, foto de perfil, bio, LinkedIn, GitHub, fecha de nacimiento y cualquier información que incluyas en tus listings de MVP.</p>
          <p><strong>Datos generados automáticamente:</strong> dirección IP, tipo de navegador, páginas visitadas, tiempo de sesión, interacciones con listings (vistas, favoritos) y logs del sistema.</p>
          <p><strong>Datos de terceros:</strong> si te registras con Google, recibimos tu nombre y email desde tu cuenta de Google conforme a sus propias políticas.</p>
        </Section>

        <Section title="2. Cómo usamos tus datos">
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestionar tu cuenta y autenticar tu identidad.</li>
            <li>Mostrar tu perfil público y tus listings en el marketplace.</li>
            <li>Enviar notificaciones relevantes (reuniones, ofertas, estado de tu MVP).</li>
            <li>Mejorar la plataforma a través de análisis de uso anónimos.</li>
            <li>Cumplir con obligaciones legales y prevenir fraudes.</li>
          </ul>
        </Section>

        <Section title="3. Compartición de datos">
          <p>No vendemos ni alquilamos tus datos personales a terceros. Podemos compartirlos únicamente con:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Proveedores de servicio</strong> que nos ayudan a operar la plataforma (hosting, autenticación, email), bajo acuerdos de confidencialidad.</li>
            <li><strong>Autoridades</strong> cuando sea requerido por ley o para proteger los derechos de MVPMarket o sus usuarios.</li>
          </ul>
          <p>Los datos de tu perfil público (nombre, foto, bio) son visibles para otros usuarios registrados de la plataforma.</p>
        </Section>

        <Section title="4. Cookies y tecnologías similares">
          <p>Utilizamos cookies esenciales para mantener tu sesión activa y cookies analíticas (anónimas) para entender cómo se usa la plataforma. Puedes desactivar las cookies no esenciales desde la configuración de tu navegador, aunque esto puede afectar algunas funciones.</p>
        </Section>

        <Section title="5. Seguridad">
          <p>Aplicamos medidas técnicas y organizativas razonables para proteger tus datos: cifrado en tránsito (HTTPS), autenticación segura mediante Supabase y almacenamiento de contraseñas con hashing. Sin embargo, ningún sistema es 100 % seguro; te recomendamos usar contraseñas robustas y únicas.</p>
        </Section>

        <Section title="6. Tus derechos">
          <p>Dependiendo de tu jurisdicción, puedes tener derecho a:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Acceso:</strong> solicitar una copia de tus datos personales.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos desde tu perfil o contactándonos.</li>
            <li><strong>Eliminación:</strong> solicitar la eliminación de tu cuenta y datos asociados.</li>
            <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
            <li><strong>Oposición:</strong> oponerte al procesamiento de tus datos para fines de marketing.</li>
          </ul>
          <p>Para ejercer cualquiera de estos derechos escríbenos a <strong>privacidad@mvpmarket.com</strong>.</p>
        </Section>

        <Section title="7. Retención de datos">
          <p>Conservamos tus datos mientras tu cuenta esté activa. Si eliminas tu cuenta, borraremos tus datos personales en un plazo máximo de 30 días, salvo que la ley nos obligue a conservarlos por más tiempo.</p>
        </Section>

        <Section title="8. Cambios en esta política">
          <p>Podemos actualizar esta política periódicamente. Te notificaremos por email ante cambios relevantes. La fecha de última actualización siempre estará indicada al inicio del documento.</p>
        </Section>

        <Section title="9. Contacto">
          <p>Para cualquier consulta sobre privacidad contacta a nuestro equipo en <strong>privacidad@mvpmarket.com</strong>.</p>
        </Section>
      </LegalDialogShell>
    </div>
  )
}
