import { isAdmin } from '@/app/actions/auth'
import { MvpDetailsClient } from './MvpDetailsClient'

export default async function MVPDetailsPage() {
  const adminStatus = await isAdmin()
  return <MvpDetailsClient isAdmin={adminStatus} />
}
