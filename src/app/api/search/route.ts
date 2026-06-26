import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { questSearchProvider } from '@/features/search/providers/questSearch';
import { actionSearchProvider } from '@/features/search/providers/actionSearch';
import { milestoneSearchProvider } from '@/features/search/providers/milestoneSearch';
import { memberSearchProvider } from '@/features/search/providers/memberSearch';
import type { SearchResult, CommandContext } from '@/features/commands/types';

export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ results: [] });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const questId = searchParams.get('questId');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  if (!user) {
    return NextResponse.json({ results: [] });
  }

  const context: CommandContext = {
    pathname: questId ? `/quests/${questId}` : '/quests',
    questId: questId ?? undefined,
    userId: user.id,
  };

  const providers = [
    questSearchProvider,
    ...(questId ? [actionSearchProvider, milestoneSearchProvider, memberSearchProvider] : []),
  ];

  const results: SearchResult[] = [];
  for (const provider of providers) {
    try {
      const providerResults = await provider.search(q.trim(), context);
      results.push(...providerResults);
    } catch {
      // Provider failure is isolated — continue with remaining providers
    }
  }

  return NextResponse.json({ results });
}
