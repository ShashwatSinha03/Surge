type SecurityHeaders = Record<string, string>;

const SELF = "'self'";
const NONE = "'none'";

export function buildSecurityHeaders(isAuthenticated: boolean): SecurityHeaders {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': [
      'camera=()',
      'display-capture=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', '),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  };
}

export function buildCsp(isAuthenticated: boolean): string {
  const directives: Record<string, string[]> = {
    'default-src': [SELF],
    'script-src': [SELF],
    'style-src': [SELF, "'unsafe-inline'"],
    'img-src': [SELF, 'https://img.clerk.com', 'data:', 'blob:'],
    'font-src': [SELF, 'data:'],
    'connect-src': [
      SELF,
      'https://api.clerk.com',
      'https://clerk.surge.dev',
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [process.env.NEXT_PUBLIC_SUPABASE_URL]
        : []),
    ],
    'frame-src': [SELF, 'https://clerk.surge.dev'],
    'base-uri': [SELF],
    'form-action': [SELF],
    'frame-ancestors': [NONE],
    'upgrade-insecure-requests': [],
  };

  return Object.entries(directives)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

export function applySecurityHeaders(
  headers: Headers,
  isAuthenticated: boolean,
): void {
  const h = buildSecurityHeaders(isAuthenticated);
  for (const [key, value] of Object.entries(h)) {
    headers.set(key, value);
  }
  headers.set('Content-Security-Policy', buildCsp(isAuthenticated));
}
