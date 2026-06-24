import { NextRequest, NextResponse } from 'next/server';
import { handleActionTransition } from '@/lib/execution/handle-transition';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await params;
  return handleActionTransition(req, resolved, 'claimed', (action, userId) => {
    if (action.owner_id) {
      return 'This action is already claimed.';
    }
    return null;
  });
}
