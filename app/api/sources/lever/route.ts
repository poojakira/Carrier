import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { LeverAdapter } from '@/lib/adapters';
import { calculateMatch } from '@/lib/matching';
import { audit } from '@/lib/audit';
import { sendEmail, shouldNotify, notifyNewMatchingJobs, DEFAULT_PREFERENCES, type NotificationPreferences } from '@/lib/notifications';

const schema = z.object({ company: z.string().trim().min(1), apiKey: z.string().trim().optional() });

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const raw = req.headers.get('content-type')?.includes('application/x-www-form-urlencoded') || req.headers.get('content-type')?.includes('multipart/form-data')
      ? Object.fromEntries((await req.formData()).entries())
      : await req.json();
    const d = schema.parse(raw);
    const jobs = await new LeverAdapter(d.company, d.apiKey || undefined).listJobs();
    let count = 0;
    const highMatchJobs: { title: string; company: string; matchScore: number }[] = [];

    for (const j of jobs) {
      const scores = calculateMatch(
        { ...j, source: 'lever', salaryMin: j.salaryMin ?? null, salaryMax: j.salaryMax ?? null, remote: j.remote ?? false, sponsorship: j.sponsorship ?? null, trustScore: 75, requirementsJson: '[]', riskFlagsJson: '[]', technicalFit: 0, experienceFit: 0, educationFit: 0, projectFit: 0, locationFit: 0, compensationFit: 0, authorizationFit: 0, seniorityFit: 0, careerValueFit: 0, overallFit: 0, id: '', userId: null, createdAt: new Date(), updatedAt: new Date() },
        { skills: JSON.parse(u.profile?.skillsJson || '[]'), roles: JSON.parse(u.profile?.targetRolesJson || '[]'), locations: JSON.parse(u.profile?.targetLocationsJson || '[]'), salaryMin: u.profile?.salaryMin, sponsorship: u.profile?.sponsorship, projects: JSON.parse(u.profile?.projectsJson || '[]') }
      );

      await db.job.upsert({
        where: { source_externalId: { source: 'lever', externalId: j.externalId } },
        update: { company: d.company, title: j.title, location: j.location, url: j.url, description: j.description, salaryMin: j.salaryMin, salaryMax: j.salaryMax, remote: j.remote ?? false, sponsorship: j.sponsorship ?? null, ...scores },
        create: { userId: u.id, source: 'lever', externalId: j.externalId, company: d.company, title: j.title, location: j.location, url: j.url, description: j.description, salaryMin: j.salaryMin, salaryMax: j.salaryMax, remote: j.remote ?? false, sponsorship: j.sponsorship ?? null, trustScore: 75, ...scores },
      });

      if (scores.overallFit >= 70) {
        highMatchJobs.push({ title: j.title, company: d.company, matchScore: scores.overallFit });
      }
      count++;
    }

    await audit(u.id, 'JOB_INGESTED', 'source', d.company, { provider: 'lever', count });

    // Notify about new high-match jobs
    if (highMatchJobs.length > 0) {
      const prefs = parsePrefs(u.notificationPrefsJson);
      if (shouldNotify('new_matching_jobs', prefs)) {
        const payload = notifyNewMatchingJobs(u.email, { jobs: highMatchJobs, total: highMatchJobs.length });
        sendEmail(payload).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, count, highMatches: highMatchJobs.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ingestion failed' }, { status: 400 });
  }
}

function parsePrefs(raw: string | null | undefined): NotificationPreferences {
  try { return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES; }
  catch { return DEFAULT_PREFERENCES; }
}
