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
  const { mvpId } = await request.json()
  if (!mvpId) return NextResponse.json({ error: 'mvpId es requerido' }, { status: 400 })

  const adminClient = createAdminClient()

  // Get MVP owner before deleting for notification
  const { data: mvp } = await adminClient.from('mvps').select('owner_id, title').eq('id', mvpId).single()

  // Explicitly delete all meetings for this MVP (in case CASCADE is not active in DB)
  await adminClient.from('meetings').delete().eq('mvp_id', mvpId)

  const { error } = await adminClient.from('mvps').delete().eq('id', mvpId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify MVP owner
  if (mvp) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'
      await fetch(`${BACKEND_URL}/api/admin/notify-mvp-deleted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ mvpId, mvpTitle: mvp.title, ownerId: mvp.owner_id })
      }).catch(() => {})
    }
  }

  return NextResponse.json({ success: true })
}
