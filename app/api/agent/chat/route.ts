import { NextResponse } from 'next/server';
import { tailorResume, type ProfileData, type JobContext } from '@/lib/resume-tailor';

type ConversationState = 
  | 'awaiting_portfolio'
  | 'awaiting_jd'
  | 'awaiting_achievements'
  | 'follow_up'
  | 'generating'
  | 'complete';

interface ChatRequest {
  message: string;
  conversationState: ConversationState;
  portfolioLink?: string;
  jobDescription?: string;
  achievements?: string[];
  userName?: string;
}

interface ChatResponse {
  response: string;
  conversationState: ConversationState;
  action?: 'show_resume';
  resumeHtml?: string;
  resumeText?: string;
  portfolioLink?: string;
  jobDescription?: string;
  achievements?: string[];
}

// Skeptical follow-up detection
function detectExaggerations(text: string): string[] {
  const flags: string[] = [];
  
  const multiplierMatch = text.match(/(\d+)x\s+(improvement|increase|growth|faster|better|more)/i);
  if (multiplierMatch) {
    flags.push(`You mentioned ${multiplierMatch[1]}x ${multiplierMatch[2]} - can you provide specifics on what metrics you measured?`);
  }

  if (/single-?handedly|sole(ly)?|alone|by myself/i.test(text)) {
    flags.push('What was the team size? Were you the sole contributor?');
  }

  if (/\$\d+[MB]\b|\d+ ?million/i.test(text) && !/revenue|arr|savings|budget/i.test(text)) {
    flags.push('Can you clarify what that dollar figure represents - revenue, cost savings, or budget managed?');
  }

  if (/100%/i.test(text) && !/100% of tests/i.test(text)) {
    flags.push('A 100% improvement is significant. What was the baseline and how was this measured?');
  }

  if (/led\s+(a\s+)?team\s+of\s+(\d+)/i.test(text)) {
    const match = text.match(/led\s+(a\s+)?team\s+of\s+(\d+)/i);
    if (match && parseInt(match[2]) > 20) {
      flags.push(`Leading a team of ${match[2]} is notable. Were they all direct reports or was this cross-functional?`);
    }
  }

  return flags;
}

function extractJobInfo(text: string): Partial<JobContext> {
  const titleMatch = text.match(/(?:role|position|title)[:\s]+(.+?)(?:\n|$)/i);
  const companyMatch = text.match(/(?:company|at|for)[:\s]+(.+?)(?:\n|$)/i);
  
  return {
    title: titleMatch?.[1]?.trim() || 'Software Engineer',
    company: companyMatch?.[1]?.trim() || 'Target Company',
    description: text,
    requirements: extractRequirements(text),
    location: 'Remote',
    remote: true,
  };
}

function extractRequirements(text: string): string[] {
  const reqs: string[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const cleaned = line.replace(/^[-•*]\s*/, '').trim();
    if (cleaned.length > 10 && cleaned.length < 200) {
      if (/experience|proficiency|knowledge|familiar|skill|year|degree/i.test(cleaned)) {
        reqs.push(cleaned);
      }
    }
  }
  return reqs.slice(0, 10);
}

function buildProfileFromChat(
  portfolioLink: string,
  achievements: string[],
  jobDescription: string,
  userName?: string
): ProfileData {
  const name = userName || 'Candidate';
  return {
    name,
    headline: 'Professional seeking new opportunity',
    summary: achievements.join('. '),
    location: 'Remote',
    workAuth: 'Authorized',
    skills: extractSkillsFromAchievements(achievements, jobDescription),
    projects: achievements.map((a, i) => ({
      title: `Achievement ${i + 1}`,
      result: a,
      metrics: extractMetrics(a),
      technologies: [],
      isProject: false,
    })),
    education: [],
    certifications: [],
    linkedin: portfolioLink,
    resumeText: achievements.join('\n'),
  };
}

function extractSkillsFromAchievements(achievements: string[], jd: string): string[] {
  const techPatterns = /\b(JavaScript|TypeScript|Python|React|Node\.?js|AWS|Docker|Kubernetes|GraphQL|SQL|PostgreSQL|MongoDB|Go|Rust|Java|C\+\+|Swift|Ruby|Rails|Django|Next\.?js|Vue|Angular|Redis|Kafka|Terraform|CI\/CD|Git|REST|API|microservices|machine learning|AI|ML|NLP)\b/gi;
  
  const combined = [...achievements, jd].join(' ');
  const matches = combined.match(techPatterns) || [];
  return [...new Set(matches.map(m => m.trim()))].slice(0, 15);
}

function extractMetrics(text: string): string[] {
  const metrics: string[] = [];
  const percentMatch = text.match(/\d+%/g);
  if (percentMatch) metrics.push(...percentMatch);
  const numMatch = text.match(/\$[\d,.]+[KMB]?/gi);
  if (numMatch) metrics.push(...numMatch);
  return metrics;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body: ChatRequest = await req.json();
    const { message, conversationState, portfolioLink, jobDescription, achievements = [], userName } = body;

    let response: ChatResponse;

    switch (conversationState) {
      case 'awaiting_portfolio': {
        // User should have pasted a link
        const urlMatch = message.match(/https?:\/\/[^\s]+/i);
        const link = urlMatch ? urlMatch[0] : message.trim();
        
        if (!link || link.length < 5) {
          response = {
            response: "I didn't catch a link there. Could you paste your portfolio URL? It can be a personal site, GitHub profile, LinkedIn, or any relevant link.",
            conversationState: 'awaiting_portfolio',
          };
        } else {
          response = {
            response: `Got it! I'll include ${link} in your resume.\n\nWhat job are you applying for? Paste the job description or URL so I can tailor your resume to it.`,
            conversationState: 'awaiting_jd',
            portfolioLink: link,
          };
        }
        break;
      }

      case 'awaiting_jd': {
        if (message.trim().length < 20) {
          response = {
            response: "That seems a bit short for a job description. Could you paste more details about the role? The more context I have, the better I can tailor your resume.",
            conversationState: 'awaiting_jd',
          };
        } else {
          response = {
            response: "Great, I can see the role requirements. Now, what specific achievements would you like highlighted? Think about:\n\n• Key projects you led or contributed to\n• Measurable outcomes (metrics, improvements, cost savings)\n• Technical challenges you solved\n\nShare as many as you'd like — I'll ask follow-up questions if needed.",
            conversationState: 'awaiting_achievements',
            jobDescription: message.trim(),
          };
        }
        break;
      }

      case 'awaiting_achievements': {
        // Check if user is done
        if (/^(done|generate|finish|that'?s? (all|it)|no more)$/i.test(message.trim())) {
          // Generate resume
          const profile = buildProfileFromChat(
            portfolioLink || '',
            achievements,
            jobDescription || '',
            userName
          );
          const job = extractJobInfo(jobDescription || '');
          const fullJob: JobContext = {
            title: job.title || 'Software Engineer',
            company: job.company || 'Target Company',
            description: jobDescription || '',
            requirements: job.requirements || [],
            location: job.location || 'Remote',
            remote: job.remote ?? true,
          };

          const result = tailorResume(profile, fullJob);

          response = {
            response: "Here's your tailored resume! I've:\n\n• Included your portfolio link in the header\n• Aligned your achievements with the job requirements\n• Used quantified XYZ+STAR format for maximum impact\n• Ensured ATS compatibility\n\nReview it on the right and download when ready.",
            conversationState: 'complete',
            action: 'show_resume',
            resumeHtml: result.html,
            resumeText: result.content,
          };
        } else {
          const updatedAchievements = [...achievements, message.trim()];
          
          // Check for exaggerations
          const flags = detectExaggerations(message);
          
          if (flags.length > 0) {
            response = {
              response: `Before I include that, I want to make sure we're being accurate:\n\n${flags.map(f => `• ${f}`).join('\n')}\n\nPlease clarify so the resume stays truthful and defensible in interviews.`,
              conversationState: 'follow_up',
              achievements: updatedAchievements,
            };
          } else if (updatedAchievements.length < 2) {
            response = {
              response: "Good one! Any more achievements you'd like to add? (Type 'done' when you're ready for me to generate your tailored resume)",
              conversationState: 'awaiting_achievements',
              achievements: updatedAchievements,
            };
          } else {
            response = {
              response: "Solid achievements! Any more to add, or should I generate your tailored resume now? (Type 'done' or add more)",
              conversationState: 'awaiting_achievements',
              achievements: updatedAchievements,
            };
          }
        }
        break;
      }

      case 'follow_up': {
        // User is providing clarification
        const clarifiedAchievements = [...achievements];
        if (clarifiedAchievements.length > 0) {
          clarifiedAchievements[clarifiedAchievements.length - 1] += ` [Clarification: ${message.trim()}]`;
        }

        response = {
          response: "Thanks for clarifying — that's much more defensible in an interview. Any more achievements, or type 'done' to generate your resume.",
          conversationState: 'awaiting_achievements',
          achievements: clarifiedAchievements,
        };
        break;
      }

      default: {
        response = {
          response: "I'm not sure what you'd like to do. You can:\n• Add more achievements\n• Type 'done' to generate your resume\n• Start over by refreshing the page",
          conversationState: conversationState,
        };
      }
    }

    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Chat processing failed' },
      { status: 500 }
    );
  }
}
