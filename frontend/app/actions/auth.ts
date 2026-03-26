'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'admin123@correo.unimet.edu.ve'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  console.log('[LOGIN] Attempting login for:', data.email)
  console.log('[LOGIN] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

  const emailLower = (formData.get('email') as string)?.toLowerCase()
  try {
    const adminClient = createAdminClient()
    const { data: banData } = await adminClient
      .from('banned_users')
      .select('email')
      .eq('email', emailLower)
      .maybeSingle()
    if (banData) return { error: 'ACCOUNT_BANNED' }
  } catch { /* table might not exist yet */ }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('[LOGIN] Error:', error.message, '| Status:', error.status)
    return { error: error.message }
  }

  const loggedEmail = authData.user?.email?.toLowerCase()

  revalidatePath('/', 'layout')

  if (loggedEmail === ADMIN_EMAIL) {
    redirect('/admin/welcome')
  }

  console.log('[LOGIN] Success! User:', authData.user?.email)

  revalidatePath('/', 'layout')
  redirect('/welcome')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Sign out any existing session before creating a new account
  await supabase.auth.signOut()

  const email = formData.get('email') as string
  const displayName = formData.get('display_name') as string

  const emailLower = email?.toLowerCase()
  try {
    const adminClient = createAdminClient()
    const { data: banData } = await adminClient
      .from('banned_users')
      .select('email')
      .eq('email', emailLower)
      .maybeSingle()
    if (banData) return { error: 'ACCOUNT_BANNED' }
  } catch { /* table might not exist yet */ }

  const data = {
    email,
    password: formData.get('password') as string,
    options: {
      data: {
        display_name: displayName,
      },
    },
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: error.message }
  }

  // Check if email already exists (Supabase returns empty identities array for duplicates)
  if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
    return { error: 'Este correo ya está registrado. Por favor inicia sesión o usa otro correo.' }
  }

  // Auto-create user_profiles record so the profile is ready immediately
  if (authData?.user) {
    await supabase
      .from('user_profiles')
      .upsert({ user_id: authData.user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

const OTP_EXPIRY_MINUTES = 10
const MAX_ATTEMPTS = 5

export async function forgotPassword(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'Email requerido' }

  try {
    const admin = createAdminClient()

    // Check user exists (avoid email enumeration by always returning success)
    const { data: { users } } = await admin.auth.admin.listUsers()
    const userExists = users.some(u => u.email?.toLowerCase() === email)
    if (!userExists) {
      return { success: true, message: 'Si el correo existe, recibirás un código de verificación' }
    }

    // Generate 4-digit OTP
    const code = String(Math.floor(1000 + Math.random() * 9000))
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

    // Persist in Supabase table (survives cold starts)
    await admin.from('password_reset_codes').upsert({
      email,
      code,
      expires_at: expiresAt,
      attempts: 0,
      verified: false,
      reset_token: null,
      reset_token_expires_at: null,
    }, { onConflict: 'email' })

    // Send OTP email
    const nodemailer = (await import('nodemailer')).default
    if (process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD) {
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_SERVER || 'smtp.gmail.com',
        port: Number(process.env.MAIL_PORT) || 587,
        secure: false,
        auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD },
      })
      await transporter.sendMail({
        from: `"MVP Marketplace" <${process.env.MAIL_USERNAME}>`,
        to: email,
        subject: 'Código de recuperación de contraseña - MVP Marketplace',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:56px;height:56px;background:#2563eb;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;">
                <span style="color:white;font-weight:bold;font-size:24px;">M</span>
              </div>
            </div>
            <h2 style="text-align:center;color:#111827;margin-bottom:8px;">Recuperación de contraseña</h2>
            <p style="text-align:center;color:#6b7280;margin-bottom:24px;">Usa el siguiente código para restablecer tu contraseña</p>
            <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;">${code}</span>
            </div>
            <p style="text-align:center;color:#6b7280;font-size:14px;">Este código expira en ${OTP_EXPIRY_MINUTES} minutos.</p>
            <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">Si no solicitaste este código, ignora este correo.</p>
          </div>
        `,
      })
    }

    return { success: true, message: 'Si el correo existe, recibirás un código de verificación' }
  } catch (error) {
    console.error('Error in forgotPassword:', error)
    return { error: 'No se pudo enviar el código de recuperación' }
  }
}

export async function verifyResetCode(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase()
  try {
    const admin = createAdminClient()
    const { data: row, error } = await admin
      .from('password_reset_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (error || !row) return { error: 'No hay un código de recuperación activo para este correo' }
    if (new Date() > new Date(row.expires_at)) {
      await admin.from('password_reset_codes').delete().eq('email', normalizedEmail)
      return { error: 'El código ha expirado. Solicita uno nuevo.' }
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      await admin.from('password_reset_codes').delete().eq('email', normalizedEmail)
      return { error: 'Has excedido el número máximo de intentos. Solicita un nuevo código.' }
    }
    if (row.code !== code.trim()) {
      await admin.from('password_reset_codes').update({ attempts: row.attempts + 1 }).eq('email', normalizedEmail)
      return { error: `Código incorrecto. Te quedan ${MAX_ATTEMPTS - row.attempts - 1} intentos.` }
    }

    // Code correct — generate reset token valid 15 min
    const resetToken = crypto.randomUUID()
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    await admin.from('password_reset_codes').update({
      verified: true,
      reset_token: resetToken,
      reset_token_expires_at: resetTokenExpiresAt,
    }).eq('email', normalizedEmail)

    return { success: true, resetToken, message: 'Código verificado correctamente' }
  } catch (error) {
    console.error('Error in verifyResetCode:', error)
    return { error: 'Error de conexión con el servidor' }
  }
}

export async function resetPassword(email: string, resetToken: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!password || password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres' }

  try {
    const admin = createAdminClient()
    const { data: row, error } = await admin
      .from('password_reset_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (error || !row || !row.verified || row.reset_token !== resetToken) {
      return { error: 'El token de recuperación no es válido. Inicia el proceso nuevamente.' }
    }
    if (new Date() > new Date(row.reset_token_expires_at)) {
      await admin.from('password_reset_codes').delete().eq('email', normalizedEmail)
      return { error: 'El token ha expirado. Inicia el proceso nuevamente.' }
    }

    // Find user and update password
    const { data: { users } } = await admin.auth.admin.listUsers()
    const user = users.find(u => u.email?.toLowerCase() === normalizedEmail)
    if (!user) return { error: 'No se encontró un usuario con ese correo' }

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password })
    if (updateError) return { error: updateError.message }

    await admin.from('password_reset_codes').delete().eq('email', normalizedEmail)

    return { success: true, message: 'Contraseña actualizada exitosamente' }
  } catch (error) {
    console.error('Error in resetPassword:', error)
    return { error: 'Error de conexión con el servidor' }
  }
}

export async function getUser() {
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

export async function getUserRole() {
  const supabase = await createClient()
  let user = null
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser()
    user = fetchedUser
  } catch {
    user = null
  }

  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role || 'user'
}

export async function isAdmin() {
  const user = await getUser()
  if (!user || !user.email) return false
  return user.email.toLowerCase() === ADMIN_EMAIL
}



