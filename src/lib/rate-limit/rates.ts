export type RateLimitConfig = {
  maxTokens: number;
  refillRate: number;
  refillInterval: number;
};

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { maxTokens: 10, refillRate: 1, refillInterval: 60000 },
  search: { maxTokens: 60, refillRate: 10, refillInterval: 60000 },
  invites: { maxTokens: 20, refillRate: 2, refillInterval: 60000 },
  mutations: { maxTokens: 120, refillRate: 30, refillInterval: 60000 },
  command: { maxTokens: 60, refillRate: 10, refillInterval: 60000 },
  default: { maxTokens: 200, refillRate: 50, refillInterval: 60000 },
};

export function getRateLimitCategory(pathname: string): keyof typeof RATE_LIMITS {
  if (pathname.startsWith('/api/invites')) return 'invites';
  if (pathname.startsWith('/api/search')) return 'search';
  if (pathname.startsWith('/api/actions') || pathname.startsWith('/api/milestones') || pathname.startsWith('/api/quests')) return 'mutations';
  if (pathname.startsWith('/api/commands') || pathname.startsWith('/api/command')) return 'command';
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) return 'auth';
  return 'default';
}

export function buildRateLimitKey(
  identifier: string,
  category: string,
): string {
  return `${identifier}:${category}`;
}
