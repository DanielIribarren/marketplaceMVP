import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WelcomeAnimation } from './WelcomeAnimation'

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const name =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'usuario'

  return <WelcomeAnimation name={name} />
}
