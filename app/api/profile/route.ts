import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

const ALLOWED_FIELDS = new Set([
  'headline',
  'summary',
  'location',
  'skillsJson',
  'projectsJson',
  'educationJson',
  'certificationsJson',
  'resumeText',
  'yearsOfExperience',
  'targetRole',
]);

export async function GET() {
  try {
    const u = await requireUser();
    return NextResponse.json(u.profile);
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
    const b = await req.json();

    const unknownFields = Object.keys(b).filter((k) => !ALLOWED_FIELDS.has(k));
    if (unknownFields.length > 0) {
      return NextResponse.json(
        { error: `Unknown fields: ${unknownFields.join(', ')}` },
        { status: 400 }
      );
    }

    const profile = await db.careerProfile.upsert({
      where: { userId: u.id },
      update: {
        ...b,
        targetRolesJson:
          typeof b.targetRolesJson === 'string'
            ? b.targetRolesJson
            : JSON.stringify(b.targetRoles || []),
        skillsJson:
          typeof b.skillsJson === 'string'
            ? b.skillsJson
            : JSON.stringify(b.skills || []),
        targetLocationsJson:
          typeof b.targetLocationsJson === 'string'
            ? b.targetLocationsJson
            : JSON.stringify(b.targetLocations || []),
        projectsJson:
          typeof b.projectsJson === 'string'
            ? b.projectsJson
            : JSON.stringify(b.projects || []),
      },
      create: { userId: u.id },
    });
    await audit(u.id, 'PROFILE_UPDATED', 'profile', profile.id);
    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
