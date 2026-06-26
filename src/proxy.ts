import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateRequestId, REQUEST_ID_HEADER } from '@/lib/request/correlation';
import { RateLimiter } from '@/lib/rate-limit/tokenBucket';
import { getRateLimitCategory, buildRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit/rates';
import { applySecurityHeaders } from '@/lib/security/headers';
import { logger } from '@/lib/logging/logger';
import { bootstrap } from '@/lib/bootstrap';

bootstrap();

const isProtectedRoute = createRouteMatcher([
  '/quests(.*)',
  '/settings(.*)',
  '/api/quests(.*)',
  '/api/invites(.*)',
  '/api/milestones(.*)',
  '/api/actions(.*)',
]);

const isApiRoute = createRouteMatcher([
  '/api/(.*)',
]);

const globalLimiter = new RateLimiter();

export default clerkMiddleware(async (auth, req) => {
  const start = Date.now();
  const requestId = generateRequestId();
  const url = new URL(req.url);
  const pathname = url.pathname;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const method = req.method;
  let userId: string | undefined;
  let status = 200;

  try {
    /* ---- Rate limiting ---- */
    const category = getRateLimitCategory(pathname);
    const limit = RATE_LIMITS[category] ?? RATE_LIMITS.default;

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';

    const authResult = await auth();
    userId = authResult.userId ?? undefined;

    const identifier = userId ?? clientIp;
    const rateLimitKey = buildRateLimitKey(identifier, category);

    if (!globalLimiter.check(rateLimitKey, limit.maxTokens, limit.refillRate, limit.refillInterval)) {
      const retryAfter = Math.ceil(globalLimiter.ttl(rateLimitKey) / 1000);
      const body = JSON.stringify({
        error: 'Too many requests',
        retryAfter,
        requestId,
      });
      status = 429;
      const response = new NextResponse(body, {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          [REQUEST_ID_HEADER]: requestId,
        },
      });
      applySecurityHeaders(response.headers, !!userId);
      logger.request({ requestId, method, path: pathname, status, duration: Date.now() - start, userId });
      return response;
    }

    /* ---- Authentication ---- */
    if (isProtectedRoute(req)) {
      await auth.protect();
    }

    /* ---- Build response with headers ---- */
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    response.headers.set(REQUEST_ID_HEADER, requestId);
    applySecurityHeaders(response.headers, !!userId);

    logger.request({ requestId, method, path: pathname, status, duration: Date.now() - start, userId });
    return response;
  } catch (error: unknown) {
    /* ---- Error in middleware (auth failure, etc.) ---- */
    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    /* Don't log auth redirects at error level — Clerk sends these for unauthenticated users */
    if (errMsg.includes('redirect') || errMsg.includes('Unauthenticated')) {
      status = 401;
      logger.request({ requestId, method, path: pathname, status, duration: Date.now() - start, userId });
    } else {
      status = 500;
      logger.request({ requestId, method, path: pathname, status, duration: Date.now() - start, userId, error: errMsg });
    }

    throw error;
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
