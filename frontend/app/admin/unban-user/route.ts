import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotificationEmail } from '@/lib/email'

const ADMIN_EMAIL = 'admin123@correo.unimet.edu.ve'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'email es requerido' }, { status: 400 })
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('banned_users').delete().eq('email', email.toLowerCase())
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send restoration email directly (no Railway)
  sendNotificationEmail(email, {
    type: 'account_restored',
    title: 'Cuenta restaurada',
    message: 'Tu cuenta ha sido restaurada. Ya puedes volver a acceder a MVP Marketplace.',
    data: { href: '/' },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
