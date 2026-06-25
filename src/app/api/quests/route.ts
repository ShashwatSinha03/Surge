import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { createQuestSchema } from '@/lib/validations/quest';
import { createQuestService } from '@/features/quests/services/createQuest';

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createQuestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { title, description, template_type } = parsed.data;

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  if (!user) {
    return NextResponse.json(
      { error: 'User not found. Please try signing in again.' },
      { status: 404 }
    );
  }

  const result = await createQuestService({
    title,
    description: description ?? null,
    template_type,
    actorId: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.entity, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single<{ id: string }>();

  if (!user) {
    return NextResponse.json({ quests: [] });
  }

  const { data: memberships } = await supabase
    .from('quest_members')
    .select('quest_id')
    .eq('user_id', user.id);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ quests: [] });
  }

  const questIds = memberships.map((m) => m.quest_id);

  const { data: quests } = await supabase
    .from('quests')
    .select('*')
    .in('id', questIds)
    .neq('status', 'deleted')
    .order('updated_at', { ascending: false });

  return NextResponse.json({ quests: quests ?? [] });
}
