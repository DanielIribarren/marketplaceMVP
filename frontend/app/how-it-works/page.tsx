import { getUser } from '@/app/actions/auth'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HowItWorksClient } from './HowItWorksClient'

export default async function HowItWorksPage() {
  let isAuthenticated = false
  try {
    const user = await getUser()
    isAuthenticated = !!user
  } catch {
    isAuthenticated = false
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar isAuthenticated={isAuthenticated} />
      <HowItWorksClient />
      <Footer />
    </div>
  )
}