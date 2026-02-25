'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  console.log('[LOGIN] Attempting login for:', data.email)
  console.log('[LOGIN] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('[LOGIN] Error:', error.message, '| Status:', error.status)
    return { error: error.message }
  }

  console.log('[LOGIN] Success! User:', authData.user?.email)

  revalidatePath('/', 'layout')
  redirect('/marketplace')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Sign out any existing session before creating a new account
  await supabase.auth.signOut()

  const email = formData.get('email') as string
  const displayName = formData.get('display_name') as string

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

  // Auto-create user_profiles record so the profile is ready immediately
  if (authData?.user) {
    await supabase
      .from('user_profiles')
      .upsert({ user_id: authData.user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
  }

  revalidatePath('/', 'layout')
  redirect('/marketplace')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.message || 'Error al enviar el código' }
    }

    return { success: true, message: data.message }
  } catch (error) {
    return { error: 'Error de conexión con el servidor' }
  }
}

export async function verifyResetCode(email: string, code: string) {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.message || 'Código incorrecto' }
    }

    return { success: true, resetToken: data.resetToken, message: data.message }
  } catch (error) {
    return { error: 'Error de conexión con el servidor' }
  }
}

export async function resetPassword(email: string, resetToken: string, password: string) {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resetToken, password })
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.message || 'Error al actualizar la contraseña' }
    }

    return { success: true, message: data.message }
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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



