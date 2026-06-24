import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { createInviteSchema } from '@/features/invites/schemas';
import { getCallerMembership, canManageInvites } from '@/lib/permissions/quest';
import { createInviteService } from '@/features/invites/services/createInvite';

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { quest_id, email } = parsed.data;

  const membership = await getCallerMembership(quest_id, clerkUserId);
  if (!membership || !canManageInvites(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  const result = await createInviteService({
    quest_id,
    email: email ?? null,
    actorId: user!.id,
  });

  if (!result.success) {
    if (result.error.includes('already exists')) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(
    {
      ...result.entity,
      token_hash: undefined,
      token: (result as any).rawToken,
    },
    { status: 201 }
  );
}
