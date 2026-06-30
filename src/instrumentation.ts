import { validateEnv } from '@/lib/env';

export async function register() {
  try {
    validateEnv();
    console.log('[surge] Environment validated successfully');
  } catch (error) {
    console.error('[surge] Environment validation failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}
