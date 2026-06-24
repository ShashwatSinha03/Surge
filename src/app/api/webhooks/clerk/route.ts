import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createServerClient } from '@/lib/supabase/server';

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address: string }[];
    first_name?: string;
    last_name?: string;
    image_url?: string;
    username?: string;
  };
};

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url, username } =
      event.data;

    const email = email_addresses?.[0]?.email_address ?? '';
    const name =
      first_name && last_name
        ? `${first_name} ${last_name}`
        : username ?? email.split('@')[0];

    const supabase = createServerClient();

    const { error } = await supabase.from('users').upsert(
      {
        clerk_user_id: id,
        email,
        name,
        avatar_url: image_url ?? null,
      },
      { onConflict: 'clerk_user_id' }
    );

    if (error) {
      return NextResponse.json(
        { error: 'Failed to sync user' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
