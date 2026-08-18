import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const u = await requireUser();
    const [found, apps, interviews, offers] = await Promise.all([
      db.job.count(),
      db.application.count({ where: { userId: u.id } }),
      db.application.count({ where: { userId: u.id, status: 'INTERVIEW' } }),
      db.application.count({ where: { userId: u.id, status: 'OFFER' } }),
    ]);
    return NextResponse.json({
      found,
      apps,
      interviews,
      offers,
      screenRate: apps ? Math.round((interviews / apps) * 100) : 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
