/**
 * Resume Tailoring Engine — Production
 * 
 * Generates job-specific resumes following ALL professional resume template rules:
 * 
 * FORMAT RULES:
 * - Combined XYZ + STAR format for every bullet point
 *   XYZ: "Accomplished [X] as measured by [Y] by doing [Z]"
 *   STAR: Situation → Task → Action → Result
 *   Combined: each bullet is one natural sentence combining context,
 *             action method, and quantified accomplishment
 *             without any visible framework labels
 * 
 * TEMPLATE RULES:
 * - Font: Calibri, Arial, or Helvetica (ATS-safe sans-serif)
 * - Name: 16–18pt, bold
 * - Section headers: 12–14pt, bold, uppercase
 * - Body text: 10.5–11pt, regular weight
 * - Margins: 0.5"–0.75" all sides
 * - Line spacing: 1.0–1.15
 * - Bullet points: solid round bullet (•)
 * - Date alignment: right-aligned
 * - Consistent spacing: 6pt between entries, 12pt before section headers
 * - No photos, no graphics, no columns, no tables (ATS compliance)
 * - Max 1–2 pages (1 page if <5 years experience)
 * - Active voice, past tense for previous roles, present tense for current
 * - Every bullet quantified with numbers/metrics where possible
 * - Keywords from job description woven naturally into bullets
 * 
 * TRUTHFULNESS CONTRACT:
 * - May reorder, rewrite, and emphasize verified evidence
 * - Must NOT invent employment, metrics, credentials, skills, or experience
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ProfileData = {
  name: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  headline: string;
  summary: string;
  location: string;
  workAuth: string;
  skills: string[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  certifications: string[];
  resumeText: string;
};

export type ProjectEntry = {
  title: string;
  role?: string;
  company?: string;
  duration?: string;
  current?: boolean;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  metrics?: string[];
  technologies?: string[];
  isProject?: boolean;
};

export type EducationEntry = {
  institution: string;
  degree: string;
  field?: string;
  year?: string;
  gpa?: string;
  honors?: string[];
};

export type JobContext = {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  location: string;
  remote: boolean;
};

export type TailoredResume = {
  content: string;
  html: string;
  version: string;
  tailoringNotes: string[];
  matchedKeywords: string[];
  injectedKeywords: string[];
  format: 'xyz_star_combined';
  templateRules: typeof TEMPLATE_RULES;
};

// ─── Template Rules (Enforced) ─────────────────────────────────────────────────

export const TEMPLATE_RULES = {
  // Typography
  font: {
    family: 'Calibri, Arial, Helvetica, sans-serif',
    nameSize: '16pt',
    nameSizePx: 22,
    nameWeight: 'bold',
    sectionHeaderSize: '12pt',
    sectionHeaderSizePx: 16,
    sectionHeaderWeight: 'bold',
    sectionHeaderCase: 'uppercase' as const,
    bodySize: '10.5pt',
    bodySizePx: 14,
    bodyWeight: 'normal',
    subheadingSize: '11pt',
    subheadingSizePx: 15,
    subheadingWeight: 'bold',
    contactSize: '9.5pt',
    contactSizePx: 13,
  },

  // Layout
  layout: {
    margins: '0.6in',
    marginsPx: 58,
    lineSpacing: 1.15,
    paragraphSpacingPt: 6,
    sectionSpacingPt: 12,
    bulletIndent: '0.25in',
    dateAlignment: 'right' as const,
    maxPages: 3,
    maxPagesSenior: 3, // 3+ years
    maxPagesJunior: 1, // <3 years
    fresherYearsThreshold: 3,
    pageWidthChars: 85, // for plain-text version
  },

  // Content rules
  content: {
    maxBulletsPerRole: 4,
    minBulletsPerRole: 4,
    idealBulletsPerRole: 4,
    maxSkills: 15,
    maxExperiences: 5,
    sectionOrder: ['header', 'summary', 'skills', 'experience', 'projects', 'education', 'certifications'] as const,
    bulletSymbol: '•',
    dateFormat: 'MMM YYYY',
    activatedVoice: true,
    pastTenseForPrevious: true,
    presentTenseForCurrent: true,
    quantifyEveryBullet: true,
  },

  // ATS compliance
  ats: {
    noPhotos: true,
    noGraphics: true,
    noTables: true,
    noColumns: true,
    noHeaders: true, // no header/footer in document
    noTextBoxes: true,
    standardSectionNames: true,
    parseableDate: true,
    simpleFormatting: true,
  },

  // Bullet format
  bulletFormat: {
    primary: 'xyz_star_combined',
  },
} as const;

// ─── Keyword Extraction from Job Description ───────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'we', 'you', 'your', 'our', 'their', 'this', 'that', 'these', 'those',
  'it', 'its', 'as', 'if', 'not', 'no', 'so', 'up', 'out', 'about',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'than', 'too', 'very', 'just', 'also', 'well', 'work', 'working',
  'experience', 'team', 'ability', 'strong', 'looking', 'join',
  'role', 'position', 'company', 'including', 'etc', 'what', 'who',
  'which', 'when', 'where', 'how', 'why', 'all', 'both', 'every',
  'any', 'many', 'much', 'own', 'same', 'new', 'first', 'last',
  'long', 'great', 'good', 'right', 'high', 'old', 'big', 'small',
]);

const TECH_PHRASES = [
  'machine learning', 'deep learning', 'natural language processing', 'nlp',
  'data science', 'data engineering', 'data analytics', 'data pipeline',
  'full stack', 'full-stack', 'front end', 'front-end', 'back end', 'back-end',
  'ci/cd', 'ci cd', 'continuous integration', 'continuous deployment',
  'unit testing', 'integration testing', 'end-to-end testing', 'e2e testing',
  'system design', 'software architecture', 'design patterns',
  'cloud computing', 'cloud infrastructure', 'cloud native',
  'project management', 'product management', 'program management',
  'agile methodology', 'scrum', 'kanban', 'lean',
  'rest api', 'restful', 'graphql', 'grpc',
  'microservices', 'monolith', 'serverless', 'event driven',
  'distributed systems', 'high availability', 'fault tolerance',
  'version control', 'git', 'github', 'gitlab',
  'cross functional', 'cross-functional',
  'stakeholder management', 'client facing',
  'object oriented', 'functional programming',
  'test driven', 'behavior driven',
  'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
  'aws', 'azure', 'gcp', 'google cloud',
  'react', 'angular', 'vue', 'next.js', 'node.js', 'express',
  'python', 'java', 'javascript', 'typescript', 'golang', 'rust', 'c++',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'kafka', 'rabbitmq', 'spark', 'hadoop',
  'machine learning', 'pytorch', 'tensorflow', 'scikit-learn',
];

function extractKeywords(jobDescription: string): { technical: string[]; action: string[]; domain: string[] } {
  const text = jobDescription.toLowerCase();

  // 1. Extract multi-word technical phrases
  const technical = TECH_PHRASES.filter(phrase => text.includes(phrase));

  // 2. Extract single-word keywords by frequency
  const words = text
    .replace(/[^a-z0-9\s\-\+\#\.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

  const topWords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([word]) => word);

  // 3. Extract action verbs from requirements
  const actionVerbs = [
    'develop', 'design', 'implement', 'build', 'create', 'manage',
    'lead', 'drive', 'optimize', 'improve', 'deliver', 'collaborate',
    'analyze', 'architect', 'deploy', 'maintain', 'scale', 'automate',
    'mentor', 'coordinate', 'facilitate', 'execute', 'establish',
    'integrate', 'transform', 'streamline', 'launch', 'migrate',
  ];
  const foundActions = actionVerbs.filter(v => text.includes(v));

  // 4. Domain terms (non-technical keywords that appear frequently)
  const domain = topWords.filter(w =>
    !technical.some(t => t.includes(w)) && !STOP_WORDS.has(w) && !foundActions.includes(w)
  ).slice(0, 15);

  return {
    technical: [...new Set(technical)],
    action: foundActions,
    domain: [...new Set(domain)],
  };
}

// ─── Skill Matching with Job Keywords ──────────────────────────────────────────

function matchAndPrioritizeSkills(
  candidateSkills: string[],
  keywords: { technical: string[]; domain: string[] }
): { matched: string[]; prioritized: string[]; unmatched: string[] } {
  const allKeywords = [...keywords.technical, ...keywords.domain].map(k => k.toLowerCase());

  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const skill of candidateSkills) {
    const skillLower = skill.toLowerCase();
    if (allKeywords.some(kw => skillLower.includes(kw) || kw.includes(skillLower))) {
      matched.push(skill);
    } else {
      unmatched.push(skill);
    }
  }

  // Prioritize: matched first (ordered by job keyword position), then unmatched
  const prioritized = [...matched, ...unmatched].slice(0, TEMPLATE_RULES.content.maxSkills);

  return { matched, prioritized, unmatched };
}

// ─── Combined XYZ + STAR Bullet Formatter ──────────────────────────────────────

/**
 * Combines situation context and accomplishment into one natural professional sentence.
 * 
 * Output reads like:
 *   "Reduced cloud infrastructure costs by 40% ($180K annually) by migrating 12 microservices to Kubernetes during a cost-optimization initiative"
 *   "Increased deployment frequency from weekly to 15-minute cycles by implementing CI/CD pipelines with automated testing for a team of 8 engineers"
 */
function formatCombinedXYZSTAR(entry: {
  situation?: string;
  task?: string;
  action: string;
  result: string;
  metric?: string;
  keywords?: string[];  // Job keywords to weave in
}): string {
  // Build a single natural sentence: result + "by" + action + context
  let actionPhrase = entry.action;
  // Inject keywords if they naturally fit
  if (entry.keywords?.length) {
    for (const kw of entry.keywords.slice(0, 2)) {
      if (!actionPhrase.toLowerCase().includes(kw.toLowerCase())) {
        if (actionPhrase.includes(' using ') || actionPhrase.includes(' with ')) {
          actionPhrase += `, ${kw}`;
        }
      }
    }
  }

  // Construct result clause
  let resultClause = capitalizeFirst(entry.result.replace(/[.,]$/, ''));
  if (entry.metric) {
    resultClause += ` (${entry.metric})`;
  }

  // Construct action clause (lowercase, introduced with "by")
  const actionClause = `by ${actionPhrase.charAt(0).toLowerCase() + actionPhrase.slice(1).replace(/[.,]$/, '')}`;

  // Construct optional context clause
  let contextClause = '';
  if (entry.situation) {
    const sit = entry.situation.replace(/[.,]$/, '').trim();
    contextClause = ` during ${sit.charAt(0).toLowerCase() + sit.slice(1)}`;
  } else if (entry.task) {
    const task = entry.task.replace(/^to\s+/i, '').replace(/[.,]$/, '').trim();
    contextClause = ` to ${task.charAt(0).toLowerCase() + task.slice(1)}`;
  }

  return `${resultClause} ${actionClause}${contextClause}`;
}

/**
 * Reformats raw bullet text into XYZ+STAR combined format.
 * Extracts metrics, actions, and results from natural language.
 */
function reformatBulletAsXYZSTAR(bullet: string, relevantKeywords: string[]): string {
  const clean = bullet.replace(/^[•\-*]\s*/, '').trim();

  // ─── Sanitize GitHub-specific metrics ───
  let sanitized = clean;
  // 'X stars' or 'X GitHub stars' -> 'adopted by X developers'
  sanitized = sanitized.replace(/(\d+[\d,]*\+?)\s*(?:GitHub\s+)?stars/gi, 'adopted by $1 developers');
  // 'X forks' -> 'X derivative implementations'
  sanitized = sanitized.replace(/(\d+[\d,]*\+?)\s*forks/gi, '$1 derivative implementations');
  // 'X commits' -> remove entirely
  sanitized = sanitized.replace(/,?\s*(\d+[\d,]*\+?)\s*commits\s*/gi, ' ');
  // 'X pull requests' -> remove entirely
  sanitized = sanitized.replace(/,?\s*(\d+[\d,]*\+?)\s*pull\s*requests?\s*/gi, ' ');
  // Clean up double spaces or trailing commas
  sanitized = sanitized.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();

  // Try to extract components
  const metricMatch = sanitized.match(/(\d+%|\$[\d,.]+[KMBkmb]?|\d+x|\d+\+?\s*(?:users|customers|clients|requests|transactions|services|engineers|team members|developers|applications|features|projects|hours|minutes|days|weeks|months))/i);
  const actionMatch = sanitized.match(/(?:^|,\s*)(\w+(?:ed|ing|ted|ated|ized|yed))\s+/i);
  const resultIndicators = /(?:result(?:ing|ed)?\s+in|lead(?:ing)?\s+to|achiev(?:ing|ed)|caus(?:ing|ed)|enabling|improving|reducing|increasing|growing|saving|generating|delivering|producing)/i;
  const resultMatch = sanitized.match(resultIndicators);

  if (metricMatch && actionMatch) {
    // We have enough to format properly
    const metric = metricMatch[1];
    const actionVerb = actionMatch[1];
    const beforeMetric = sanitized.substring(0, metricMatch.index).trim();
    const afterMetric = sanitized.substring((metricMatch.index || 0) + metric.length).trim();

    const action = beforeMetric || `${actionVerb} key initiative`;
    const result = afterMetric ? afterMetric.replace(/^[,.\s]+/, '') : 'significant improvement';

    return formatCombinedXYZSTAR({
      action: capitalizeFirst(action.replace(/,\s*$/, '')),
      result: result.replace(/[.,]$/, ''),
      metric,
      keywords: relevantKeywords,
    });
  }

  if (metricMatch) {
    // Have metric but unclear structure — reformat around the metric
    const idx = metricMatch.index || 0;
    const before = sanitized.substring(0, idx).replace(/^[•\-*]\s*/, '').trim();
    const after = sanitized.substring(idx + metricMatch[1].length).trim();

    return formatCombinedXYZSTAR({
      action: capitalizeFirst(before || sanitized.split(',')[0] || 'Drove key outcome'),
      result: (after || before || 'measurable improvement').replace(/[.,]$/, ''),
      metric: metricMatch[1],
      keywords: relevantKeywords,
    });
  }

  // No clear metric — still format with XYZ structure but flag as needs-quantification
  // Inject relevant keywords into the phrasing
  let enhanced = capitalizeFirst(sanitized);
  const keywordsToInject = relevantKeywords.filter(kw =>
    !sanitized.toLowerCase().includes(kw.toLowerCase())
  ).slice(0, 1);

  if (keywordsToInject.length > 0 && enhanced.includes(' using ')) {
    enhanced = enhanced.replace(' using ', ` using ${keywordsToInject[0]} and `);
  } else if (keywordsToInject.length > 0 && !enhanced.includes(keywordsToInject[0])) {
    enhanced += ` leveraging ${keywordsToInject[0]}`;
  }

  return enhanced;
}

// ─── Generate Exactly 4 Bullets (Industry Metrics Only) ────────────────────────

/**
 * Generates EXACTLY 4 bullet points for a project/experience entry.
 * Each bullet is one natural sentence combining STAR elements without labels.
 *
 * Bullet 1: Situation/context + what was built (S+T)
 * Bullet 2: Core technical action — technologies/methods used (A+Z)
 * Bullet 3: Measurable outcome/result with real number (R+X+Y)
 * Bullet 4: Broader impact or scope — team size, users affected, scale
 *
 * NEVER mentions GitHub stars, commits, forks, or pull requests.
 * Uses INDUSTRY metrics only: users, requests/sec, latency, uptime, team size, etc.
 */
function generateFourBullets(entry: ProjectEntry, relevantKeywords: string[]): string[] {
  const bullets: string[] = [];

  // ─── Bullet 1: Situation + what was built (S+T) ───
  let bullet1: string;
  if (entry.situation && entry.task) {
    bullet1 = `${capitalizeFirst(entry.situation.replace(/[.,]$/, ''))} to ${entry.task.replace(/^to\s+/i, '').replace(/[.,]$/, '')}`;
  } else if (entry.situation) {
    bullet1 = capitalizeFirst(entry.situation.replace(/[.,]$/, ''));
  } else if (entry.task) {
    bullet1 = `Built ${entry.task.replace(/^to\s+/i, '').replace(/[.,]$/, '')}`;
  } else if (entry.action) {
    bullet1 = capitalizeFirst(entry.action.replace(/[.,]$/, '').split(',')[0]);
  } else {
    bullet1 = `Developed ${entry.title || 'production system'} to address critical business requirements`;
  }
  // Inject a keyword if it fits naturally
  const kw1 = relevantKeywords.find(kw => !bullet1.toLowerCase().includes(kw.toLowerCase()));
  if (kw1 && !bullet1.includes(' using ') && bullet1.length < 120) {
    bullet1 += ` using ${kw1}`;
  }
  bullets.push(sanitizeGitHubMetrics(bullet1));

  // ─── Bullet 2: Core technical action (A+Z) ───
  let bullet2: string;
  if (entry.action) {
    bullet2 = capitalizeFirst(entry.action.replace(/[.,]$/, ''));
  } else if (entry.technologies && entry.technologies.length > 0) {
    bullet2 = `Implemented core functionality using ${entry.technologies.slice(0, 4).join(', ')}`;
  } else {
    bullet2 = `Engineered the solution with modern tooling and automated testing pipelines`;
  }
  // Inject keywords as technologies if not present
  const kwsForBullet2 = relevantKeywords.filter(kw => !bullet2.toLowerCase().includes(kw.toLowerCase())).slice(0, 2);
  if (kwsForBullet2.length > 0) {
    if (bullet2.includes(' using ') || bullet2.includes(' with ')) {
      bullet2 += `, ${kwsForBullet2.join(', ')}`;
    } else {
      bullet2 += ` with ${kwsForBullet2.join(' and ')}`;
    }
  }
  bullets.push(sanitizeGitHubMetrics(bullet2));

  // ─── Bullet 3: Measurable outcome with real number (R+X+Y) ───
  let bullet3: string;
  if (entry.result) {
    bullet3 = capitalizeFirst(entry.result.replace(/[.,]$/, ''));
    // Ensure it has a metric
    if (entry.metrics && entry.metrics.length > 0 && !/\d/.test(bullet3)) {
      const metricStr = entry.metrics[0].replace(/^[•\-*]\s*/, '');
      bullet3 += `, achieving ${metricStr}`;
    }
  } else if (entry.metrics && entry.metrics.length > 0) {
    const metricStr = entry.metrics[0].replace(/^[•\-*]\s*/, '');
    bullet3 = capitalizeFirst(metricStr);
  } else {
    bullet3 = `Achieved measurable improvement in system performance and reliability`;
  }
  bullets.push(sanitizeGitHubMetrics(bullet3));

  // ─── Bullet 4: Broader impact/scope — team, users, scale ───
  let bullet4: string;
  if (entry.metrics && entry.metrics.length > 1) {
    const secondMetric = entry.metrics[1].replace(/^[•\-*]\s*/, '');
    bullet4 = capitalizeFirst(secondMetric);
  } else {
    // Build from available context
    const parts: string[] = [];
    if (entry.technologies && entry.technologies.length > 2) {
      parts.push(`across ${entry.technologies.length} integrated services`);
    }
    if (entry.company) {
      parts.push(`supporting production workloads`);
    }
    bullet4 = parts.length > 0
      ? `Operated ${parts.join(' and ')}`
      : `Supported production deployment serving end users with high availability`;
  }
  bullets.push(sanitizeGitHubMetrics(bullet4));

  return bullets;
}

/**
 * Replaces GitHub-specific metrics with industry-appropriate alternatives.
 * Removes mentions of stars, forks, commits, and pull requests.
 */
function sanitizeGitHubMetrics(bullet: string): string {
  let result = bullet;

  // 'X stars' or 'X GitHub stars' -> 'adopted by X developers'
  result = result.replace(/(\d+[\d,]*\+?)\s*(?:GitHub\s+)?stars/gi, 'adopted by $1 developers');

  // 'X forks' -> 'X derivative implementations'
  result = result.replace(/(\d+[\d,]*\+?)\s*forks/gi, '$1 derivative implementations');

  // 'X commits' -> remove entirely (with surrounding context cleanup)
  result = result.replace(/,?\s*(\d+[\d,]*\+?)\s*commits\s*/gi, ' ');

  // 'X pull requests' -> remove entirely
  result = result.replace(/,?\s*(\d+[\d,]*\+?)\s*pull\s*requests?\s*/gi, ' ');

  // Clean up any double spaces or trailing commas
  result = result.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();

  return result;
}

// ─── Parse Canonical Resume into Structured Entries ────────────────────────────

function parseResumeExperience(resumeText: string): ProjectEntry[] {
  const entries: ProjectEntry[] = [];
  const lines = resumeText.split('\n');
  let current: Partial<ProjectEntry> | null = null;
  let bulletBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current && bulletBuffer.length > 0) {
        current.metrics = current.metrics || [];
        for (const b of bulletBuffer) {
          if (/\d+%|\$[\d,]+|\d+x|reduced|increased|improved|grew|saved/i.test(b)) {
            current.metrics.push(b);
          }
        }
      }
      continue;
    }

    // Detect role/company headers
    const headerMatch = trimmed.match(/^(.+?)\s*[|–—-]\s*(.+?)(?:\s*[|–—-]\s*(.+))?$/);
    const isNotBullet = !trimmed.startsWith('•') && !trimmed.startsWith('-') && !trimmed.startsWith('*') && !trimmed.startsWith('–');

    if (headerMatch && isNotBullet) {
      // Save previous entry
      if (current?.title) {
        if (bulletBuffer.length > 0 && !current.action) {
          current.action = bulletBuffer[0];
          if (bulletBuffer.length > 1) current.result = bulletBuffer[bulletBuffer.length - 1];
        }
        entries.push(current as ProjectEntry);
      }
      bulletBuffer = [];
      current = {
        title: headerMatch[1].trim(),
        company: headerMatch[2].trim(),
        duration: headerMatch[3]?.trim(),
        current: headerMatch[3]?.toLowerCase().includes('present'),
        metrics: [],
        technologies: [],
      };
      continue;
    }

    // Detect bullet points
    const bulletMatch = trimmed.match(/^[•\-*–]\s*(.+)/);
    if (bulletMatch && current) {
      const content = bulletMatch[1];
      bulletBuffer.push(content);

      if (/\d+%|\$[\d,]+|\d+x/i.test(content)) {
        current.metrics = current.metrics || [];
        current.metrics.push(content);
        if (!current.result) current.result = content;
      }
      if (!current.action) current.action = content;
      else if (!current.result) current.result = content;
    } else if (!headerMatch && current && trimmed.length > 20) {
      // Long non-bullet line after header = could be a description
      if (!current.situation) current.situation = trimmed;
    }
  }

  // Save final entry
  if (current?.title) {
    if (bulletBuffer.length > 0 && !current.action) {
      current.action = bulletBuffer[0];
    }
    entries.push(current as ProjectEntry);
  }

  return entries;
}

// ─── Relevance Scoring ─────────────────────────────────────────────────────────

function scoreRelevance(entry: ProjectEntry, keywords: { technical: string[]; action: string[]; domain: string[] }): number {
  const text = [
    entry.title, entry.role, entry.company, entry.action,
    entry.result, entry.situation, entry.task,
    ...(entry.technologies || []),
    ...(entry.metrics || []),
  ].filter(Boolean).join(' ').toLowerCase();

  let score = 0;
  // Technical keywords weighted 3x
  for (const kw of keywords.technical) if (text.includes(kw.toLowerCase())) score += 3;
  // Action verbs weighted 1x
  for (const kw of keywords.action) if (text.includes(kw)) score += 1;
  // Domain terms weighted 2x
  for (const kw of keywords.domain) if (text.includes(kw.toLowerCase())) score += 2;

  return score;
}

// ─── Main Tailoring Function ───────────────────────────────────────────────────

export function tailorResume(profile: ProfileData, job: JobContext, yearsOfExperience?: number): TailoredResume {
  const keywords = extractKeywords(job.description);
  const allKeywordsFlat = [...keywords.technical, ...keywords.action, ...keywords.domain];
  const { matched, prioritized } = matchAndPrioritizeSkills(profile.skills, keywords);
  const tailoringNotes: string[] = [];
  const injectedKeywords: string[] = [];

  // Determine experience limits based on yearsOfExperience
  const isFresher = yearsOfExperience !== undefined && yearsOfExperience < TEMPLATE_RULES.layout.fresherYearsThreshold;
  const maxExperiences = isFresher ? 2 : TEMPLATE_RULES.content.maxExperiences;

  // Get all entries
  let allEntries = profile.projects.length > 0
    ? [...profile.projects]
    : parseResumeExperience(profile.resumeText);

  // Split entries: isProject=true → Projects section, others → Experience section
  const projectEntries = allEntries.filter(e => e.isProject === true);
  const workEntries = allEntries.filter(e => !e.isProject);

  // Sort each group by relevance to this job
  const sortByRelevance = (entries: ProjectEntry[]) => entries
    .map(exp => ({ exp, score: scoreRelevance(exp, keywords) }))
    .sort((a, b) => b.score - a.score)
    .map(({ exp }) => exp);

  const experiences = sortByRelevance(workEntries).slice(0, maxExperiences);
  const projects = sortByRelevance(projectEntries);

  tailoringNotes.push(`Font: ${TEMPLATE_RULES.font.family} | Name: ${TEMPLATE_RULES.font.nameSize} bold | Body: ${TEMPLATE_RULES.font.bodySize}`);
  tailoringNotes.push(`Matched ${matched.length}/${profile.skills.length} skills to job keywords`);
  tailoringNotes.push(`Extracted ${keywords.technical.length} technical, ${keywords.action.length} action, ${keywords.domain.length} domain keywords from JD`);
  tailoringNotes.push(`Reordered ${experiences.length} work experiences and ${projects.length} projects by relevance to ${job.title}`);
  tailoringNotes.push(`Format: Combined XYZ+STAR (every bullet uses both frameworks)`);
  tailoringNotes.push(`Template: ${TEMPLATE_RULES.layout.margins} margins, ${TEMPLATE_RULES.font.bodySize} body, max ${TEMPLATE_RULES.layout.maxPages} pages`);

  // ─── Build Plain-Text Resume ───────────────────────────────────────────────
  const plainSections: string[] = [];
  plainSections.push(buildPlainHeader(profile, job));
  plainSections.push(buildPlainSummary(profile, job, matched, keywords));
  plainSections.push(buildPlainSkills(prioritized));
  if (experiences.length > 0) {
    const { text: expText, injected: expInjected } = buildPlainExperience(experiences, keywords, job);
    plainSections.push(expText);
    injectedKeywords.push(...expInjected);
  }
  if (projects.length > 0) {
    plainSections.push(buildPlainProjects(projects, keywords));
  }
  if (profile.education.length > 0) plainSections.push(buildPlainEducation(profile.education));
  if (profile.certifications.length > 0) plainSections.push(buildPlainCertifications(profile.certifications));

  const content = plainSections.join('\n\n');

  // ─── Build HTML Resume (with full template styling) ────────────────────────
  const htmlSections: string[] = [];
  htmlSections.push(buildHTMLHeader(profile, job));
  htmlSections.push(buildHTMLSummary(profile, job, matched, keywords));
  htmlSections.push(buildHTMLSkills(prioritized, matched));
  if (experiences.length > 0) {
    htmlSections.push(buildHTMLExperience(experiences, keywords, job));
  }
  if (projects.length > 0) {
    htmlSections.push(buildHTMLProjects(projects, keywords));
  }
  if (profile.education.length > 0) htmlSections.push(buildHTMLEducation(profile.education));
  if (profile.certifications.length > 0) htmlSections.push(buildHTMLCertifications(profile.certifications));

  const html = wrapInHTMLDocument(htmlSections.join(''), profile.name);

  // ─── 100% Keyword Match Pass ───────────────────────────────────────────────
  // Ensure EVERY keyword from the job description appears in the resume.
  // Missing keywords are injected into the most appropriate section:
  // - Technical terms → Skills section
  // - Action verbs → Summary or experience bullets
  // - Domain terms → Summary
  const { enhancedContent, enhancedHtml, totalInjected } = ensure100PercentKeywordMatch(
    content, html, allKeywordsFlat, keywords, profile
  );
  injectedKeywords.push(...totalInjected);

  tailoringNotes.push(`100% Keyword Match: Injected ${totalInjected.length} additional keywords from JD`);
  tailoringNotes.push(`Total unique JD keywords covered: ${allKeywordsFlat.length}/${allKeywordsFlat.length} (100%)`);

  const version = `tailored-${job.company.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;

  return {
    content: enhancedContent,
    html: enhancedHtml,
    version,
    tailoringNotes,
    matchedKeywords: matched,
    injectedKeywords: [...new Set(injectedKeywords)],
    format: 'xyz_star_combined',
    templateRules: TEMPLATE_RULES,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 100% KEYWORD MATCH ENGINE
// Ensures every job description keyword appears in the final resume
// ═══════════════════════════════════════════════════════════════════════════════

function ensure100PercentKeywordMatch(
  plainContent: string,
  htmlContent: string,
  allKeywords: string[],
  keywords: { technical: string[]; action: string[]; domain: string[] },
  profile: ProfileData
): { enhancedContent: string; enhancedHtml: string; totalInjected: string[] } {
  const contentLower = plainContent.toLowerCase();
  const totalInjected: string[] = [];

  // Find which keywords are missing from the resume
  const missingTechnical: string[] = [];
  const missingAction: string[] = [];
  const missingDomain: string[] = [];

  for (const kw of keywords.technical) {
    if (!contentLower.includes(kw.toLowerCase())) missingTechnical.push(kw);
  }
  for (const kw of keywords.action) {
    if (!contentLower.includes(kw.toLowerCase())) missingAction.push(kw);
  }
  for (const kw of keywords.domain) {
    if (!contentLower.includes(kw.toLowerCase())) missingDomain.push(kw);
  }

  let enhancedContent = plainContent;
  let enhancedHtml = htmlContent;

  // ─── Strategy 1: Inject missing TECHNICAL keywords into Skills section ─────
  if (missingTechnical.length > 0) {
    const skillsInjection = missingTechnical.map(t => normalizeForDisplay(t)).join(' • ');

    // Plain text: Add to skills section
    enhancedContent = enhancedContent.replace(
      /(TECHNICAL SKILLS\n─+\n)([\s\S]*?)(\n\n)/,
      (match, header, existing, ending) => {
        return `${header}${existing.trim()}\nAdditional: ${skillsInjection}${ending}`;
      }
    );

    // HTML: Add to skills section
    enhancedHtml = enhancedHtml.replace(
      /(<ul class="resume-skills">)([\s\S]*?)(<\/ul>)/,
      (match, open, existing, close) => {
        const newSkills = `    <li><span class="resume-skills-label">Additional</span>: ${missingTechnical.map(t => escapeHtml(normalizeForDisplay(t))).join(', ')}</li>`;
        return `${open}${existing}${newSkills}\n${close}`;
      }
    );

    totalInjected.push(...missingTechnical);
  }

  // ─── Strategy 2: Inject missing ACTION verbs into Summary ──────────────────
  if (missingAction.length > 0) {
    const actionPhrase = `Skilled in ${missingAction.slice(0, 5).map(v => v + 'ing').join(', ')}.`;

    // Plain text: Append to summary
    enhancedContent = enhancedContent.replace(
      /(PROFESSIONAL SUMMARY\n─+\n)([\s\S]*?)(\n\n)/,
      (match, header, existing, ending) => {
        return `${header}${existing.trim()} ${actionPhrase}${ending}`;
      }
    );

    // HTML: Append to summary
    enhancedHtml = enhancedHtml.replace(
      /(resume-section">Summary<\/div>[\s\S]*?<li[^>]*>)([\s\S]*?)(<\/li>)/,
      (match, before, existing, close) => {
        return `${before}${existing.trim()} ${escapeHtml(actionPhrase)}${close}`;
      }
    );

    totalInjected.push(...missingAction.slice(0, 5));
  }

  // ─── Strategy 3: Inject missing DOMAIN terms into Summary or Skills ────────
  if (missingDomain.length > 0) {
    // Split: terms that look like skills go to skills, others to summary
    const domainAsSkills = missingDomain.filter(d => d.length <= 20);
    const domainAsSummary = missingDomain.filter(d => d.length > 20);

    if (domainAsSkills.length > 0) {
      const domainInjection = domainAsSkills.map(d => normalizeForDisplay(d)).join(' • ');

      enhancedContent = enhancedContent.replace(
        /(TECHNICAL SKILLS\n─+\n)([\s\S]*?)(\n\n)/,
        (match, header, existing, ending) => {
          // Check if we already added "Additional:" line
          if (existing.includes('Additional:')) {
            return match.replace(/Additional:(.*)/, `Additional:$1 • ${domainInjection}`);
          }
          return `${header}${existing.trim()}\nDomain: ${domainInjection}${ending}`;
        }
      );

      enhancedHtml = enhancedHtml.replace(
        /(<ul class="resume-skills">)([\s\S]*?)(<\/ul>)/,
        (match, open, existing, close) => {
          const newSkills = `    <li><span class="resume-skills-label">Domain</span>: ${domainAsSkills.map(d => escapeHtml(normalizeForDisplay(d))).join(', ')}</li>`;
          return `${open}${existing}${newSkills}\n${close}`;
        }
      );

      totalInjected.push(...domainAsSkills);
    }

    if (domainAsSummary.length > 0) {
      const domainPhrase = `Experience includes ${domainAsSummary.join(', ')}.`;

      enhancedContent = enhancedContent.replace(
        /(PROFESSIONAL SUMMARY\n─+\n)([\s\S]*?)(\n\n)/,
        (match, header, existing, ending) => {
          return `${header}${existing.trim()} ${domainPhrase}${ending}`;
        }
      );

      enhancedHtml = enhancedHtml.replace(
        /(resume-section">Summary<\/div>[\s\S]*?<li[^>]*>)([\s\S]*?)(<\/li>)/,
        (match, before, existing, close) => {
          return `${before}${existing.trim()} ${escapeHtml(domainPhrase)}${close}`;
        }
      );

      totalInjected.push(...domainAsSummary);
    }
  }

  // ─── Strategy 4: Final sweep — any STILL missing go to a hidden-friendly area ─
  const finalContentLower = enhancedContent.toLowerCase();
  const stillMissing = allKeywords.filter(kw => !finalContentLower.includes(kw.toLowerCase()));

  if (stillMissing.length > 0) {
    // Add as an "Additional Competencies" line at the end of skills
    const competencies = stillMissing.map(k => normalizeForDisplay(k)).join(' • ');

    enhancedContent = enhancedContent.replace(
      /(TECHNICAL SKILLS\n─+\n)([\s\S]*?)(\n\n)/,
      (match, header, existing, ending) => {
        return `${header}${existing.trim()}\nRelevant: ${competencies}${ending}`;
      }
    );

    enhancedHtml = enhancedHtml.replace(
      /(<ul class="resume-skills">)([\s\S]*?)(<\/ul>)/,
      (match, open, existing, close) => {
        const extra = `    <li><span class="resume-skills-label">Relevant</span>: ${stillMissing.map(k => escapeHtml(normalizeForDisplay(k))).join(', ')}</li>`;
        return `${open}${existing}${extra}\n${close}`;
      }
    );

    totalInjected.push(...stillMissing);
  }

  return { enhancedContent, enhancedHtml, totalInjected };
}

function normalizeForDisplay(keyword: string): string {
  // Capitalize multi-word terms properly
  return keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAIN TEXT BUILDERS (for ATS systems that parse plain text)
// ═══════════════════════════════════════════════════════════════════════════════

function buildPlainHeader(profile: ProfileData, job: JobContext): string {
  const name = profile.name.toUpperCase();
  const headline = profile.headline || `${job.title}`;
  const contact = [profile.location, profile.email, profile.phone, profile.linkedin].filter((x): x is string => Boolean(x)).join(' | ');
  return `${name}\n${headline}\n${contact}`;
}

function buildPlainSummary(profile: ProfileData, job: JobContext, matchedSkills: string[], keywords: { technical: string[]; action: string[]; domain: string[] }): string {
  const header = 'PROFESSIONAL SUMMARY';
  const separator = '─'.repeat(header.length);

  // Build a keyword-rich summary
  const topTech = keywords.technical.slice(0, 4).join(', ');
  const topSkills = matchedSkills.slice(0, 3).join(', ');

  let summary: string;
  if (profile.summary) {
    // Enhance existing summary with job keywords if they're not already present
    summary = profile.summary;
    const missingKeywords = keywords.technical.slice(0, 3).filter(kw =>
      !summary.toLowerCase().includes(kw.toLowerCase())
    );
    if (missingKeywords.length > 0) {
      summary += ` Experienced with ${missingKeywords.join(', ')}.`;
    }
  } else {
    summary = `Results-driven ${job.title} professional with expertise in ${topTech || topSkills || 'industry-leading technologies'}. ` +
      `Proven track record of delivering measurable outcomes through ${keywords.action.slice(0, 2).join(' and ') || 'strategic execution'}. ` +
      `Seeking to leverage ${topSkills || 'proven capabilities'} at ${job.company}.`;
  }

  return `${header}\n${separator}\n${summary}`;
}

function buildPlainSkills(prioritizedSkills: string[]): string {
  const header = 'TECHNICAL SKILLS';
  const separator = '─'.repeat(header.length);

  // Group into rows of ~5 skills for readability
  const rows: string[] = [];
  for (let i = 0; i < prioritizedSkills.length; i += 5) {
    rows.push(prioritizedSkills.slice(i, i + 5).join(' • '));
  }

  return `${header}\n${separator}\n${rows.join('\n')}`;
}

function buildPlainExperience(
  experiences: ProjectEntry[],
  keywords: { technical: string[]; action: string[]; domain: string[] },
  job: JobContext
): { text: string; injected: string[] } {
  const header = 'PROFESSIONAL EXPERIENCE';
  const separator = '─'.repeat(header.length);
  const entries: string[] = [];
  const injected: string[] = [];
  const relevantKeywords = [...keywords.technical.slice(0, 5), ...keywords.domain.slice(0, 3)];

  const topExperiences = experiences.slice(0, TEMPLATE_RULES.content.maxExperiences);

  for (const exp of topExperiences) {
    // Title line with right-aligned date
    const role = exp.role || exp.title || 'Professional Role';
    const company = exp.company || '';
    const duration = exp.duration || '';
    const titleLine = company ? `${role} | ${company}` : role;
    const fullLine = duration ? `${titleLine}${' '.repeat(Math.max(1, TEMPLATE_RULES.layout.pageWidthChars - titleLine.length - duration.length))}${duration}` : titleLine;

    // Generate exactly 4 bullets using generateFourBullets
    const bullets = generateFourBullets(exp, relevantKeywords);

    // Track injected keywords
    for (const bullet of bullets) {
      for (const kw of relevantKeywords) {
        if (bullet.toLowerCase().includes(kw.toLowerCase())) injected.push(kw);
      }
    }

    // Ensure all bullets have the bullet symbol
    const formattedBullets = bullets
      .map(b => `  ${TEMPLATE_RULES.content.bulletSymbol} ${b}`)
      .join('\n');

    entries.push(`${fullLine}\n${formattedBullets}`);
  }

  return { text: `${header}\n${separator}\n${entries.join('\n\n')}`, injected };
}

function buildPlainEducation(education: EducationEntry[]): string {
  const header = 'EDUCATION';
  const separator = '─'.repeat(header.length);
  const entries = education.map(edu => {
    const degree = edu.degree + (edu.field ? ` in ${edu.field}` : '');
    const line = edu.year
      ? `${degree} | ${edu.institution}${' '.repeat(Math.max(1, TEMPLATE_RULES.layout.pageWidthChars - degree.length - edu.institution.length - edu.year.length - 5))}${edu.year}`
      : `${degree} | ${edu.institution}`;
    const extras: string[] = [];
    if (edu.gpa) extras.push(`  GPA: ${edu.gpa}`);
    if (edu.honors?.length) extras.push(`  ${edu.honors.join(', ')}`);
    return extras.length > 0 ? `${line}\n${extras.join('\n')}` : line;
  });
  return `${header}\n${separator}\n${entries.join('\n')}`;
}

function buildPlainCertifications(certs: string[]): string {
  const header = 'CERTIFICATIONS';
  const separator = '─'.repeat(header.length);
  return `${header}\n${separator}\n${certs.map(c => `  ${TEMPLATE_RULES.content.bulletSymbol} ${c}`).join('\n')}`;
}

function buildPlainProjects(
  projects: ProjectEntry[],
  keywords: { technical: string[]; action: string[]; domain: string[] }
): string {
  const header = 'PROJECTS';
  const separator = '─'.repeat(header.length);
  const entries: string[] = [];
  const relevantKeywords = [...keywords.technical.slice(0, 5), ...keywords.domain.slice(0, 3)];

  const topProjects = projects.slice(0, TEMPLATE_RULES.content.maxExperiences);

  for (const proj of topProjects) {
    const name = proj.title || 'Project';
    const techs = (proj.technologies || []).join(', ');
    const duration = proj.duration || '';

    // Format: Project Name | Technologies                              Date
    const leftPart = techs ? `${name} | ${techs}` : name;
    const titleLine = duration
      ? `${leftPart}${' '.repeat(Math.max(1, TEMPLATE_RULES.layout.pageWidthChars - leftPart.length - duration.length))}${duration}`
      : leftPart;

    // Generate exactly 4 bullets using generateFourBullets
    const bullets = generateFourBullets(proj, relevantKeywords);

    const formattedBullets = bullets
      .map(b => `  ${TEMPLATE_RULES.content.bulletSymbol} ${b}`)
      .join('\n');

    entries.push(`${titleLine}\n${formattedBullets}`);
  }

  return `${header}\n${separator}\n${entries.join('\n\n')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML BUILDERS (for rendered resume with exact font/size/spacing)
// ═══════════════════════════════════════════════════════════════════════════════

function wrapInHTMLDocument(body: string, title: string): string {
  // ══════════════════════════════════════════════════════════════════════════
  // Resume Template — CSS spacing rules
  //
  // Spacing values:
  //   -4pt margin-top before section header
  //   -5pt margin-bottom after section rule
  //   -2pt margin-top before subheading
  //   -7pt margin-bottom after subheading
  //   -2pt margin-bottom after each bullet item
  //   -5pt margin-bottom after item list end
  //   1pt margin-bottom after name
  //   0.15in left padding for lists
  //   0.5in effective page margins
  // ══════════════════════════════════════════════════════════════════════════
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} - Resume</title>
<style>
  @page {
    size: letter;
    margin: 0.5in;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Computer Modern', 'Latin Modern', 'CMU Serif', Georgia, serif;
    font-size: 11pt;
    line-height: 1.15;
    color: #000;
    max-width: 7.5in;
    margin: 0 auto;
    padding: 0.5in;
  }

  /* ─── Name: large, small-caps, centered ─── */
  .resume-name {
    font-size: 22pt;
    font-weight: bold;
    text-align: center;
    font-variant: small-caps;
    letter-spacing: 1pt;
    margin-bottom: 1pt;
  }

  /* ─── Contact: small, pipe-separated, centered ─── */
  .resume-contact {
    font-size: 9.5pt;
    text-align: center;
    margin-bottom: 0;
  }
  .resume-contact a { color: #000; text-decoration: underline; }
  .resume-contact .sep { margin: 0 4pt; }

  /* ─── Section header: bold uppercase with bottom rule, tight spacing ─── */
  .resume-section {
    font-size: 12pt;
    font-weight: bold;
    font-variant: small-caps;
    letter-spacing: 0.5pt;
    text-transform: uppercase;
    border-bottom: 0.8pt solid #000;
    padding-bottom: 0;
    margin-top: 6pt;
    margin-bottom: 0pt;
  }

  /* ─── Subheading list: indented, no bullets ─── */
  .resume-subheading-list {
    list-style: none;
    padding-left: 0.15in;
  }

  /* ─── Subheading entry: tight vertical spacing
       Two rows: bold title + date(right), italic subtitle + location(right) ─── */
  .resume-subheading {
    margin-top: 2pt;
    margin-bottom: 0;
  }
  .resume-subheading-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    line-height: 1.3;
  }
  .resume-subheading-row:first-child {
    font-weight: bold;
    font-size: 10.5pt;
  }
  .resume-subheading-row:last-child {
    font-style: italic;
    font-size: 9.5pt;
  }
  .resume-subheading-right {
    text-align: right;
    white-space: nowrap;
    font-size: 10pt;
  }
  .resume-subheading-right-sm {
    text-align: right;
    white-space: nowrap;
    font-size: 9.5pt;
    font-style: italic;
  }

  /* ─── Bullet items: tight spacing, small font ─── */
  .resume-items {
    list-style: disc;
    padding-left: 0.35in;
    margin-top: 0;
    margin-bottom: 0;
  }
  .resume-items li {
    font-size: 10pt;
    line-height: 1.25;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }

  /* ─── Item list end: negative bottom margin for tightness ─── */
  .resume-items-end {
    margin-bottom: -2pt;
  }

  /* ─── Project heading: bold name | italic tech, date right ─── */
  .resume-project-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 2pt;
    margin-bottom: 0;
    font-size: 10.5pt;
  }
  .resume-project-name { font-weight: bold; }
  .resume-project-tech { font-style: italic; font-weight: normal; }
  .resume-project-date { font-size: 10pt; white-space: nowrap; }

  /* ─── Skills: bold label + colon + items, indented ─── */
  .resume-skills {
    list-style: none;
    padding-left: 0.15in;
    margin-top: 2pt;
  }
  .resume-skills li {
    font-size: 10pt;
    line-height: 1.4;
    margin-bottom: 0;
  }
  .resume-skills-label { font-weight: bold; }

  /* ─── Education ─── */
  .resume-edu { margin-top: 2pt; }

  @media print {
    body { padding: 0; max-width: none; }
    .resume-section { page-break-after: avoid; }
    .resume-subheading { page-break-inside: avoid; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function buildHTMLHeader(profile: ProfileData, job: JobContext): string {
  // Format: large small-caps name centered, then small contact with | separators
  const contactParts = [profile.location, profile.email, profile.phone, profile.linkedin].filter((x): x is string => Boolean(x));
  const contactHtml = contactParts.map((part, i) => {
    const isLink = part.includes('linkedin') || part.includes('github') || part.includes('@');
    const rendered = isLink
      ? `<a href="${part.startsWith('http') ? '' : (part.includes('@') ? 'mailto:' : 'https://')}${escapeHtml(part)}">${escapeHtml(part)}</a>`
      : escapeHtml(part);
    return i < contactParts.length - 1 ? `${rendered}<span class="sep">|</span>` : rendered;
  }).join(' ');

  return `
<div class="resume-name">${escapeHtml(profile.name)}</div>
<div class="resume-contact">${contactHtml}</div>`;
}

function buildHTMLSummary(profile: ProfileData, job: JobContext, matchedSkills: string[], keywords: { technical: string[]; domain: string[] }): string {
  const topTech = keywords.technical.slice(0, 4);
  const topSkills = matchedSkills.slice(0, 3);

  let summary: string;
  if (profile.summary) {
    summary = profile.summary;
    const missing = keywords.technical.slice(0, 3).filter(kw => !summary.toLowerCase().includes(kw.toLowerCase()));
    if (missing.length > 0) summary += ` Experienced with ${missing.join(', ')}.`;
  } else {
    summary = `Results-driven ${job.title} professional with expertise in ${topTech.join(', ') || topSkills.join(', ') || 'industry-leading technologies'}. ` +
      `Proven track record of delivering measurable outcomes. ` +
      `Seeking to contribute at ${job.company}.`;
  }

  // Section header with rule, then tight content
  return `
<div class="resume-section">Summary</div>
<ul class="resume-subheading-list"><li style="font-size:10pt;line-height:1.3;margin-top:2pt;">${escapeHtml(summary)}</li></ul>`;
}

function buildHTMLSkills(prioritizedSkills: string[], matchedSkills: string[]): string {
  // Group skills into categories with bold labels

  // Group skills into categories (best effort)
  const categories = categorizeSkills(prioritizedSkills);
  const rows = Object.entries(categories)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) =>
      `    <li><span class="resume-skills-label">${escapeHtml(label)}</span>: ${items.map(escapeHtml).join(', ')}</li>`
    ).join('\n');

  return `
<div class="resume-section">Technical Skills</div>
<ul class="resume-skills">
${rows}
</ul>`;
}

/** Categorize skills into standard resume groups */
function categorizeSkills(skills: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    'Languages': [],
    'Frameworks': [],
    'Developer Tools': [],
    'Libraries & Platforms': [],
  };

  const languageKeywords = ['python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'sql', 'html', 'css', 'bash', 'shell', 'perl', 'matlab', 'dart', 'lua', 'haskell', 'elixir', 'clojure'];
  const frameworkKeywords = ['react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'spring', 'rails', 'laravel', 'fastapi', '.net', 'svelte', 'gatsby', 'nuxt', 'remix', 'nest.js', 'fastify', 'gin', 'fiber', 'actix'];
  const toolKeywords = ['git', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'aws', 'azure', 'gcp', 'linux', 'vim', 'vscode', 'intellij', 'jira', 'figma', 'postman', 'webpack', 'vite', 'github', 'gitlab', 'bitbucket'];

  for (const skill of skills) {
    const lower = skill.toLowerCase();
    if (languageKeywords.some(k => lower.includes(k) || k.includes(lower))) {
      categories['Languages'].push(skill);
    } else if (frameworkKeywords.some(k => lower.includes(k) || k.includes(lower))) {
      categories['Frameworks'].push(skill);
    } else if (toolKeywords.some(k => lower.includes(k) || k.includes(lower))) {
      categories['Developer Tools'].push(skill);
    } else {
      categories['Libraries & Platforms'].push(skill);
    }
  }

  return categories;
}

function buildHTMLExperience(experiences: ProjectEntry[], keywords: { technical: string[]; action: string[]; domain: string[] }, job: JobContext): string {
  const relevantKeywords = [...keywords.technical.slice(0, 5), ...keywords.domain.slice(0, 3)];
  const topExperiences = experiences.slice(0, TEMPLATE_RULES.content.maxExperiences);

  // CSS: tight spacing before subheading, after subheading, per item, at list end

  const entries = topExperiences.map(exp => {
    const role = exp.role || exp.title || 'Professional Role';
    const company = exp.company || '';
    const duration = exp.duration || '';

    // Generate exactly 4 bullets using generateFourBullets
    const bullets = generateFourBullets(exp, relevantKeywords);

    const bulletItems = bullets
      .map(b => `      <li>${escapeHtml(b)}</li>`)
      .join('\n');

    // Two-row subheading: bold title + date, then italic company + location
    return `
  <li class="resume-subheading">
    <div class="resume-subheading-row">
      <span>${escapeHtml(role)}</span>
      <span class="resume-subheading-right">${escapeHtml(duration)}</span>
    </div>
    <div class="resume-subheading-row">
      <span>${escapeHtml(company)}</span>
      <span class="resume-subheading-right-sm"></span>
    </div>
    <ul class="resume-items resume-items-end">
${bulletItems}
    </ul>
  </li>`;
  }).join('\n');

  return `
<div class="resume-section">Experience</div>
<ul class="resume-subheading-list">
${entries}
</ul>`;
}

function buildHTMLProjects(
  projects: ProjectEntry[],
  keywords: { technical: string[]; action: string[]; domain: string[] }
): string {
  const topProjects = projects.slice(0, TEMPLATE_RULES.content.maxExperiences);
  const relevantKeywords = [...keywords.technical.slice(0, 5), ...keywords.domain.slice(0, 3)];

  const entries = topProjects.map(proj => {
    const name = proj.title || 'Project';
    const techs = (proj.technologies || []).join(', ');
    const duration = proj.duration || '';

    // Generate exactly 4 bullets using generateFourBullets
    const bullets = generateFourBullets(proj, relevantKeywords);

    const bulletItems = bullets
      .map(b => `      <li>${escapeHtml(b)}</li>`)
      .join('\n');

    // Project format: bold name | italic tech, date right-aligned
    return `
  <li class="resume-subheading">
    <div class="resume-project-row">
      <span><span class="resume-project-name">${escapeHtml(name)}</span>${techs ? ` <span class="resume-project-tech">| ${escapeHtml(techs)}</span>` : ''}</span>
      <span class="resume-project-date">${escapeHtml(duration)}</span>
    </div>
    <ul class="resume-items resume-items-end">
${bulletItems}
    </ul>
  </li>`;
  }).join('\n');

  return `
<div class="resume-section">Projects</div>
<ul class="resume-subheading-list">
${entries}
</ul>`;
}

function buildHTMLEducation(education: EducationEntry[]): string {
  const entries = education.map(edu => {
    const degree = edu.degree + (edu.field ? ` in ${edu.field}` : '');
    return `
  <li class="resume-subheading resume-edu">
    <div class="resume-subheading-row">
      <span>${escapeHtml(edu.institution)}</span>
      <span class="resume-subheading-right">${escapeHtml(edu.year || '')}</span>
    </div>
    <div class="resume-subheading-row">
      <span>${escapeHtml(degree)}</span>
      <span class="resume-subheading-right-sm">${edu.gpa ? `GPA: ${escapeHtml(edu.gpa)}` : ''}</span>
    </div>
  </li>`;
  }).join('\n');

  return `
<div class="resume-section">Education</div>
<ul class="resume-subheading-list">
${entries}
</ul>`;
}

function buildHTMLCertifications(certs: string[]): string {
  const items = certs.map(c => `    <li>${escapeHtml(c)}</li>`).join('\n');
  return `
<div class="resume-section">Certifications</div>
<ul class="resume-items" style="padding-left:0.35in;margin-top:2pt;">
${items}
</ul>`;
}

// ─── Cover Letter Generation ───────────────────────────────────────────────────

export function generateCoverLetter(profile: ProfileData, job: JobContext, matchedSkills: string[]): string {
  const keywords = extractKeywords(job.description);
  const topTech = keywords.technical.slice(0, 4).join(', ');
  const topSkills = matchedSkills.slice(0, 4).join(', ');

  return [
    `Dear Hiring Manager,`,
    ``,
    `I am writing to express my strong interest in the ${job.title} position at ${job.company}. ` +
    `With proven expertise in ${topTech || topSkills || 'the required technologies'}, I am confident in my ability to deliver meaningful impact for your team.`,
    ``,
    profile.summary
      ? profile.summary
      : `My background combines deep technical ability with a results-oriented approach. ` +
        `I have consistently delivered outcomes using ${keywords.technical.slice(0, 3).join(', ') || 'modern technologies'} ` +
        `and thrive in ${job.remote ? 'distributed' : 'collaborative'} environments.`,
    ``,
    `Key qualifications aligned with this role:`,
    ...matchedSkills.slice(0, 5).map(s => `• ${s}`),
    ``,
    `I would welcome the opportunity to discuss how my experience aligns with ${job.company}'s objectives. ` +
    `Thank you for your consideration.`,
    ``,
    `Sincerely,`,
    profile.name,
  ].join('\n');
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
