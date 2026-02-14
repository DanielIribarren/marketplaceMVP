'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { forgotPassword, verifyResetCode, resetPassword, login } from '@/app/actions/auth'
import { Loader2, ArrowLeft, Mail, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react'

type Step = 'email' | 'code' | 'password'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [codeDigits, setCodeDigits] = useState(['', '', '', ''])
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  // Step 1: Send OTP to email
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('email', email)
    const result = await forgotPassword(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess('Código enviado a tu correo electrónico')
      setStep('code')
    }

    setIsLoading(false)
  }

  // Step 2: Verify OTP code
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const code = codeDigits.join('')
    if (code.length !== 4) {
      setError('Ingresa el código completo de 4 dígitos')
      setIsLoading(false)
      return
    }

    const result = await verifyResetCode(email, code)

    if (result.error) {
      setError(result.error)
    } else if (result.resetToken) {
      setResetToken(result.resetToken)
      setStep('password')
    }

    setIsLoading(false)
  }

  // Step 3: Set new password and login
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setIsLoading(false)
      return
    }

    const result = await resetPassword(email, resetToken, password)

    if (result.error) {
      setError(result.error)
    } else {
      // Auto-login after password reset
      const loginFormData = new FormData()
      loginFormData.set('email', email)
      loginFormData.set('password', password)

      const loginResult = await login(loginFormData)

      if (loginResult?.error) {
        setSuccess('Contraseña actualizada. Redirigiendo al login...')
        setTimeout(() => router.push('/login'), 2000)
      }
      // If login succeeds, it redirects automatically to /marketplace
    }

    setIsLoading(false)
  }

  // Handle OTP digit input
  function handleCodeChange(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1)
    if (value && !/^\d$/.test(value)) return

    const newDigits = [...codeDigits]
    newDigits[index] = value
    setCodeDigits(newDigits)

    // Auto-focus next input
    if (value && index < 3) {
      codeRefs.current[index + 1]?.focus()
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      setCodeDigits(pasted.split(''))
      codeRefs.current[3]?.focus()
    }
  }

  const stepConfig = {
    email: { icon: Mail, title: 'Recuperar Contraseña', subtitle: 'Ingresa tu correo electrónico para recibir un código de verificación' },
    code: { icon: ShieldCheck, title: 'Verificar Código', subtitle: `Ingresa el código de 4 dígitos enviado a ${email}` },
    password: { icon: Lock, title: 'Nueva Contraseña', subtitle: 'Crea tu nueva contraseña' }
  }

  const current = stepConfig[step]
  const StepIcon = current.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Link>
        </div>

        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
                <StepIcon className="w-7 h-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{current.title}</CardTitle>
            <p className="text-muted-foreground text-sm">{current.subtitle}</p>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {(['email', 'code', 'password'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    step === s ? 'bg-primary text-white' :
                    (['email', 'code', 'password'].indexOf(step) > i) ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {(['email', 'code', 'password'].indexOf(step) > i) ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < 2 && <div className={`w-8 h-0.5 ${(['email', 'code', 'password'].indexOf(step) > i) ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && step === 'code' && (
              <Alert className="mb-4">
                <Mail className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Email */}
            {step === 'email' && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando código...
                    </>
                  ) : (
                    'Enviar Código'
                  )}
                </Button>
              </form>
            )}

            {/* Step 2: OTP Code */}
            {step === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div>
                  <Label className="text-center block mb-3">Código de Verificación</Label>
                  <div className="flex justify-center gap-3" onPaste={handleCodePaste}>
                    {codeDigits.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => { codeRefs.current[index] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(index, e)}
                        className="w-14 h-14 text-center text-2xl font-bold"
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading || codeDigits.join('').length !== 4}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar Código'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(null); setSuccess(null); setCodeDigits(['', '', '', '']) }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ¿No recibiste el código? Reenviar
                </button>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 'password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="password">Nueva Contraseña</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-500">Las contraseñas no coinciden</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar Contraseña e Iniciar Sesión'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
