import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { Navbar } from '@/components/navbar'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      <CalendarClient userId={user.id} />
    </div>
  )
}
