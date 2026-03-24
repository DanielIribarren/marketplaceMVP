'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signup } from '@/app/actions/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, ScrollText, ShieldCheck, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function LegalDialogShell({
  open, onClose, icon, iconBg, title, subtitle, children,
}: {
  open: boolean; onClose: () => void; icon: React.ReactNode; iconBg: string
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
            <div>
              <p className="text-base font-bold leading-tight">{title}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 text-sm text-muted-foreground leading-relaxed space-y-5">{children}</div>
        <div className="border-t border-border px-6 py-3 flex-shrink-0 flex justify-end">
          <Button onClick={onClose} className="bg-brand-500 hover:bg-brand-600 text-white">Entendido</Button>
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

interface FieldErrors {
  display_name?: string
  email?: string
  password?: string
  confirm_password?: string
}


export default function RegisterPage() {
  const router = useRouter()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [successDialog, setSuccessDialog] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [formValues, setFormValues] = useState({
    display_name: '',
    email: '',
    password: '',
    confirm_password: ''
  })

  function validatePassword(password: string): string | null {
    if (password.length < 8) {
      return 'Mínimo 8 caracteres'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Debe contener al menos una mayúscula'
    }
    if (!/[a-z]/.test(password)) {
      return 'Debe contener letras minúsculas'
    }
    if (!/[0-9]/.test(password)) {
      return 'Debe contener números'
    }
    return null
  }

  async function handleGoogleSignUp() {
    setLoading(true)
    setFieldErrors({})
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/welcome`,
      },
    })
    if (error) {
      setFieldErrors({ email: error.message })
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    const displayName = formValues.display_name
    const email = formValues.email
    const password = formValues.password
    const confirmPassword = formValues.confirm_password

    const errors: FieldErrors = {}

    // Validate display name
    if (!displayName || displayName.trim().length === 0) {
      errors.display_name = 'El nombre es requerido'
    }

    // Validate email
    if (!email || !email.includes('@')) {
      errors.email = 'Email inválido'
    }

    // Validate password
    const passwordError = validatePassword(password)
    if (passwordError) {
      errors.password = passwordError
      // Solo borrar contraseñas si hay error de contraseña
      setFormValues(prev => ({ ...prev, password: '', confirm_password: '' }))
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      errors.confirm_password = 'Las contraseñas no coinciden'
      // Solo borrar confirm_password si no coinciden
      setFormValues(prev => ({ ...prev, confirm_password: '' }))
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    // Clear any existing browser session before creating a new account
    const supabase = createClient()
    await supabase.auth.signOut()

    const formData = new FormData()
    formData.append('display_name', displayName)
    formData.append('email', email)
    formData.append('password', password)

    const result = await signup(formData)

    if (result?.error) {
      // Check for duplicate email error
      if (result.error.includes('already registered') || result.error.includes('already exists')) {
        setFieldErrors({ email: 'Este correo ya está en uso' })
        // Solo borrar el email si está en uso
        setFormValues(prev => ({ ...prev, email: '' }))
      } else {
        setFieldErrors({ email: result.error })
      }
      setLoading(false)
    } else {
      setLoading(false)
      setSuccessDialog(true)
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
              Únete a <span className="text-primary">MVPMarket</span>
            </CardTitle>
            <CardDescription>
              Crea tu cuenta y comienza a comprar o vender MVPs
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Nombre completo</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  placeholder="Juan Pérez"
                  required
                  disabled={loading}
                  value={formValues.display_name}
                  onChange={(e) => setFormValues(prev => ({ ...prev, display_name: e.target.value }))}
                  className={fieldErrors.display_name ? 'border-red-500' : ''}
                />
                {fieldErrors.display_name && (
                  <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-md text-xs">
                    {fieldErrors.display_name}
                  </div>
                )}
              </div>

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
                  className={fieldErrors.email ? 'border-red-500' : ''}
                />
                {fieldErrors.email && (
                  <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-md text-xs">
                    {fieldErrors.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    value={formValues.password}
                    onChange={(e) => setFormValues(prev => ({ ...prev, password: e.target.value }))}
                    className={fieldErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-md text-xs">
                    {fieldErrors.password}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres, con letras, números y al menos una mayúscula
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar contraseña</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  value={formValues.confirm_password}
                  onChange={(e) => setFormValues(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className={fieldErrors.confirm_password ? 'border-red-500' : ''}
                />
                {fieldErrors.confirm_password && (
                  <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-md text-xs">
                    {fieldErrors.confirm_password}
                  </div>
                )}
              </div>

              <div className="bg-secondary/50 border border-border rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Al registrarte obtienes:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Acceso al marketplace completo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Publicación ilimitada de proyectos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Mensajería segura con compradores
                  </li>
                </ul>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear Cuenta Gratis'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O regístrate con</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleGoogleSignUp}
              disabled={loading}
            >
              <GoogleIcon />
              Continuar con Google
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Inicia sesión
              </Link>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Al registrarte, aceptas nuestros{' '}
          <button type="button" onClick={() => setTermsOpen(true)} className="underline hover:text-foreground transition-colors">
            Términos de Servicio
          </button>{' '}
          y{' '}
          <button type="button" onClick={() => setPrivacyOpen(true)} className="underline hover:text-foreground transition-colors">
            Política de Privacidad
          </button>
        </p>
      </div>

      {/* ── Dialog: Términos de Servicio ── */}
      <LegalDialogShell
        open={termsOpen} onClose={() => setTermsOpen(false)}
        icon={<ScrollText className="w-5 h-5 text-brand-600" />}
        iconBg="bg-brand-50 border border-brand-200"
        title="Términos de Servicio" subtitle="Última actualización: marzo 2026"
      >
        <p>Bienvenido a <strong>MVPMarket</strong>. Al acceder o utilizar nuestra plataforma, aceptas quedar vinculado por los presentes Términos de Servicio.</p>
        <Section title="1. Descripción del servicio">
          <p>MVPMarket es una plataforma en línea que conecta a emprendedores y desarrolladores que desean vender o transferir productos de software en etapa MVP con inversores, compradores y otros emprendedores interesados en adquirirlos.</p>
          <p>MVPMarket actúa únicamente como intermediario y facilitador del contacto. No somos parte de ningún acuerdo de compraventa ni asumimos responsabilidad sobre las transacciones que se realicen fuera de la plataforma.</p>
        </Section>
        <Section title="2. Registro y cuenta">
          <p>Para publicar o interactuar con listings debes crear una cuenta con información veraz y actualizada. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades realizadas desde tu cuenta.</p>
        </Section>
        <Section title="3. Publicación de MVPs">
          <p>Al publicar un MVP declaras que eres el titular legítimo del producto, la información es veraz, no infringe derechos de terceros y no contiene código malicioso. Cada publicación pasa por revisión editorial.</p>
        </Section>
        <Section title="4. Reuniones y negociaciones">
          <p>MVPMarket facilita la coordinación de reuniones entre compradores y vendedores. El acuerdo final, precio y condiciones son responsabilidad exclusiva de las partes involucradas.</p>
        </Section>
        <Section title="5. Conducta prohibida">
          <ul className="list-disc pl-5 space-y-1">
            <li>Publicar contenido fraudulento, engañoso o difamatorio.</li>
            <li>Hacer scraping automatizado o extraer datos masivamente.</li>
            <li>Hacerse pasar por otra persona o entidad.</li>
            <li>Contactar a otros usuarios fuera de la plataforma con fines de spam.</li>
          </ul>
        </Section>
        <Section title="6. Propiedad intelectual">
          <p>Todo el contenido de MVPMarket es propiedad de MVPMarket o de sus licenciantes. Los MVPs publicados son propiedad de sus respectivos creadores.</p>
        </Section>
        <Section title="7. Limitación de responsabilidad">
          <p>MVPMarket no garantiza la exactitud de la información publicada por los usuarios ni el resultado de ninguna transacción. No seremos responsables por daños indirectos o pérdida de beneficios.</p>
        </Section>
        <Section title="8. Contacto">
          <p>Para dudas sobre estos términos escríbenos a <strong>legal@mvpmarket.com</strong>.</p>
        </Section>
      </LegalDialogShell>

      {/* ── Dialog: Política de Privacidad ── */}
      <LegalDialogShell
        open={privacyOpen} onClose={() => setPrivacyOpen(false)}
        icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        iconBg="bg-emerald-50 border border-emerald-200"
        title="Política de Privacidad" subtitle="Última actualización: marzo 2026"
      >
        <p>En <strong>MVPMarket</strong> nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política describe qué datos recopilamos, cómo los utilizamos y qué derechos tienes sobre ellos.</p>
        <Section title="1. Datos que recopilamos">
          <p><strong>Datos que tú nos proporcionas:</strong> nombre, email, foto de perfil, bio, LinkedIn, GitHub y cualquier información incluida en tus listings.</p>
          <p><strong>Datos automáticos:</strong> IP, navegador, páginas visitadas, tiempo de sesión e interacciones con listings.</p>
          <p><strong>Datos de terceros:</strong> si te registras con Google, recibimos tu nombre y email desde tu cuenta de Google.</p>
        </Section>
        <Section title="2. Cómo usamos tus datos">
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestionar tu cuenta y autenticar tu identidad.</li>
            <li>Mostrar tu perfil público y tus listings en el marketplace.</li>
            <li>Enviar notificaciones relevantes sobre reuniones y ofertas.</li>
            <li>Mejorar la plataforma mediante análisis de uso anónimos.</li>
          </ul>
        </Section>
        <Section title="3. Compartición de datos">
          <p>No vendemos ni alquilamos tus datos. Podemos compartirlos con proveedores de servicio bajo acuerdos de confidencialidad, o con autoridades cuando sea requerido por ley.</p>
        </Section>
        <Section title="4. Seguridad">
          <p>Aplicamos cifrado en tránsito (HTTPS), autenticación segura y almacenamiento de contraseñas con hashing. Te recomendamos usar contraseñas robustas y únicas.</p>
        </Section>
        <Section title="5. Tus derechos">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Acceso:</strong> solicitar una copia de tus datos personales.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos desde tu perfil.</li>
            <li><strong>Eliminación:</strong> solicitar la eliminación de tu cuenta y datos.</li>
            <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
          </ul>
          <p>Para ejercer estos derechos escríbenos a <strong>privacidad@mvpmarket.com</strong>.</p>
        </Section>
        <Section title="6. Retención de datos">
          <p>Conservamos tus datos mientras tu cuenta esté activa. Si la eliminas, borraremos tus datos personales en un plazo máximo de 30 días.</p>
        </Section>
        <Section title="7. Contacto">
          <p>Para consultas sobre privacidad contacta a nuestro equipo en <strong>privacidad@mvpmarket.com</strong>.</p>
        </Section>
      </LegalDialogShell>

      <Dialog open={successDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm text-center [&>button]:hidden">
          <DialogTitle className="sr-only">Cuenta creada con éxito</DialogTitle>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-green-700">¡Cuenta creada con éxito!</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Tu cuenta ha sido creada correctamente.<br />Inicia sesión para comenzar.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Ok, iniciar sesión
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
