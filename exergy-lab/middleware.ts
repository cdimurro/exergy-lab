import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Temporarily disabled Clerk middleware until authentication is configured
// TODO: Re-enable when Clerk keys are configured
// import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

export function middleware(request: NextRequest) {
  // For now, just pass through all requests
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
