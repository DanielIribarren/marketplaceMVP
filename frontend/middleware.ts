import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ADMIN_EMAIL = 'admin123@correo.unimet.edu.ve'

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie)
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...(options as object) })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...(options as object) })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: '', ...(options as object) })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...(options as object) })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const email = user?.email?.toLowerCase() ?? ''
  const isAdmin = email === ADMIN_EMAIL

  // Si admin autenticado entra a /login => /admin
  if (pathname === '/login' && isAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    const redirectRes = NextResponse.redirect(url)
    copyCookies(response, redirectRes)
    return redirectRes
  }

  // Proteger /admin para solo el correo admin
  if (pathname.startsWith('/admin')) {
    if (!user || !isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'unauthorized')
      const redirectRes = NextResponse.redirect(url)
      copyCookies(response, redirectRes)
      return redirectRes
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
    // evita assets internos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
