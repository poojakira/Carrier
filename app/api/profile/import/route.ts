import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { extractProfile } from '@/lib/profile-extractor';
import { parseResume } from '@/lib/resume-parser';

/**
 * POST /api/profile/import
 * 
 * Two input methods:
 * 1. URLs: { githubUrl?, linkedinUrl? } — extracts profile from GitHub/LinkedIn
 * 2. Resume text: { resumeText } — parses an old resume into structured data
 * 
 * Both methods populate the user's CareerProfile with complete data
 * suitable for generating 100% keyword-matching tailored resumes.
 */
export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = await req.json() as {
      githubUrl?: string;
      linkedinUrl?: string;
      resumeText?: string;
      mode: 'urls' | 'resume';
    };

    if (body.mode === 'urls') {
      // ─── Method 1: GitHub/LinkedIn URL extraction ─────────────────────
      if (!body.githubUrl && !body.linkedinUrl) {
        return NextResponse.json(
          { error: 'At least one URL (GitHub or LinkedIn) is required.' },
          { status: 400 }
        );
      }

      const result = await extractProfile({
        githubUrl: body.githubUrl || undefined,
        linkedinUrl: body.linkedinUrl || undefined,
      });

      // Merge extracted data into user profile
      const profileData = result.profile;
      const existing = await db.careerProfile.findUnique({ where: { userId: u.id } });

      const updateData = {
        headline: profileData.headline || existing?.headline || '',
        summary: profileData.summary || existing?.summary || '',
        location: profileData.location || existing?.location || '',
        skillsJson: JSON.stringify(profileData.skills || []),
        projectsJson: JSON.stringify(profileData.projects || []),
        educationJson: JSON.stringify(profileData.education || []),
        certificationsJson: JSON.stringify(profileData.certifications || []),
        resumeText: buildResumeTextFromProfile(profileData),
      };

      const profile = await db.careerProfile.upsert({
        where: { userId: u.id },
        update: updateData,
        create: { userId: u.id, ...updateData },
      });

      // Update user name if we got a better one
      if (profileData.name && profileData.name !== u.name) {
        await db.user.update({ where: { id: u.id }, data: { name: profileData.name } });
      }

      await audit(u.id, 'PROFILE_UPDATED', 'careerProfile', profile.id, {
        method: 'url_extraction',
        source: result.source,
        confidence: result.confidence,
        warnings: result.warnings,
      });

      return NextResponse.json({
        success: true,
        method: 'url_extraction',
        source: result.source,
        confidence: result.confidence,
        warnings: result.warnings,
        profile: {
          name: profileData.name,
          headline: profileData.headline,
          skillsCount: profileData.skills?.length || 0,
          experienceCount: profileData.projects?.length || 0,
          educationCount: profileData.education?.length || 0,
        },
      });
    }

    if (body.mode === 'resume') {
      // ─── Method 2: Upload old resume ──────────────────────────────────
      if (!body.resumeText || body.resumeText.trim().length < 50) {
        return NextResponse.json(
          { error: 'Resume text is too short. Please provide the full resume content.' },
          { status: 400 }
        );
      }

      const parsed = parseResume(body.resumeText);
      const existing = await db.careerProfile.findUnique({ where: { userId: u.id } });

      const updateData = {
        headline: parsed.headline || existing?.headline || '',
        summary: parsed.summary || existing?.summary || '',
        location: parsed.location || existing?.location || '',
        skillsJson: JSON.stringify(parsed.skills || []),
        projectsJson: JSON.stringify(parsed.projects || []),
        educationJson: JSON.stringify(parsed.education || []),
        certificationsJson: JSON.stringify(parsed.certifications || []),
        resumeText: body.resumeText, // Store the original for reference
      };

      const profile = await db.careerProfile.upsert({
        where: { userId: u.id },
        update: updateData,
        create: { userId: u.id, ...updateData },
      });

      // Update user name if parsed
      if (parsed.name && parsed.name !== u.name) {
        await db.user.update({ where: { id: u.id }, data: { name: parsed.name } });
      }

      await audit(u.id, 'PROFILE_UPDATED', 'careerProfile', profile.id, {
        method: 'resume_upload',
        skillsExtracted: parsed.skills.length,
        experienceExtracted: parsed.projects.length,
      });

      return NextResponse.json({
        success: true,
        method: 'resume_upload',
        parsed: {
          name: parsed.name,
          headline: parsed.headline,
          skillsCount: parsed.skills.length,
          experienceCount: parsed.projects.length,
          educationCount: parsed.education.length,
          certificationsCount: parsed.certifications.length,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid mode. Use "urls" or "resume".' }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Import failed' },
      { status: 400 }
    );
  }
}

// ─── Helper: Build resume text from extracted profile ──────────────────────────

function buildResumeTextFromProfile(profile: Partial<import('@/lib/resume-tailor').ProfileData>): string {
  const sections: string[] = [];

  if (profile.name) sections.push(profile.name.toUpperCase());
  if (profile.headline) sections.push(profile.headline);
  sections.push('');

  if (profile.summary) {
    sections.push('PROFESSIONAL SUMMARY');
    sections.push(profile.summary);
    sections.push('');
  }

  if (profile.skills?.length) {
    sections.push('SKILLS');
    sections.push(profile.skills.join(', '));
    sections.push('');
  }

  if (profile.projects?.length) {
    sections.push('EXPERIENCE');
    for (const proj of profile.projects) {
      const header = [proj.title, proj.company, proj.duration].filter(Boolean).join(' | ');
      sections.push(header);
      if (proj.action) sections.push(`• ${proj.action}`);
      if (proj.result && proj.result !== proj.action) sections.push(`• ${proj.result}`);
      if (proj.metrics) {
        for (const m of proj.metrics) {
          if (m !== proj.action && m !== proj.result) sections.push(`• ${m}`);
        }
      }
      sections.push('');
    }
  }

  if (profile.education?.length) {
    sections.push('EDUCATION');
    for (const edu of profile.education) {
      sections.push([edu.degree, edu.field, edu.institution, edu.year].filter(Boolean).join(' | '));
    }
    sections.push('');
  }

  if (profile.certifications?.length) {
    sections.push('CERTIFICATIONS');
    for (const cert of profile.certifications) {
      sections.push(`• ${cert}`);
    }
  }

  return sections.join('\n');
}
