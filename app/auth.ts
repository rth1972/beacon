/**
 * Auth helper — reads NTFY_TOKEN from environment.
 *
 * Set it in .env.local:
 *   NTFY_TOKEN=mysecrettoken
 *
 * Then pass it in requests:
 *   curl -H "Authorization: Bearer mysecrettoken" ...
 *   curl -H "Authorization: mysecrettoken" ...        (shorthand)
 *
 * If NTFY_TOKEN is not set, auth is disabled (open access).
 */

import { NextRequest } from 'next/server'

export function isAuthorized(req: NextRequest): boolean {
  const token = process.env.NTFY_TOKEN
  if (!token) return true // auth disabled

  const auth = req.headers.get('authorization') ?? ''
  // Accept "Bearer <token>" or bare "<token>"
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  return provided === token
}

export function unauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized — set Authorization: Bearer <token> header' },
    { status: 401 }
  )
}

// For browser UI — read token from cookie
export function isAuthorizedBrowser(req: NextRequest): boolean {
  const token = process.env.NTFY_TOKEN
  if (!token) return true
  const cookie = req.cookies.get('ntfy_token')?.value ?? ''
  return cookie === token
}
