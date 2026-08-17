import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { generatePortfolio, PortfolioProfile, PortfolioStyle } from '@/lib/portfolio-generator';

const VALID_STYLES: PortfolioStyle[] = [
  'Minimal Dark',
  'Gradient Modern',
  'Cyberpunk Neon',
  'Clean Professional',
  'Creative Artistic',
];

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { style, customDescription } = body as {
    style?: string;
    customDescription?: string;
  };

  if (!style || !VALID_STYLES.includes(style as PortfolioStyle)) {
    return NextResponse.json(
      { error: 'Invalid style. Choose from: ' + VALID_STYLES.join(', ') },
      { status: 400 }
    );
  }

  // Build profile from user data
  const p = user.profile;
  const skills: string[] = p?.skillsJson ? JSON.parse(p.skillsJson) : [];
  const projects: PortfolioProfile['projects'] = p?.projectsJson
    ? JSON.parse(p.projectsJson)
    : [];
  const education: PortfolioProfile['education'] = p?.educationJson
    ? JSON.parse(p.educationJson)
    : [];

  // Parse experience from resume text (simple extraction)
  const experience: PortfolioProfile['experience'] = [];
  // If projects have structured data use them directly;
  // experience is best-effort from available fields.

  const profile: PortfolioProfile = {
    name: user.name,
    headline: p?.headline || p?.targetRole || '',
    summary: p?.summary || '',
    location: p?.location || '',
    email: user.email,
    skills,
    projects,
    experience,
    education,
  };

  const html = generatePortfolio(profile, style as PortfolioStyle, customDescription || '');

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
