import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminWelcomeAnimation } from './AdminWelcomeAnimation'

const ADMIN_EMAIL = 'admin123@correo.unimet.edu.ve'

export default async function AdminWelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    redirect('/login')
  }

  return <AdminWelcomeAnimation redirectTo="/admin" />
}
