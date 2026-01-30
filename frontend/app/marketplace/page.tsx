import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { Navbar } from '@/components/navbar'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function MarketplacePage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <Link href="/publish">
            <Button size="lg">Publicar MVP</Button>
          </Link>
        </div>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">
            Vista del marketplace en desarrollo
          </p>
        </div>
      </div>
    </div>
  )
}
