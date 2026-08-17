/**
 * Profile Extractor — GitHub & LinkedIn
 * 
 * Extracts detailed professional profile data from:
 * 1. GitHub URL → repos, languages, contributions, README, bio
 * 2. LinkedIn URL → experience, skills, education, certifications (public profile)
 * 
 * Builds a complete ProfileData object suitable for generating unrejectable resumes.
 */

import type { ProfileData, ProjectEntry, EducationEntry } from './resume-tailor';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ExtractionSource = 'github' | 'linkedin' | 'both';

export type ExtractionResult = {
  source: ExtractionSource;
  profile: Partial<ProfileData>;
  raw: {
    github?: GitHubData;
    linkedin?: LinkedInData;
  };
  confidence: number; // 0–100, how complete the extraction is
  warnings: string[];
};

export type GitHubData = {
  username: string;
  name: string;
  bio: string;
  location: string;
  company: string;
  blog: string;
  publicRepos: number;
  followers: number;
  languages: { name: string; bytes: number; percentage: number }[];
  topRepos: GitHubRepo[];
  contributions: { totalLastYear: number };
  readme?: string;
};

export type GitHubRepo = {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  topics: string[];
  url: string;
  homepage?: string;
  updatedAt: string;
};

export type LinkedInData = {
  name: string;
  headline: string;
  location: string;
  summary: string;
  experience: LinkedInExperience[];
  education: LinkedInEducation[];
  skills: string[];
  certifications: string[];
};

type LinkedInExperience = {
  title: string;
  company: string;
  duration: string;
  location?: string;
  description: string;
  current: boolean;
};

type LinkedInEducation = {
  institution: string;
  degree: string;
  field: string;
  year: string;
};

// ─── GitHub Extractor ──────────────────────────────────────────────────────────

function extractGitHubUsername(url: string): string {
  // Handle formats: https://github.com/username, github.com/username, @username
  const match = url.match(/(?:github\.com\/|^@?)([a-zA-Z0-9\-]+)/);
  if (!match) throw new Error('Invalid GitHub URL. Expected format: https://github.com/username');
  return match[1];
}

export async function extractFromGitHub(url: string): Promise<{ data: GitHubData; profile: Partial<ProfileData> }> {
  const username = extractGitHubUsername(url);
  const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Careerly-OS/1.0' };

  // If a GitHub token is configured, use it for higher rate limits
  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // 1. Fetch user profile
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
  if (!userRes.ok) throw new Error(`GitHub API error (${userRes.status}): Could not fetch user profile for "${username}"`);
  const user = await userRes.json() as {
    name: string; bio: string; location: string; company: string;
    blog: string; public_repos: number; followers: number;
    login: string;
  };

  // 2. Fetch repos (sorted by stars, max 30)
  const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=stars&per_page=30&type=owner`, { headers });
  const repos = reposRes.ok ? await reposRes.json() as Array<{
    name: string; description: string; language: string;
    stargazers_count: number; forks_count: number; topics: string[];
    html_url: string; homepage: string; pushed_at: string; fork: boolean;
  }> : [];

  // Filter out forks, keep original repos
  const ownRepos = repos.filter(r => !r.fork);

  // 3. Aggregate languages across repos
  const langBytes = new Map<string, number>();
  for (const repo of ownRepos.slice(0, 15)) {
    try {
      const langRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/languages`, { headers });
      if (langRes.ok) {
        const langs = await langRes.json() as Record<string, number>;
        for (const [lang, bytes] of Object.entries(langs)) {
          langBytes.set(lang, (langBytes.get(lang) || 0) + bytes);
        }
      }
    } catch {
      // Skip repos where language fetch fails
    }
  }

  const totalBytes = [...langBytes.values()].reduce((a, b) => a + b, 0);
  const languages = [...langBytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, bytes, percentage: Math.round((bytes / totalBytes) * 100) }));

  // 4. Try to fetch profile README (username/username repo)
  let readme: string | undefined;
  try {
    const readmeRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(username)}/readme`, { headers });
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json() as { content: string; encoding: string };
      if (readmeData.encoding === 'base64') {
        readme = Buffer.from(readmeData.content, 'base64').toString('utf8');
      }
    }
  } catch {
    // No profile README — that's fine
  }

  // 5. Build structured data
  const topRepos: GitHubRepo[] = ownRepos.slice(0, 10).map(r => ({
    name: r.name,
    description: r.description || '',
    language: r.language || '',
    stars: r.stargazers_count,
    forks: r.forks_count,
    topics: r.topics || [],
    url: r.html_url,
    homepage: r.homepage || undefined,
    updatedAt: r.pushed_at,
  }));

  const githubData: GitHubData = {
    username,
    name: user.name || username,
    bio: user.bio || '',
    location: user.location || '',
    company: user.company || '',
    blog: user.blog || '',
    publicRepos: user.public_repos,
    followers: user.followers,
    languages,
    topRepos,
    contributions: { totalLastYear: 0 }, // Would need GraphQL for exact count
    readme,
  };

  // 6. Convert to ProfileData
  const profile = githubToProfile(githubData);

  return { data: githubData, profile };
}

function githubToProfile(gh: GitHubData): Partial<ProfileData> {
  // Extract skills from languages + repo topics
  const skills: string[] = [];
  for (const lang of gh.languages.slice(0, 10)) {
    skills.push(lang.name);
  }
  const allTopics = new Set(gh.topRepos.flatMap(r => r.topics));
  for (const topic of allTopics) {
    const normalized = topic.replace(/-/g, ' ');
    if (!skills.some(s => s.toLowerCase() === normalized.toLowerCase())) {
      skills.push(normalizeSkillName(normalized));
    }
  }

  // Convert top repos to project entries
  const projects: ProjectEntry[] = gh.topRepos
    .filter(r => r.description || r.stars > 0)
    .slice(0, 6)
    .map(repo => ({
      title: repo.name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      role: 'Developer',
      company: 'Open Source',
      duration: `Updated ${new Date(repo.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
      situation: repo.description || `Open source ${repo.language} project`,
      task: `Build and maintain ${repo.name}`,
      action: `Developed ${repo.description || repo.name} using ${repo.language}${repo.topics.length > 0 ? `, ${repo.topics.slice(0, 3).join(', ')}` : ''}`,
      result: [
        repo.stars > 0 ? `${repo.stars} GitHub stars` : '',
        repo.forks > 0 ? `${repo.forks} forks` : '',
      ].filter(Boolean).join(', ') || 'Active open source contribution',
      metrics: [
        repo.stars > 0 ? `${repo.stars} stars` : '',
        repo.forks > 0 ? `${repo.forks} forks` : '',
      ].filter(Boolean),
      technologies: [repo.language, ...repo.topics.slice(0, 4)].filter(Boolean),
    }));

  // Parse README for additional info
  let summary = gh.bio || '';
  if (gh.readme) {
    const readmeSummary = extractSummaryFromReadme(gh.readme);
    if (readmeSummary) summary = readmeSummary;
  }

  return {
    name: gh.name,
    headline: gh.bio || `Software Developer with ${gh.publicRepos}+ projects`,
    summary,
    location: gh.location,
    skills: skills.slice(0, 20),
    projects,
  };
}

function extractSummaryFromReadme(readme: string): string | null {
  // Strip markdown formatting and get first meaningful paragraph
  const lines = readme
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/#{1,6}\s*/g, '') // Remove headers
    .replace(/[*_`~]/g, '') // Remove formatting
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 20 && !l.startsWith('|') && !l.startsWith('-'));

  if (lines.length > 0) {
    return lines.slice(0, 3).join(' ').slice(0, 500);
  }
  return null;
}

function normalizeSkillName(topic: string): string {
  const mappings: Record<string, string> = {
    'react': 'React', 'reactjs': 'React', 'angular': 'Angular',
    'vue': 'Vue.js', 'vuejs': 'Vue.js', 'nextjs': 'Next.js',
    'nodejs': 'Node.js', 'node': 'Node.js', 'express': 'Express.js',
    'typescript': 'TypeScript', 'javascript': 'JavaScript',
    'python': 'Python', 'java': 'Java', 'golang': 'Go', 'go': 'Go',
    'rust': 'Rust', 'cpp': 'C++', 'csharp': 'C#',
    'docker': 'Docker', 'kubernetes': 'Kubernetes', 'k8s': 'Kubernetes',
    'aws': 'AWS', 'azure': 'Azure', 'gcp': 'Google Cloud',
    'postgresql': 'PostgreSQL', 'mysql': 'MySQL', 'mongodb': 'MongoDB',
    'redis': 'Redis', 'graphql': 'GraphQL', 'rest api': 'REST API',
    'machine learning': 'Machine Learning', 'deep learning': 'Deep Learning',
    'terraform': 'Terraform', 'ci cd': 'CI/CD',
  };
  return mappings[topic.toLowerCase()] || topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── LinkedIn Extractor ────────────────────────────────────────────────────────

/**
 * LinkedIn public profile extraction.
 * 
 * NOTE: LinkedIn does not provide a public API for profile scraping.
 * This fetches the public profile page and extracts structured data
 * from the JSON-LD schema or visible HTML content.
 * 
 * For best results, users should paste their LinkedIn profile text directly
 * or use the resume upload option.
 */

function extractLinkedInSlug(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9\-]+)/);
  if (!match) throw new Error('Invalid LinkedIn URL. Expected format: https://linkedin.com/in/username');
  return match[1];
}

export async function extractFromLinkedIn(url: string): Promise<{ data: LinkedInData; profile: Partial<ProfileData> }> {
  const slug = extractLinkedInSlug(url);

  // Fetch public profile page
  const res = await fetch(`https://www.linkedin.com/in/${encodeURIComponent(slug)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Careerly-OS/1.0)',
      'Accept': 'text/html',
    },
  });

  if (!res.ok) {
    throw new Error(`LinkedIn profile fetch failed (${res.status}). The profile may be private or the URL is invalid.`);
  }

  const html = await res.text();

  // Try to extract JSON-LD structured data (LinkedIn embeds this for public profiles)
  const linkedInData = parseLinkedInHTML(html, slug);
  const profile = linkedinToProfile(linkedInData);

  return { data: linkedInData, profile };
}

function parseLinkedInHTML(html: string, slug: string): LinkedInData {
  const data: LinkedInData = {
    name: '',
    headline: '',
    location: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
  };

  // Try JSON-LD extraction
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd['@type'] === 'Person') {
        data.name = jsonLd.name || '';
        data.location = jsonLd.address?.addressLocality || '';
        data.summary = jsonLd.description || '';

        if (jsonLd.alumniOf) {
          const schools = Array.isArray(jsonLd.alumniOf) ? jsonLd.alumniOf : [jsonLd.alumniOf];
          data.education = schools.map((s: { name?: string }) => ({
            institution: s.name || '',
            degree: '',
            field: '',
            year: '',
          }));
        }

        if (jsonLd.worksFor) {
          const jobs = Array.isArray(jsonLd.worksFor) ? jsonLd.worksFor : [jsonLd.worksFor];
          data.experience = jobs.map((j: { name?: string }) => ({
            title: '',
            company: j.name || '',
            duration: '',
            description: '',
            current: true,
          }));
        }
      }
    } catch {
      // JSON-LD parsing failed — fall through to meta tag extraction
    }
  }

  // Fallback: extract from meta tags
  if (!data.name) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)/i);
    if (titleMatch) {
      const titleParts = titleMatch[1].split(/[|\-–]/);
      data.name = titleParts[0]?.trim() || slug;
    }
  }

  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
  if (descMatch && !data.headline) {
    data.headline = descMatch[1].trim();
  }

  // Extract skills from page content if visible
  const skillMatches = html.match(/(?:skill|expertise)[^"]*"([^"]+)"/gi);
  if (skillMatches) {
    for (const match of skillMatches.slice(0, 20)) {
      const skillMatch = match.match(/"([^"]+)"$/);
      if (skillMatch) data.skills.push(skillMatch[1]);
    }
  }

  return data;
}

function linkedinToProfile(li: LinkedInData): Partial<ProfileData> {
  const projects: ProjectEntry[] = li.experience.map(exp => ({
    title: exp.title,
    role: exp.title,
    company: exp.company,
    duration: exp.duration,
    current: exp.current,
    situation: exp.description ? exp.description.split('.')[0] : undefined,
    action: exp.description || `Worked as ${exp.title} at ${exp.company}`,
    result: exp.description?.split('.').slice(-1)[0] || undefined,
    metrics: extractMetricsFromText(exp.description),
    technologies: [],
  }));

  const education: EducationEntry[] = li.education.map(edu => ({
    institution: edu.institution,
    degree: edu.degree,
    field: edu.field,
    year: edu.year,
  }));

  return {
    name: li.name,
    headline: li.headline,
    summary: li.summary,
    location: li.location,
    skills: li.skills,
    projects,
    education,
    certifications: li.certifications,
  };
}

function extractMetricsFromText(text: string): string[] {
  if (!text) return [];
  const metrics: string[] = [];
  const patterns = /(\d+%|\$[\d,.]+[KMBkmb]?|\d+x|\d+\+?\s*(?:users|customers|clients|members|projects|applications|services|team|engineers|revenue|sales))/gi;
  let match;
  while ((match = patterns.exec(text)) !== null) {
    metrics.push(match[1]);
  }
  return metrics;
}

// ─── Combined Extractor ────────────────────────────────────────────────────────

export async function extractProfile(options: {
  githubUrl?: string;
  linkedinUrl?: string;
}): Promise<ExtractionResult> {
  const warnings: string[] = [];
  let githubData: GitHubData | undefined;
  let linkedinData: LinkedInData | undefined;
  let merged: Partial<ProfileData> = {};
  let source: ExtractionSource;

  if (options.githubUrl && options.linkedinUrl) {
    source = 'both';

    // Extract both in parallel
    const [ghResult, liResult] = await Promise.allSettled([
      extractFromGitHub(options.githubUrl),
      extractFromLinkedIn(options.linkedinUrl),
    ]);

    if (ghResult.status === 'fulfilled') {
      githubData = ghResult.value.data;
      merged = { ...ghResult.value.profile };
    } else {
      warnings.push(`GitHub extraction failed: ${ghResult.reason?.message || 'Unknown error'}`);
    }

    if (liResult.status === 'fulfilled') {
      linkedinData = liResult.value.data;
      // Merge LinkedIn data (LinkedIn takes priority for personal info)
      const liProfile = liResult.value.profile;
      merged = {
        ...merged,
        name: liProfile.name || merged.name,
        headline: liProfile.headline || merged.headline,
        summary: liProfile.summary || merged.summary,
        location: liProfile.location || merged.location,
        // Merge skills (deduplicate)
        skills: deduplicateSkills([...(merged.skills || []), ...(liProfile.skills || [])]),
        // LinkedIn experience takes priority, GitHub projects supplement
        projects: [...(liProfile.projects || []), ...(merged.projects || [])],
        education: liProfile.education?.length ? liProfile.education : merged.education,
        certifications: liProfile.certifications?.length ? liProfile.certifications : merged.certifications,
      };
    } else {
      warnings.push(`LinkedIn extraction failed: ${liResult.reason?.message || 'Unknown error'}`);
    }
  } else if (options.githubUrl) {
    source = 'github';
    const result = await extractFromGitHub(options.githubUrl);
    githubData = result.data;
    merged = result.profile;
  } else if (options.linkedinUrl) {
    source = 'linkedin';
    const result = await extractFromLinkedIn(options.linkedinUrl);
    linkedinData = result.data;
    merged = result.profile;
  } else {
    throw new Error('At least one URL (GitHub or LinkedIn) is required.');
  }

  // Calculate confidence score
  const confidence = calculateConfidence(merged);

  return {
    source,
    profile: merged,
    raw: { github: githubData, linkedin: linkedinData },
    confidence,
    warnings,
  };
}

function deduplicateSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of skills) {
    const lower = skill.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(skill);
    }
  }
  return result;
}

function calculateConfidence(profile: Partial<ProfileData>): number {
  let score = 0;
  const maxScore = 10;

  if (profile.name) score += 1;
  if (profile.headline) score += 1;
  if (profile.summary && profile.summary.length > 50) score += 1.5;
  if (profile.location) score += 0.5;
  if (profile.skills && profile.skills.length >= 5) score += 2;
  if (profile.projects && profile.projects.length >= 2) score += 2;
  if (profile.education && profile.education.length >= 1) score += 1;
  if (profile.certifications && profile.certifications.length >= 1) score += 1;

  return Math.round((score / maxScore) * 100);
}
