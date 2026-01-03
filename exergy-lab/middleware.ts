import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing',
  '/api/webhooks(.*)',
])

// Define routes that should be completely public (no auth check at all)
const isStaticRoute = createRouteMatcher([
  '/api/health',
  '/api/og(.*)',
])

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Skip auth for static/health routes
  if (isStaticRoute(request)) {
    return NextResponse.next()
  }

  // For public routes, just continue (auth is optional)
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // For all other routes, require authentication
  const { userId } = await auth()

  if (!userId) {
    // Redirect to sign-in for protected routes
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
