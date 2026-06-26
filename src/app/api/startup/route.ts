import { NextResponse } from 'next/server';
import { getEnv, validateEnv } from '@/lib/env';

export async function GET() {
  try {
    validateEnv();
    const env = getEnv();
    return NextResponse.json({
      status: 'ok',
      environment: env.NODE_ENV,
      supabase: !!env.NEXT_PUBLIC_SUPABASE_URL,
      clerk: !!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Validation failed' },
      { status: 500 },
    );
  }
}
