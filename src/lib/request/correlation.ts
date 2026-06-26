export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') ?? generateRequestId();
}

export const REQUEST_ID_HEADER = 'x-request-id';
