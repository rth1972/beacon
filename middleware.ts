import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const token = process.env.NTFY_TOKEN
  if (!token) return NextResponse.next() // auth disabled

  const { pathname } = req.nextUrl

  // Always allow login page and static assets
  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // API routes: checked in the route handlers themselves (Authorization header)
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Browser pages: check cookie
  const cookie = req.cookies.get('ntfy_token')?.value ?? ''
  if (cookie !== token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
