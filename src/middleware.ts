import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthToken } from './lib/auth'

const PUBLIC_PATHS = ['/api/auth/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated =
    request.cookies.get(AUTH_COOKIE_NAME)?.value === getAuthToken()

  if (pathname === '/login') {
    return isAuthenticated
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next()
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  if (isAuthenticated) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2)$).*)',
  ],
}
