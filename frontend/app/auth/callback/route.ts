import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/welcome'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if email is banned
      try {
        const { data: { user: cbUser } } = await supabase.auth.getUser()
        if (cbUser?.email) {
          const adminClient = createAdminClient()
          const { data: banData } = await adminClient
            .from('banned_users')
            .select('email')
            .eq('email', cbUser.email.toLowerCase())
            .maybeSingle()
          if (banData) {
            await supabase.auth.signOut()
            return NextResponse.redirect(new URL('/login?error=banned', requestUrl.origin))
          }
        }
      } catch { /* ignore */ }
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // If there's an error or no code, redirect to login with error
  return NextResponse.redirect(new URL('/login?error=verification_failed', requestUrl.origin))
}
