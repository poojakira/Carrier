import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const { paused } = await req.json();
    const user = await db.user.update({
      where: { id: u.id },
      data: { automationPaused: Boolean(paused) },
    });
    await audit(u.id, paused ? 'AUTOMATION_PAUSED' : 'AUTOMATION_RESUMED', 'automation');
    return NextResponse.json({ paused: user.automationPaused });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
