import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';
import { REQUEST_ID_HEADER } from '@/lib/request/correlation';

type RouteHandler = (
  req: NextRequest,
  params: any,
) => Promise<NextResponse>;

type RouteContext = {
  params?: any;
  questId?: string;
  userId?: string;
};

export function withLogging(
  handler: RouteHandler,
): RouteHandler {
  return async (req, params) => {
    const start = Date.now();
    const requestId = req.headers.get(REQUEST_ID_HEADER) ?? 'unknown';
    const url = new URL(req.url);

    try {
      const response = await handler(req, params);
      const duration = Date.now() - start;

      response.headers.set(REQUEST_ID_HEADER, requestId);

      logger.request({
        requestId,
        method: req.method,
        path: url.pathname,
        status: response.status,
        duration,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.request({
        requestId,
        method: req.method,
        path: url.pathname,
        status: 500,
        duration,
        error: message,
      });

      throw error;
    }
  };
}

export function extractRequestId(req: NextRequest): string {
  return req.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
}

export function attachRequestId(response: NextResponse, requestId: string): void {
  response.headers.set(REQUEST_ID_HEADER, requestId);
}
