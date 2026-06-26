import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('validateEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function setValidEnv() {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_key';
    process.env.CLERK_SECRET_KEY = 'sk_test_key';
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.SUPABASE_DB_HOST = 'db.example.com';
    process.env.SUPABASE_DB_NAME = 'surge';
    process.env.SUPABASE_DB_USER = 'postgres';
    process.env.SUPABASE_DB_PASSWORD = 'password';
  }

  it('parses all required vars successfully', async () => {
    setValidEnv();
    delete process.env.NODE_ENV;
    const { validateEnv } = await import('@/lib/env');
    const env = validateEnv();
    expect(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe('pk_test_key');
  });

  it('defaults SUPABASE_DB_PORT to 6543 when not set', async () => {
    setValidEnv();
    delete process.env.NODE_ENV;
    delete process.env.SUPABASE_DB_PORT;
    const { validateEnv } = await import('@/lib/env');
    const env = validateEnv();
    expect(env.SUPABASE_DB_PORT).toBe(6543);
  });

  it('coerces SUPABASE_DB_PORT from string to number', async () => {
    setValidEnv();
    delete process.env.NODE_ENV;
    process.env.SUPABASE_DB_PORT = '5432';
    const { validateEnv } = await import('@/lib/env');
    const env = validateEnv();
    expect(env.SUPABASE_DB_PORT).toBe(5432);
  });

  it('throws on missing required variable', async () => {
    setValidEnv();
    delete process.env.NODE_ENV;
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const { validateEnv } = await import('@/lib/env');
    expect(() => validateEnv()).toThrow('Environment validation failed');
  });

  it('includes field name in the error for missing vars', async () => {
    setValidEnv();
    delete process.env.NODE_ENV;
    delete process.env.CLERK_SECRET_KEY;
    const { validateEnv } = await import('@/lib/env');
    expect(() => validateEnv()).toThrow('CLERK_SECRET_KEY');
  });

  it('rejects invalid SUPABASE_URL', async () => {
    setValidEnv();
    delete process.env.NODE_ENV;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url';
    const { validateEnv } = await import('@/lib/env');
    expect(() => validateEnv()).toThrow('Supabase URL must be a valid URL');
  });

  it('defaults NODE_ENV to development when unset', async () => {
    setValidEnv();
    delete process.env.NODE_ENV;
    const { validateEnv } = await import('@/lib/env');
    const env = validateEnv();
    expect(env.NODE_ENV).toBe('development');
  });

  it('accepts NODE_ENV test from Vitest environment', async () => {
    setValidEnv();
    const { validateEnv } = await import('@/lib/env');
    const env = validateEnv();
    expect(env.NODE_ENV).toBe('test');
  });

  it('caches result on first call and skips re-validation', async () => {
    setValidEnv();
    delete process.env.NODE_ENV;
    const { validateEnv, getEnv } = await import('@/lib/env');
    const first = validateEnv();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const second = getEnv();
    expect(second).toBe(first);
  });
});
