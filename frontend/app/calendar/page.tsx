import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar isAuthenticated={true} />
      <CalendarClient userId={user.id} />
    </div>
  )
}