import { NextResponse } from 'next/server';

// Popular company boards to search across
const GREENHOUSE_BOARDS = [
  'stripe', 'cloudflare', 'figma', 'notion', 'vercel',
  'linear', 'anthropic', 'openai', 'datadog', 'hashicorp',
];

const LEVER_BOARDS = [
  'stripe', 'cloudflare', 'figma', 'notion', 'vercel',
  'linear', 'anthropic', 'openai', 'datadog', 'hashicorp',
];

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  remote: boolean;
  matchScore: number;
  source: 'greenhouse' | 'lever';
  postedAt?: string;
}

function computeMatchScore(job: { title: string; location: string; description?: string }, keywords: string, location: string, remote: boolean): number {
  let score = 50; // base score
  const kw = keywords.toLowerCase().split(/\s+/).filter(Boolean);
  const titleLower = job.title.toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const locLower = job.location.toLowerCase();

  // Title keyword matches (high weight)
  for (const k of kw) {
    if (titleLower.includes(k)) score += 20;
    else if (descLower.includes(k)) score += 5;
  }

  // Location match
  if (location) {
    const locSearch = location.toLowerCase();
    if (locLower.includes(locSearch)) score += 15;
  }

  // Remote match
  if (remote) {
    if (/remote/i.test(job.location) || /remote/i.test(job.description || '')) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchGreenhouseJobs(board: string, keywords: string, location: string, remote: boolean): Promise<JobResult[]> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    const jobs: JobResult[] = [];

    for (const job of data.jobs || []) {
      const loc = job.location?.name || 'Unknown';
      const desc = stripHtml(job.content || '').slice(0, 300);
      
      const result: JobResult = {
        id: `gh-${board}-${job.id}`,
        title: job.title || 'Untitled',
        company: board.charAt(0).toUpperCase() + board.slice(1),
        location: loc,
        url: job.absolute_url || `https://boards.greenhouse.io/${board}/jobs/${job.id}`,
        description: desc,
        remote: /remote/i.test(loc),
        source: 'greenhouse',
        matchScore: 0,
        postedAt: job.updated_at,
      };
      result.matchScore = computeMatchScore(result, keywords, location, remote);
      jobs.push(result);
    }

    return jobs;
  } catch {
    return [];
  }
}

async function fetchLeverJobs(board: string, keywords: string, location: string, remote: boolean): Promise<JobResult[]> {
  try {
    const url = `https://api.lever.co/v0/postings/${board}?mode=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    const jobs: JobResult[] = [];

    for (const posting of data || []) {
      const desc = stripHtml(posting.descriptionPlain || posting.description || '').slice(0, 300);
      const loc = posting.categories?.location || 'Unknown';

      const result: JobResult = {
        id: `lv-${board}-${posting.id}`,
        title: posting.text || 'Untitled',
        company: board.charAt(0).toUpperCase() + board.slice(1),
        location: loc,
        url: posting.hostedUrl || posting.applyUrl || `https://jobs.lever.co/${board}/${posting.id}`,
        description: desc,
        remote: /remote/i.test(loc) || /remote/i.test(posting.categories?.commitment || ''),
        source: 'lever',
        matchScore: 0,
        postedAt: posting.createdAt ? new Date(posting.createdAt).toISOString() : undefined,
      };
      result.matchScore = computeMatchScore(result, keywords, location, remote);
      jobs.push(result);
    }

    return jobs;
  } catch {
    return [];
  }
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const keywords = searchParams.get('keywords') || '';
  const location = searchParams.get('location') || '';
  const remote = searchParams.get('remote') === 'true';

  // Fetch from all boards in parallel
  const promises: Promise<JobResult[]>[] = [];

  for (const board of GREENHOUSE_BOARDS) {
    promises.push(fetchGreenhouseJobs(board, keywords, location, remote));
  }
  for (const board of LEVER_BOARDS) {
    promises.push(fetchLeverJobs(board, keywords, location, remote));
  }

  const results = await Promise.allSettled(promises);
  
  let allJobs: JobResult[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
    }
  }

  // Deduplicate by title + company (Greenhouse and Lever may both have the same posting)
  const seen = new Set<string>();
  allJobs = allJobs.filter(job => {
    const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter by keywords if provided
  if (keywords) {
    const kw = keywords.toLowerCase().split(/\s+/).filter(Boolean);
    allJobs = allJobs.filter(job => {
      const text = `${job.title} ${job.description} ${job.location}`.toLowerCase();
      return kw.some(k => text.includes(k));
    });
  }

  // Filter by location if provided
  if (location) {
    const locLower = location.toLowerCase();
    allJobs = allJobs.filter(job => 
      job.location.toLowerCase().includes(locLower) || job.matchScore >= 60
    );
  }

  // Filter by remote if specified
  if (remote) {
    allJobs = allJobs.filter(job => job.remote || job.matchScore >= 70);
  }

  // Sort by match score descending
  allJobs.sort((a, b) => b.matchScore - a.matchScore);

  // Limit results
  const limited = allJobs.slice(0, 50);

  return NextResponse.json({
    jobs: limited,
    meta: {
      total: limited.length,
      sources: ['greenhouse', 'lever'],
      boards: [...GREENHOUSE_BOARDS],
      fetchedAt: new Date().toISOString(),
    },
  });
}
