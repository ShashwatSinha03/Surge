import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { acceptInviteSchema } from '@/features/invites/schemas';
import { acceptInviteService } from '@/features/invites/services/acceptInvite';

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const result = await acceptInviteService({
    token: parsed.data.token,
    actorId: user.id,
  });

  if (!result.success) {
    const status =
      result.error.includes('already') ? 410 :
      result.error.includes('expired') ? 410 :
      result.error.includes('revoked') ? 410 :
      result.error.includes('Invalid') ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  const questId = (result as any).entity?.quest_id ?? (result as any).event?.quest_id ?? '';
  return NextResponse.json({ quest_id: questId, message: 'Invite accepted.' }, { status: 200 });
}
