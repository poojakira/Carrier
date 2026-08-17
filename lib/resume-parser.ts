/**
 * Resume Parser
 * 
 * Parses uploaded resume text (plain text or extracted PDF text) into
 * structured ProfileData for use by the tailoring engine.
 * 
 * Handles common resume formats:
 * - Chronological (most common)
 * - Functional (skills-focused)
 * - Combination (hybrid)
 * 
 * Extracts: name, contact, summary, skills, experience, education, certifications
 */

import type { ProfileData, ProjectEntry, EducationEntry } from './resume-tailor';

// ─── Section Detection Patterns ────────────────────────────────────────────────

const SECTION_PATTERNS: Record<string, RegExp> = {
  summary: /^(?:(?:professional\s+)?summary|profile|about|objective|career\s+(?:summary|objective))/i,
  experience: /^(?:(?:professional\s+|work\s+)?experience|employment(?:\s+history)?|work\s+history|career\s+history|relevant\s+experience)/i,
  skills: /^(?:(?:technical\s+|core\s+|key\s+)?skills|technologies|tech\s+stack|competencies|proficiencies|tools\s+(?:&|and)\s+technologies|areas\s+of\s+expertise)/i,
  education: /^(?:education|academic|degrees?|qualifications)/i,
  certifications: /^(?:certifications?|licenses?|credentials?|professional\s+development|training)/i,
  projects: /^(?:projects?|portfolio|selected\s+projects?|notable\s+projects?|personal\s+projects?)/i,
  awards: /^(?:awards?|honors?|achievements?|recognition)/i,
  publications: /^(?:publications?|papers?|research)/i,
  volunteer: /^(?:volunteer|community|pro\s+bono)/i,
};

// ─── Main Parser ───────────────────────────────────────────────────────────────

export function parseResume(text: string): ProfileData {
  const lines = text.split('\n').map(l => l.trimEnd());

  // Phase 1: Extract name and contact info from the top
  const { name, email, phone, linkedin, contactEndLine } = extractContact(lines);

  // Phase 2: Identify sections
  const sections = identifySections(lines, contactEndLine);

  // Phase 3: Parse each section
  const summary = parseSummarySection(sections.summary || []);
  const skills = parseSkillsSection(sections.skills || []);
  const experience = parseExperienceSection(sections.experience || []);
  const projects = parseExperienceSection(sections.projects || []);
  const education = parseEducationSection(sections.education || []);
  const certifications = parseCertificationsSection(sections.certifications || []);

  // Phase 4: Fallback — if no structured sections found, try to parse the whole thing
  const allExperience = [...experience, ...projects];
  if (allExperience.length === 0 && skills.length === 0) {
    // Treat the whole document as unstructured — extract what we can
    const fallback = parseUnstructured(lines, contactEndLine);
    return {
      name: name || fallback.name,
      email,
      phone,
      linkedin,
      headline: summary.split('.')[0] || '',
      summary,
      location: '',
      workAuth: '',
      skills: fallback.skills,
      projects: fallback.projects,
      education: education.length > 0 ? education : fallback.education,
      certifications,
      resumeText: text,
    };
  }

  return {
    name,
    email,
    phone,
    linkedin,
    headline: summary.split('.')[0] || generateHeadline(experience, skills),
    summary,
    location: '',
    workAuth: '',
    skills,
    projects: allExperience,
    education,
    certifications,
    resumeText: text,
  };
}

// ─── Contact Extraction ────────────────────────────────────────────────────────

function extractContact(lines: string[]): {
  name: string;
  email: string | undefined;
  phone: string | undefined;
  linkedin: string | undefined;
  contactEndLine: number;
} {
  let name = '';
  let email: string | undefined;
  let phone: string | undefined;
  let linkedin: string | undefined;
  let contactEndLine = 0;

  // Name is typically the first non-empty line
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // First substantial line that's not email/phone/url is likely the name
    if (!name && !isContactLine(line) && line.length < 60 && !isSectionHeader(line)) {
      name = line;
      contactEndLine = i + 1;
      continue;
    }

    // Extract contact details
    const emailMatch = line.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) { email = emailMatch[1]; contactEndLine = i + 1; }

    const phoneMatch = line.match(/(\+?[\d\s\-().]{10,})/);
    if (phoneMatch && !email) { phone = phoneMatch[1].trim(); contactEndLine = i + 1; }
    else if (phoneMatch) { phone = phoneMatch[1].trim(); contactEndLine = i + 1; }

    const linkedinMatch = line.match(/((?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-]+)/);
    if (linkedinMatch) { linkedin = linkedinMatch[1]; contactEndLine = i + 1; }

    // Stop after finding contact info block (usually first 5 lines)
    if (i > 4) break;
  }

  return { name, email, phone, linkedin, contactEndLine };
}

function isContactLine(line: string): boolean {
  return /[@|linkedin|github|phone|email|tel:|http]/.test(line.toLowerCase());
}

// ─── Section Identification ────────────────────────────────────────────────────

function identifySections(lines: string[], startLine: number): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let currentSection = 'header';
  let currentLines: string[] = [];

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this line is a section header
    const detectedSection = detectSection(trimmed);
    if (detectedSection) {
      // Save previous section
      if (currentLines.length > 0) {
        sections[currentSection] = currentLines;
      }
      currentSection = detectedSection;
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  // Save last section
  if (currentLines.length > 0) {
    sections[currentSection] = currentLines;
  }

  return sections;
}

function detectSection(line: string): string | null {
  // Remove common decorators
  const cleaned = line
    .replace(/^[═─━─▬■□●◆★☆▪▫•\-_*=~#]+\s*/g, '') // Leading decorators
    .replace(/\s*[═─━─▬■□●◆★☆▪▫•\-_*=~#]+$/g, '')  // Trailing decorators
    .trim();

  if (cleaned.length === 0 || cleaned.length > 50) return null;

  for (const [section, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(cleaned)) return section;
  }

  return null;
}

function isSectionHeader(line: string): boolean {
  return detectSection(line) !== null;
}

// ─── Section Parsers ───────────────────────────────────────────────────────────

function parseSummarySection(lines: string[]): string {
  return lines
    .filter(l => l.trim().length > 0)
    .map(l => l.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSkillsSection(lines: string[]): string[] {
  const skills: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Handle various skill formats:
    // "Python, Java, JavaScript, TypeScript"
    // "• Python • Java • JavaScript"
    // "Languages: Python, Java, JavaScript"
    // "- Python - Java - JavaScript"

    // Strip label prefix (e.g., "Languages:", "Frameworks:")
    const withoutLabel = trimmed.replace(/^[^:]+:\s*/, '');

    // Split by common delimiters
    const items = withoutLabel
      .split(/[•|,;]|\s{2,}|\s*[-–]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 40);

    for (const item of items) {
      if (!skills.includes(item) && !isBoilerplate(item)) {
        skills.push(item);
      }
    }
  }

  return skills;
}

function parseExperienceSection(lines: string[]): ProjectEntry[] {
  const entries: ProjectEntry[] = [];
  let current: Partial<ProjectEntry> | null = null;
  let bulletBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Empty line might separate entries
      continue;
    }

    // Detect entry header (Role | Company | Date patterns)
    if (isExperienceHeader(trimmed)) {
      // Save previous entry
      if (current?.title) {
        current = finalizeEntry(current, bulletBuffer);
        entries.push(current as ProjectEntry);
      }
      bulletBuffer = [];
      current = parseExperienceHeader(trimmed);
      continue;
    }

    // Detect bullets
    const bulletMatch = trimmed.match(/^[•\-*–►▸▹]\s*(.+)/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
      continue;
    }

    // Non-bullet content under a header — could be a description line
    if (current && trimmed.length > 30 && !isExperienceHeader(trimmed)) {
      bulletBuffer.push(trimmed);
    }
  }

  // Save final entry
  if (current?.title) {
    current = finalizeEntry(current, bulletBuffer);
    entries.push(current as ProjectEntry);
  }

  return entries;
}

function isExperienceHeader(line: string): boolean {
  // Common patterns:
  // "Software Engineer | Google | Jan 2020 – Present"
  // "Software Engineer, Google (2020-2023)"
  // "Google — Software Engineer — Jan 2020 to Present"
  const hasDatePattern = /(?:20\d{2}|19\d{2}|present|current)/i.test(line);
  const hasDelimiter = /[|–—\-,]/.test(line);
  const notBullet = !/^[•\-*–►▸▹]/.test(line);
  const notTooLong = line.length < 120;
  const notTooShort = line.length > 10;

  return notBullet && notTooLong && notTooShort && (hasDatePattern || (hasDelimiter && line.split(/[|–—]/).length >= 2));
}

function parseExperienceHeader(line: string): Partial<ProjectEntry> {
  // Try multiple patterns
  // Pattern 1: "Role | Company | Date"
  let parts = line.split(/\s*[|]\s*/);
  if (parts.length >= 2) {
    const dateIdx = parts.findIndex(p => /(?:20\d{2}|19\d{2}|present|current)/i.test(p));
    const duration = dateIdx >= 0 ? parts[dateIdx] : undefined;
    const nonDateParts = parts.filter((_, i) => i !== dateIdx);

    return {
      title: nonDateParts[0]?.trim() || '',
      company: nonDateParts[1]?.trim() || '',
      duration,
      current: /present|current/i.test(line),
      metrics: [],
      technologies: [],
    };
  }

  // Pattern 2: "Role – Company – Date" or "Role — Company (Date)"
  parts = line.split(/\s*[–—]\s*/);
  if (parts.length >= 2) {
    const dateMatch = line.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)[\s\S]*?(?:20\d{2}|19\d{2}|present|current))/i);
    return {
      title: parts[0]?.trim() || '',
      company: parts[1]?.replace(/\(.*?\)/, '').trim() || '',
      duration: dateMatch?.[1]?.trim(),
      current: /present|current/i.test(line),
      metrics: [],
      technologies: [],
    };
  }

  // Pattern 3: "Role at Company (Date)"
  const atMatch = line.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[(\[]\s*(.+?)\s*[)\]])?$/i);
  if (atMatch) {
    return {
      title: atMatch[1].trim(),
      company: atMatch[2].trim(),
      duration: atMatch[3]?.trim(),
      current: /present|current/i.test(line),
      metrics: [],
      technologies: [],
    };
  }

  // Fallback
  return {
    title: line.slice(0, 60),
    metrics: [],
    technologies: [],
  };
}

function finalizeEntry(entry: Partial<ProjectEntry>, bullets: string[]): ProjectEntry {
  const metrics: string[] = [];
  let action = '';
  let result = '';

  for (const bullet of bullets) {
    // Extract metrics
    if (/\d+%|\$[\d,.]+[KMBkmb]?|\d+x|\d+\+?\s*\w+/i.test(bullet)) {
      metrics.push(bullet);
      if (!result) result = bullet;
    }
    if (!action) action = bullet;
  }

  // Extract technologies mentioned
  const allText = bullets.join(' ');
  const techPattern = /(?:Python|Java|JavaScript|TypeScript|React|Angular|Vue|Node\.js|AWS|Azure|GCP|Docker|Kubernetes|SQL|PostgreSQL|MySQL|MongoDB|Redis|GraphQL|REST|Git|CI\/CD|Terraform|Spark|Kafka)/gi;
  const technologies = [...new Set((allText.match(techPattern) || []).map(t => t))];

  return {
    title: entry.title || '',
    role: entry.title,
    company: entry.company,
    duration: entry.duration,
    current: entry.current,
    situation: bullets.length > 2 ? bullets[0] : undefined,
    task: undefined,
    action,
    result,
    metrics: metrics.length > 0 ? metrics : undefined,
    technologies: technologies.length > 0 ? technologies : undefined,
  };
}

function parseEducationSection(lines: string[]): EducationEntry[] {
  const entries: EducationEntry[] = [];
  let current: Partial<EducationEntry> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect degree patterns
    const degreeMatch = trimmed.match(/(?:Bachelor|Master|Ph\.?D|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|MBA|Associate|Doctor)/i);
    const yearMatch = trimmed.match(/(20\d{2}|19\d{2})/);

    if (degreeMatch || (trimmed.length < 100 && yearMatch)) {
      if (current?.institution) entries.push(current as EducationEntry);

      // Parse the line
      const parts = trimmed.split(/\s*[|,–—]\s*/);
      current = {
        institution: '',
        degree: '',
        field: '',
        year: yearMatch?.[1] || '',
      };

      for (const part of parts) {
        if (/(?:University|College|Institute|School|Academy)/i.test(part)) {
          current.institution = part.trim();
        } else if (/(?:Bachelor|Master|Ph\.?D|B\.?S|M\.?S|B\.?A|M\.?A|MBA|Associate|Doctor)/i.test(part)) {
          current.degree = part.trim();
        } else if (/(?:in|of)\s+(.+)/i.test(part)) {
          current.field = part.replace(/^(?:in|of)\s+/i, '').trim();
        } else if (!current.institution && part.length > 5) {
          current.institution = part.trim();
        }
      }

      // If degree contains "in field"
      if (current.degree && !current.field) {
        const inField = current.degree.match(/(.+?)\s+in\s+(.+)/i);
        if (inField) {
          current.degree = inField[1].trim();
          current.field = inField[2].trim();
        }
      }
    }
  }

  if (current?.institution) entries.push(current as EducationEntry);
  return entries;
}

function parseCertificationsSection(lines: string[]): string[] {
  const certs: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[•\-*–►▸▹]\s*/, '');
    if (trimmed.length > 3 && trimmed.length < 150 && !isBoilerplate(trimmed)) {
      certs.push(trimmed);
    }
  }
  return certs;
}

// ─── Fallback Unstructured Parser ──────────────────────────────────────────────

function parseUnstructured(lines: string[], startLine: number): {
  name: string;
  skills: string[];
  projects: ProjectEntry[];
  education: EducationEntry[];
} {
  const allText = lines.slice(startLine).join('\n');
  const skills: string[] = [];
  const projects: ProjectEntry[] = [];
  const education: EducationEntry[] = [];

  // Extract any tech skills mentioned anywhere
  const techPattern = /(?:Python|Java|JavaScript|TypeScript|React|Angular|Vue|Next\.?js|Node\.?js|Express|AWS|Azure|GCP|Google Cloud|Docker|Kubernetes|SQL|PostgreSQL|MySQL|MongoDB|Redis|GraphQL|REST|Git|GitHub|CI\/CD|Terraform|Spark|Kafka|Linux|Agile|Scrum)/gi;
  const foundTech = allText.match(techPattern);
  if (foundTech) {
    for (const t of [...new Set(foundTech)]) {
      if (!skills.includes(t)) skills.push(t);
    }
  }

  // Try to find experience entries
  const experienceLines = lines.slice(startLine);
  let currentProject: Partial<ProjectEntry> | null = null;
  const bulletBuffer: string[] = [];

  for (const line of experienceLines) {
    const trimmed = line.trim();
    if (isExperienceHeader(trimmed)) {
      if (currentProject?.title) {
        projects.push(finalizeEntry(currentProject, bulletBuffer) as ProjectEntry);
        bulletBuffer.length = 0;
      }
      currentProject = parseExperienceHeader(trimmed);
    } else if (/^[•\-*–]\s*.+/.test(trimmed)) {
      bulletBuffer.push(trimmed.replace(/^[•\-*–]\s*/, ''));
    }
  }
  if (currentProject?.title) {
    projects.push(finalizeEntry(currentProject, bulletBuffer) as ProjectEntry);
  }

  return { name: '', skills, projects, education };
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function isBoilerplate(text: string): boolean {
  const lower = text.toLowerCase();
  return /^(?:page\s*\d|references|available upon request|\d+\s*of\s*\d+)/.test(lower);
}

function generateHeadline(experience: ProjectEntry[], skills: string[]): string {
  if (experience.length > 0) {
    const latestRole = experience[0].title || experience[0].role;
    if (latestRole) return latestRole;
  }
  if (skills.length > 0) {
    return `Professional with expertise in ${skills.slice(0, 3).join(', ')}`;
  }
  return '';
}
