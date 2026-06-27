import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateRequestId, REQUEST_ID_HEADER } from '@/lib/request/correlation';
import { applySecurityHeaders } from '@/lib/security/headers';

const isProtectedRoute = createRouteMatcher([
  '/quests(.*)',
  '/settings(.*)',
  '/api/quests(.*)',
  '/api/invites(.*)',
  '/api/milestones(.*)',
  '/api/actions(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const requestId = generateRequestId();

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const response = NextResponse.next();

  response.headers.set(REQUEST_ID_HEADER, requestId);
  applySecurityHeaders(response.headers, false);

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
