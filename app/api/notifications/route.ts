import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEFAULT_PREFERENCES, type NotificationPreferences } from '@/lib/notifications';

export async function GET() {
  try {
    const user = await requireUser();
    const prefs = parsePrefs(user.notificationPrefsJson);
    return NextResponse.json(prefs);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json() as Partial<NotificationPreferences>;

    const current = parsePrefs(user.notificationPrefsJson);
    const updated: NotificationPreferences = {
      emailEnabled: body.emailEnabled ?? current.emailEnabled,
      applicationUpdates: body.applicationUpdates ?? current.applicationUpdates,
      newJobs: body.newJobs ?? current.newJobs,
      weeklyDigest: body.weeklyDigest ?? current.weeklyDigest,
      approvalAlerts: body.approvalAlerts ?? current.approvalAlerts,
    };

    await db.user.update({
      where: { id: user.id },
      data: { notificationPrefsJson: JSON.stringify(updated) },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid request' },
      { status: 400 }
    );
  }
}

function parsePrefs(raw: string | undefined | null): NotificationPreferences {
  try {
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
