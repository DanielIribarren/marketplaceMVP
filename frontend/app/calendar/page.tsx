import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/app/actions/auth'
import { Navbar } from '@/components/navbar'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userIsAdmin = await isAdmin()

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar isAuthenticated={true} isAdmin={userIsAdmin} />
      <CalendarClient userId={user.id} />
    </div>
  )
}