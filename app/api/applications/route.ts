import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { evaluatePolicy } from '@/lib/policy';
import { tailorResume, generateCoverLetter, type ProfileData, type ProjectEntry, type EducationEntry } from '@/lib/resume-tailor';
import {
  sendEmail,
  shouldNotify,
  notifyApplicationPrepared,
  notifyApprovalNeeded,
  DEFAULT_PREFERENCES,
  type NotificationPreferences,
} from '@/lib/notifications';

export async function GET() {
  try {
    const u = await requireUser();
    const apps = await db.application.findMany({
      where: { userId: u.id },
      include: { job: true, events: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(apps);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const { jobId } = await req.json();

    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const existing = await db.application.findUnique({
      where: { userId_jobId: { userId: u.id, jobId } },
    });
    if (existing) return NextResponse.json(existing);

    // ─── Policy evaluation ───────────────────────────────────────────────
    const policy = await db.policy.findFirst({
      where: { userId: u.id, enabled: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!policy) return NextResponse.json({ error: 'No active policy' }, { status: 409 });

    const decision = evaluatePolicy(job, policy, false, u.automationPaused);
    const status = decision.allowed
      ? (decision.requiresApproval ? 'READY' : 'SUBMITTING')
      : 'READY';

    // ─── Resume tailoring (XYZ/STAR format) ──────────────────────────────
    const profile = u.profile;
    let tailoredContent = `Application for ${job.title} at ${job.company}.\n\nGenerated from verified profile evidence only.`;
    let coverLetter = tailoredContent;
    let resumeVersion = profile?.canonicalResumeVersion || 'v1';
    let tailoringMeta: Record<string, unknown> = {};

    if (profile) {
      const profileData: ProfileData = {
        name: u.name,
        headline: profile.headline,
        summary: profile.summary,
        location: profile.location,
        workAuth: profile.workAuth,
        skills: safeJsonArray(profile.skillsJson),
        projects: safeJsonArray<ProjectEntry>(profile.projectsJson),
        education: safeJsonArray<EducationEntry>(profile.educationJson),
        certifications: safeJsonArray(profile.certificationsJson),
        resumeText: profile.resumeText,
      };

      const jobContext = {
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: safeJsonArray(job.requirementsJson),
        location: job.location,
        remote: job.remote,
      };

      const tailored = tailorResume(profileData, jobContext);
      tailoredContent = tailored.content;
      resumeVersion = tailored.version;

      coverLetter = generateCoverLetter(profileData, jobContext, tailored.matchedKeywords);

      // Store HTML version and keyword data for the application record
      tailoringMeta = {
        format: tailored.format,
        injectedKeywords: tailored.injectedKeywords,
        matchedKeywords: tailored.matchedKeywords,
        templateRules: {
          font: tailored.templateRules.font.family,
          bodySize: tailored.templateRules.font.bodySize,
          nameSize: tailored.templateRules.font.nameSize,
          margins: tailored.templateRules.layout.margins,
        },
        notes: tailored.tailoringNotes,
      };
    }

    // ─── Create application record ───────────────────────────────────────
    const app = await db.application.create({
      data: {
        userId: u.id,
        jobId,
        status,
        adapter: job.source,
        resumeVersion,
        coverLetter,
        answersJson: '[]',
        applyUrl: job.url,
        events: {
          create: {
            status,
            note: decision.reasons.length
              ? decision.reasons.join(' ')
              : 'Policy passed; application prepared with tailored XYZ/STAR resume.',
            metadataJson: JSON.stringify({
              ...decision,
              tailoring: {
                ...tailoringMeta,
                resumeVersion,
                tailoredAt: new Date().toISOString(),
              },
            }),
          },
        },
      },
    });

    await audit(u.id, 'APPLICATION_PREPARED', 'application', app.id, {
      ...decision,
      resumeVersion,
      tailoringFormat: 'xyz_star',
    });

    // ─── Send notifications ──────────────────────────────────────────────
    const prefs = parseNotificationPrefs(u.notificationPrefsJson);

    if (decision.requiresApproval) {
      if (shouldNotify('approval_needed', prefs)) {
        const payload = notifyApprovalNeeded(u.email, {
          jobTitle: job.title,
          company: job.company,
          reasons: decision.reasons,
        });
        // Fire and forget — don't block the response
        sendEmail(payload).catch(() => {});
      }
    } else {
      if (shouldNotify('application_prepared', prefs)) {
        const payload = notifyApplicationPrepared(u.email, {
          jobTitle: job.title,
          company: job.company,
          matchScore: job.overallFit,
          status,
        });
        sendEmail(payload).catch(() => {});
      }
    }

    return NextResponse.json({
      application: app,
      decision,
      tailoring: {
        format: 'xyz_star_combined',
        resumeVersion,
        coverLetterGenerated: true,
        ...tailoringMeta,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid request' },
      { status: 400 }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeJsonArray<T = string>(raw: string | null | undefined): T[] {
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function parseNotificationPrefs(raw: string | null | undefined): NotificationPreferences {
  try {
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
