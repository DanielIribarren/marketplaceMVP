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
  const { mvpId } = await request.json()
  if (!mvpId) return NextResponse.json({ error: 'mvpId es requerido' }, { status: 400 })

  const adminClient = createAdminClient()

  // Get MVP owner before deleting for notification
  const { data: mvp } = await adminClient.from('mvps').select('owner_id, title').eq('id', mvpId).single()

  // Explicitly delete all meetings for this MVP (in case CASCADE is not active in DB)
  await adminClient.from('meetings').delete().eq('mvp_id', mvpId)

  const { error } = await adminClient.from('mvps').delete().eq('id', mvpId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify MVP owner directly (no Railway)
  if (mvp) {
    const notification = {
      type: 'mvp_deleted',
      title: 'MVP eliminado por administración',
      message: `Tu MVP "${mvp.title}" fue eliminado por el equipo de administración.`,
      data: { mvp_id: mvpId, href: '/publish' },
    }
    try {
      await adminClient.from('notifications').insert({ ...notification, user_id: mvp.owner_id, read: false })
    } catch { /* silent */ }
    try {
      const { data } = await adminClient.auth.admin.getUserById(mvp.owner_id)
      const email = data?.user?.email
      if (email) await sendNotificationEmail(email, notification)
    } catch { /* silent */ }
  }

  return NextResponse.json({ success: true })
}
