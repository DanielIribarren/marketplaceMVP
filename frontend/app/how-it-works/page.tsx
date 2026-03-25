import { getUser, isAdmin as checkIsAdmin } from '@/app/actions/auth'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HowItWorksClient } from './HowItWorksClient'

export default async function HowItWorksPage() {
  let isAuthenticated = false
  let userIsAdmin = false
  try {
    const user = await getUser()
    isAuthenticated = !!user
    userIsAdmin = await checkIsAdmin()
  } catch {
    isAuthenticated = false
    userIsAdmin = false
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={isAuthenticated} isAdmin={userIsAdmin} />
      <div className="overflow-x-hidden">
        <HowItWorksClient isAuthenticated={isAuthenticated} />
        <div className="-mt-20">
          <Footer />
        </div>
      </div>
    </div>
  )
}