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

  // Get user display name for the email before deleting
  const { data: profile } = await adminClient.from('user_profiles').select('display_name').eq('id', userId).single()
  const userName = profile?.display_name || null

  // Send ban email before deleting (after deletion the user won't receive notifications)
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'
    await fetch(`${BACKEND_URL}/api/admin/notify-account-banned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email, userName })
    }).catch(() => {})
  }

  // Delete all meetings where this user is requester or owner
  await adminClient.from('meetings').delete().eq('requester_id', userId)
  await adminClient.from('meetings').delete().eq('owner_id', userId)

  // Delete all MVPs owned by this user (also cascades their meetings)
  await adminClient.from('mvps').delete().eq('owner_id', userId)

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  await adminClient.from('banned_users').upsert({ email: email.toLowerCase(), reason: reason || 'Actividad sospechosa', banned_at: new Date().toISOString() }, { onConflict: 'email' })
  return NextResponse.json({ success: true })
}
