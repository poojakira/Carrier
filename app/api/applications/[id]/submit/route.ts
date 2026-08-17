import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { GreenhouseAdapter, LeverAdapter } from '@/lib/adapters';
import { audit } from '@/lib/audit';
import {
  sendEmail,
  shouldNotify,
  notifyApplicationSubmitted,
  DEFAULT_PREFERENCES,
  type NotificationPreferences,
} from '@/lib/notifications';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await params;
    const app = await db.application.findFirst({
      where: { id, userId: u.id },
      include: { job: true },
    });
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    if (u.automationPaused) return NextResponse.json({ error: 'Automation is paused globally.' }, { status: 409 });

    // Manual source — user must apply themselves
    if (app.job.source === 'manual') {
      return NextResponse.json({ needsUserAction: true, applyUrl: app.applyUrl || app.job.url });
    }

    const body = await req.json().catch(() => ({}));
    const candidate = { name: u.name, email: u.email, resumeText: u.profile?.resumeText || '' };

    // ─── Greenhouse submission ─────────────────────────────────────────
    if (app.job.source === 'greenhouse') {
      const boardToken = String(body.boardToken || '');
      const apiKey = String(body.apiKey || '');
      if (!boardToken || !apiKey) {
        return NextResponse.json({
          needsUserAction: true,
          reason: 'Greenhouse submission requires an authorized employer credential.',
          applyUrl: app.applyUrl || app.job.url,
        });
      }

      const result = await new GreenhouseAdapter(boardToken, apiKey).submit(
        {
          job: {
            source: 'greenhouse',
            externalId: app.job.externalId,
            company: app.job.company,
            title: app.job.title,
            location: app.job.location,
            url: app.job.url,
            description: app.job.description,
            applyUrl: app.applyUrl || app.job.url,
          },
          candidate,
          resumeVersion: app.resumeVersion,
          coverLetter: app.coverLetter,
          answers: [],
        },
        body.answers || {}
      );

      const updated = await db.application.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          submissionRef: result.externalReference,
          submissionTimestamp: new Date(result.submittedAt),
          confirmationJson: JSON.stringify(result.confirmation),
        },
        include: { job: true },
      });
      await db.applicationEvent.create({
        data: {
          applicationId: id,
          status: 'SUBMITTED',
          note: 'Provider confirmed application submission.',
          metadataJson: JSON.stringify(result),
        },
      });
      await audit(u.id, 'APPLICATION_SUBMITTED', 'application', id, { provider: 'greenhouse' });

      // Send notification
      await notifySubmission(u, app.job.title, app.job.company, 'greenhouse', result.externalReference);

      return NextResponse.json({ application: updated });
    }

    // ─── Lever submission ──────────────────────────────────────────────
    if (app.job.source === 'lever') {
      const apiKey = String(body.apiKey || '');
      if (!apiKey) {
        return NextResponse.json({
          needsUserAction: true,
          reason: 'Lever submission requires an authorized employer API key.',
          applyUrl: app.applyUrl || app.job.url,
        });
      }

      const result = await new LeverAdapter(app.job.company, apiKey).submit(
        app.job.externalId,
        { name: u.name, email: u.email, customQuestions: body.answers || [] }
      );

      const updated = await db.application.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          submissionRef: result.externalReference,
          submissionTimestamp: new Date(result.submittedAt),
          confirmationJson: JSON.stringify(result.confirmation),
        },
        include: { job: true },
      });
      await db.applicationEvent.create({
        data: {
          applicationId: id,
          status: 'SUBMITTED',
          note: 'Provider confirmed application submission.',
          metadataJson: JSON.stringify(result),
        },
      });
      await audit(u.id, 'APPLICATION_SUBMITTED', 'application', id, { provider: 'lever' });

      // Send notification
      await notifySubmission(u, app.job.title, app.job.company, 'lever', result.externalReference);

      return NextResponse.json({ application: updated });
    }

    // Default fallback — user needs to apply manually
    return NextResponse.json({ needsUserAction: true, applyUrl: app.applyUrl || app.job.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Submission failed' },
      { status: 400 }
    );
  }
}

// ─── Notification helper ─────────────────────────────────────────────────────

async function notifySubmission(
  user: { email: string; notificationPrefsJson?: string | null },
  jobTitle: string,
  company: string,
  adapter: string,
  submissionRef?: string
) {
  const prefs = parsePrefs(user.notificationPrefsJson);
  if (shouldNotify('application_submitted', prefs)) {
    const payload = notifyApplicationSubmitted(user.email, {
      jobTitle,
      company,
      adapter,
      submissionRef,
    });
    await sendEmail(payload).catch(() => {});
  }
}

function parsePrefs(raw: string | null | undefined): NotificationPreferences {
  try {
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
