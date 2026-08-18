import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

const DISALLOWED_FIELDS = new Set(['id', 'userId']);

export async function GET() {
  try {
    const u = await requireUser();
    return NextResponse.json(
      await db.policy.findMany({
        where: { userId: u.id },
        orderBy: { createdAt: 'desc' },
      })
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const u = await requireUser();
    const body = await req.json();

    const disallowed = Object.keys(body).filter((k) => DISALLOWED_FIELDS.has(k));
    if (disallowed.length > 0) {
      return NextResponse.json(
        { error: `Cannot update fields: ${disallowed.join(', ')}` },
        { status: 400 }
      );
    }

    const p = await db.policy.findFirst({
      where: { userId: u.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!p) return NextResponse.json({ error: 'Policy not found' }, { status: 404 });

    return NextResponse.json(
      await db.policy.update({ where: { id: p.id }, data: body })
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
