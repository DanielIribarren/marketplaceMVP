import { redirect } from 'next/navigation'
import { getUser, isAdmin } from '@/app/actions/auth'
import { getMyDrafts } from '@/app/actions/mvp'
import { Navbar } from '@/components/navbar'
import { MyMvpsClient } from './MyMvpsClient'

export default async function MyMvpsPage() {
  const user = await getUser()
  console.log('🔍 [MyMvpsPage] Usuario:', user?.id)

  if (!user) {
    redirect('/login')
  }

  const userIsAdmin = await isAdmin()
  const result = await getMyDrafts()
  console.log('🔍 [MyMvpsPage] Resultado completo de getMyDrafts:', JSON.stringify(result, null, 2))
  console.log('🔍 [MyMvpsPage] MVPs encontrados:', result?.data?.length || 0)

  const { data: mvps = [] } = result

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} isAdmin={userIsAdmin} />
      <MyMvpsClient initialMvps={mvps} isAdmin={userIsAdmin} />
    </div>
  )
}
