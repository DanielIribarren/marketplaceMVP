'use client'

import { useState, useEffect } from 'react'
import { signup } from '@/app/actions/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FieldErrors {
  display_name?: string
  email?: string
  password?: string
  confirm_password?: string
}

const STORAGE_KEY = 'register-form'

export default function RegisterPage() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [formValues, setFormValues] = useState(() => {
    // Cargar datos guardados (excepto contraseñas por seguridad)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const { display_name, email } = JSON.parse(saved)
          return {
            display_name: display_name || '',
            email: email || '',
            password: '',
            confirm_password: ''
          }
        } catch {
          return {
            display_name: '',
            email: '',
            password: '',
            confirm_password: ''
          }
        }
      }
    }
    return {
      display_name: '',
      email: '',
      password: '',
      confirm_password: ''
    }
  })

  // Guardar nombre y email en localStorage (no contraseñas)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        display_name: formValues.display_name,
        email: formValues.email
      }))
    }
  }, [formValues.display_name, formValues.email])

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
      // Limpiar localStorage al registrarse exitosamente
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }

  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>

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
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  value={formValues.password}
                  onChange={(e) => setFormValues(prev => ({ ...prev, password: e.target.value }))}
                  className={fieldErrors.password ? 'border-red-500' : ''}
                />
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
          <Link href="/terms" className="underline hover:text-foreground">
            Términos de Servicio
          </Link>{' '}
          y{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Política de Privacidad
          </Link>
        </p>
      </div>
    </div>
  )
}
