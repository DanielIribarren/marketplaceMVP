import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  // Send restoration email
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'
    await fetch(`${BACKEND_URL}/api/admin/notify-account-restored`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email })
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
