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
  const { userId, email, reason } = await request.json()
  if (!userId || !email) return NextResponse.json({ error: 'userId y email son requeridos' }, { status: 400 })
  const adminClient = createAdminClient()
  // Delete all MVPs owned by this user first
  await adminClient.from('mvps').delete().eq('owner_id', userId)
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  await adminClient.from('banned_users').upsert({ email: email.toLowerCase(), reason: reason || 'Actividad sospechosa', banned_at: new Date().toISOString() }, { onConflict: 'email' })
  return NextResponse.json({ success: true })
}
