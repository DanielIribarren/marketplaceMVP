import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { Navbar } from '@/components/navbar'
import { MyMvpsClient } from './MyMvpsClient'

export default async function MyMvpsPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} />
      <MyMvpsClient userId={user.id} />
    </div>
  )
}
