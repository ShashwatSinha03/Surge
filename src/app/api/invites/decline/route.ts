import { NextRequest, NextResponse } from 'next/server';
import { declineInviteSchema } from '@/features/invites/schemas';
import { declineInviteService } from '@/features/invites/services/declineInvite';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = declineInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const result = await declineInviteService({ token: parsed.data.token });

  if (!result.success) {
    const status = result.code === 'INVALID_INVITE' ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ message: 'Invite declined.' }, { status: 200 });
}
