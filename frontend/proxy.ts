import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ADMIN_EMAIL = 'admin123@correo.unimet.edu.ve'

export async function proxy(request: NextRequest) {
  try {
    const response = NextResponse.next()
    const pathname = request.nextUrl.pathname

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      // Sin vars, solo proteger admin redirigiendo a login
      if (pathname.startsWith('/admin')) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
      return response
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    const email = user?.email?.toLowerCase() ?? ''
    const isAdmin = email === ADMIN_EMAIL

    if (pathname === '/login' && isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/admin') && (!user || !isAdmin)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }

    return response
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
