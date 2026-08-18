'use client';

import { useState } from 'react';

type GitHubAnalysis = {
  reposCount: number;
  languages: string[];
  projects: string[];
  name?: string;
  headline?: string;
  skillsCount: number;
  experienceCount: number;
  educationCount: number;
};

type ImportResult = {
  success: boolean;
  method: string;
  confidence?: number;
  warnings?: string[];
  source?: string;
  profile?: { name: string; headline: string; skillsCount: number; experienceCount: number; educationCount: number };
  parsed?: { name: string; headline: string; skillsCount: number; experienceCount: number; educationCount: number; certificationsCount: number };
};

const YEARS_OPTIONS = [
  { value: 0, label: '0–1 years' },
  { value: 1, label: '1–2 years' },
  { value: 2, label: '2–3 years' },
  { value: 3, label: '3–5 years' },
  { value: 5, label: '5–10 years' },
  { value: 10, label: '10+ years' },
];

type ImportMethod = 'github' | 'resume';

export default function ImportProfile() {
  // Method selector
  const [importMethod, setImportMethod] = useState<ImportMethod | null>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1
  const [githubUrl, setGithubUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GitHubAnalysis | null>(null);
  const [step1Error, setStep1Error] = useState('');

  // Step 2
  const [yearsOfExperience, setYearsOfExperience] = useState<number | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [workHistory, setWorkHistory] = useState('');
  const [achievements, setAchievements] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Step 3
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [submitError, setSubmitError] = useState('');

  // Resume paste method
  const [resumeText, setResumeText] = useState('');
  const [resumeSubmitting, setResumeSubmitting] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // ─── Step 1: Analyze GitHub ────────────────────────────────────────────
  async function handleAnalyzeGitHub() {
    if (!githubUrl.trim()) return;
    setAnalyzing(true);
    setStep1Error('');

    try {
      // Extract username from GitHub URL
      const match = githubUrl.trim().match(/github\.com\/([^\/\?#]+)/i);
      if (!match) {
        throw new Error('Please enter a valid GitHub URL (e.g., https://github.com/username)');
      }
      const username = match[1];

      // Fetch public repos to analyze
      const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('GitHub user not found. Please check the URL.');
        throw new Error('Failed to fetch GitHub profile. Please try again.');
      }

      const repos = await res.json() as Array<{
        name: string;
        language: string | null;
        fork: boolean;
        description: string | null;
        stargazers_count: number;
      }>;

      // Also fetch user profile
      const userRes = await fetch(`https://api.github.com/users/${username}`);
      const userData = userRes.ok ? await userRes.json() as { name?: string; bio?: string } : null;

      // Analyze repos
      const ownRepos = repos.filter(r => !r.fork);
      const languages = [...new Set(ownRepos.map(r => r.language).filter(Boolean))] as string[];
      const topProjects = ownRepos
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 8)
        .map(r => r.name + (r.description ? ` — ${r.description}` : ''));

      setAnalysis({
        reposCount: ownRepos.length,
        languages,
        projects: topProjects,
        name: userData?.name || undefined,
        headline: userData?.bio || undefined,
        skillsCount: languages.length,
        experienceCount: topProjects.length,
        educationCount: 0,
      });

      setCurrentStep(2);
    } catch (e) {
      setStep1Error(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  // ─── Step 2 → Step 3 ──────────────────────────────────────────────────
  function handleProceedToConfirmation() {
    if (yearsOfExperience === null || !targetRole.trim()) return;
    setCurrentStep(3);
  }

  // ─── Step 3: Submit everything ─────────────────────────────────────────
  async function handleGenerateResume() {
    setSubmitting(true);
    setSubmitError('');

    try {
      const body = {
        mode: 'urls' as const,
        githubUrl: githubUrl.trim(),
        linkedinUrl: linkedinUrl.trim() || undefined,
        yearsOfExperience: yearsOfExperience!,
        targetRole: targetRole.trim(),
        workHistory: workHistory.trim() || undefined,
        achievements: achievements.trim() || undefined,
      };

      const res = await fetch('/api/profile/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Resume paste/upload submit ────────────────────────────────────────
  async function handleResumeSubmit() {
    if (resumeText.trim().length < 50) {
      setResumeError('Please paste at least 50 characters of your resume.');
      return;
    }
    setResumeSubmitting(true);
    setResumeError('');

    try {
      const res = await fetch('/api/profile/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'resume',
          resumeText: resumeText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setResumeSubmitting(false);
    }
  }

  // ─── Handle file upload (read text from .txt files) ────────────────────
  async function handleFileUpload(file: File) {
    setResumeFile(file);
    setResumeError('');
    try {
      const text = await file.text();
      if (text.trim().length < 50) {
        setResumeError('The file appears to be too short or empty. Please use a .txt file with your resume content.');
        return;
      }
      setResumeText(text);
    } catch {
      setResumeError('Could not read the file. Please paste your resume text directly instead.');
    }
  }

  // ─── Success state ─────────────────────────────────────────────────────
  if (result) {
    const profileInfo = result.profile || result.parsed;
    return (
      <div className="content">
        <div className="topbar">
          <div>
            <div className="eyebrow">Profile Setup</div>
            <h1 className="h1">Profile imported successfully!</h1>
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>✅</span>
            <div>
              <h2 style={{ margin: 0 }}>Your profile is ready</h2>
              <div className="muted">
                {result.method === 'resume_upload'
                  ? 'Parsed from your resume'
                  : `Extracted from ${result.source} (${result.confidence}% confidence)`}
              </div>
            </div>
          </div>

          <div className="grid grid2" style={{ marginTop: 16 }}>
            <div>
              <div className="kicker">Extracted</div>
              <div className="stack">
                <div className="split">
                  <span>Name</span>
                  <span className="pill">{profileInfo?.name || '—'}</span>
                </div>
                <div className="split">
                  <span>Skills</span>
                  <span className="pill good">{profileInfo?.skillsCount || 0} found</span>
                </div>
                <div className="split">
                  <span>Experience entries</span>
                  <span className="pill good">{profileInfo?.experienceCount || 0} found</span>
                </div>
                <div className="split">
                  <span>Education</span>
                  <span className="pill good">{profileInfo?.educationCount || 0} found</span>
                </div>
              </div>
            </div>
            <div>
              <div className="kicker">What happens next</div>
              <div className="stack">
                <div>• Your profile is saved as the canonical source of truth</div>
                <div>• Every application will generate a tailored resume</div>
                <div>• XYZ + STAR format with 100% JD keyword coverage</div>
                <div>• ATS-optimized template (Calibri 10.5pt, proper margins)</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <a href="/profile" className="btn primary">View &amp; Edit Profile</a>
            <a href="/jobs" className="btn">Browse Jobs</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="topbar">
        <div>
          <div className="eyebrow">Profile Setup</div>
          <h1 className="h1">Import your profile</h1>
          <div className="muted">
            Tell us about yourself step by step. We&apos;ll build an unrejectable resume for every application.
          </div>
        </div>
      </div>

      {/* ─── Method Selector ─────────────────────────────────────────── */}
      {!importMethod && (
        <div style={{ marginTop: 24, display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', maxWidth: 640 }}>
          <button
            className="card"
            onClick={() => setImportMethod('github')}
            style={{ cursor: 'pointer', textAlign: 'left', border: '1px solid #2a2a3e', background: '#111', padding: 24 }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🐙</div>
            <h3 style={{ margin: '0 0 8px' }}>Import from GitHub</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Analyze your repositories to extract skills, languages, and projects automatically.
            </p>
          </button>
          <button
            className="card"
            onClick={() => setImportMethod('resume')}
            style={{ cursor: 'pointer', textAlign: 'left', border: '1px solid #2a2a3e', background: '#111', padding: 24 }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <h3 style={{ margin: '0 0 8px' }}>Paste / Upload Resume</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Paste your existing resume text or upload a .txt file. We&apos;ll parse it into structured data.
            </p>
          </button>
        </div>
      )}

      {/* ─── Resume Paste/Upload Method ──────────────────────────────── */}
      {importMethod === 'resume' && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Paste or Upload Your Resume</h2>
            <button className="btn" onClick={() => setImportMethod(null)} style={{ fontSize: 13 }}>← Change method</button>
          </div>
          <p className="muted" style={{ marginBottom: 24 }}>
            Paste your full resume content below, or upload a .txt file. We&apos;ll extract your skills, experience, education, and certifications.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label className="label" htmlFor="resume-file">
              Upload resume file
              <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>.txt format</span>
            </label>
            <input
              id="resume-file"
              type="file"
              accept=".txt,.md"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              style={{ marginBottom: 8 }}
            />
            {resumeFile && <div className="muted" style={{ fontSize: 13 }}>Loaded: {resumeFile.name}</div>}
          </div>

          <div>
            <label className="label" htmlFor="resume-text">Or paste your resume text</label>
            <textarea
              id="resume-text"
              className="textarea"
              placeholder={"JOHN DOE\nSenior Software Engineer\n\nSUMMARY\n3+ years building distributed systems...\n\nEXPERIENCE\nSoftware Engineer, Acme Corp (2022–Present)\n• Built microservices handling 1M+ requests/day\n• Reduced latency by 40% through caching strategy\n\nSKILLS\nTypeScript, Python, Go, AWS, Kubernetes, PostgreSQL..."}
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              style={{ minHeight: 300, fontFamily: 'monospace', fontSize: 13 }}
            />
          </div>

          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            {resumeText.length > 0 ? `${resumeText.length} characters` : 'Minimum 50 characters required'}
          </div>

          {resumeError && (
            <div className="notice" style={{ marginTop: 16, color: '#c41' }}>{resumeError}</div>
          )}

          <button
            className="btn primary"
            onClick={handleResumeSubmit}
            disabled={resumeSubmitting || resumeText.trim().length < 50}
            style={{ marginTop: 20 }}
          >
            {resumeSubmitting ? 'Parsing your resume...' : 'Import Resume'}
          </button>
        </div>
      )}

      {/* ─── GitHub Method ───────────────────────────────────────────── */}
      {importMethod === 'github' && (<>
      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <button className="btn" onClick={() => setImportMethod(null)} style={{ fontSize: 13 }}>← Change method</button>
      </div>

      {/* Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 16, marginBottom: 32 }}>
        <StepIndicator step={1} label="GitHub" current={currentStep} />
        <StepConnector active={currentStep >= 2} />
        <StepIndicator step={2} label="Details" current={currentStep} />
        <StepConnector active={currentStep >= 3} />
        <StepIndicator step={3} label="Confirm" current={currentStep} />
      </div>

      {/* ─── STEP 1: GitHub URL ──────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ marginBottom: 4 }}>Step 1: Connect your GitHub</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            We&apos;ll analyze your repositories to extract skills, languages, and projects automatically.
          </p>

          <div>
            <label className="label" htmlFor="github-url">Enter your GitHub profile URL</label>
            <input
              id="github-url"
              className="input"
              placeholder="https://github.com/yourusername"
              value={githubUrl}
              onChange={e => setGithubUrl(e.target.value)}
              disabled={analyzing}
              style={{ maxWidth: 480 }}
            />
          </div>

          {step1Error && (
            <div className="notice" style={{ marginTop: 16, color: '#c41' }}>{step1Error}</div>
          )}

          {analyzing && (
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="spinner" aria-hidden="true" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid #555', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
              <span className="muted">Analyzing your repositories...</span>
            </div>
          )}

          {!analyzing && (
            <button
              className="btn primary"
              onClick={handleAnalyzeGitHub}
              disabled={!githubUrl.trim()}
              style={{ marginTop: 20 }}
            >
              Analyze my GitHub
            </button>
          )}
        </div>
      )}

      {/* ─── STEP 2: Additional Information ──────────────────────────── */}
      {currentStep === 2 && (
        <div className="card" style={{ marginTop: 0 }}>
          {/* Show what was found from GitHub */}
          {analysis && (
            <div style={{ marginBottom: 24, padding: 16, background: '#1a1a2e', borderRadius: 8, border: '1px solid #2a2a3e' }}>
              <div className="kicker" style={{ marginBottom: 8 }}>GitHub Analysis Complete</div>
              <div className="stack">
                <div className="split">
                  <span>Repositories found</span>
                  <span className="pill good">{analysis.reposCount}</span>
                </div>
                <div className="split">
                  <span>Languages detected</span>
                  <span className="pill good">{analysis.languages.length}</span>
                </div>
                <div className="split">
                  <span>Languages</span>
                  <span className="muted" style={{ fontSize: 13 }}>{analysis.languages.join(', ')}</span>
                </div>
                <div className="split">
                  <span>Top projects</span>
                  <span className="pill">{analysis.projects.length} detected</span>
                </div>
              </div>
            </div>
          )}

          <h2 style={{ marginBottom: 4 }}>Step 2: Tell us more about yourself</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            This information helps us generate more targeted, higher-quality resumes.
          </p>

          <div className="form-grid" style={{ display: 'grid', gap: 20 }}>
            <div>
              <label className="label" htmlFor="years-exp">Years of experience *</label>
              <select
                id="years-exp"
                className="input"
                value={yearsOfExperience ?? ''}
                onChange={e => setYearsOfExperience(e.target.value ? Number(e.target.value) : null)}
                style={{ maxWidth: 280 }}
              >
                <option value="">Select...</option>
                {YEARS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="target-role">What role are you applying for? *</label>
              <input
                id="target-role"
                className="input"
                placeholder="e.g., Senior Frontend Engineer, Full Stack Developer, Staff SRE"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                style={{ maxWidth: 480 }}
              />
            </div>

            <div>
              <label className="label" htmlFor="work-history">
                Describe your work experience
                <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>Strongly recommended</span>
              </label>
              <textarea
                id="work-history"
                className="textarea"
                placeholder="Companies you've worked at, roles held, what you built, team sizes, scale of systems you operated..."
                value={workHistory}
                onChange={e => setWorkHistory(e.target.value)}
                style={{ minHeight: 120 }}
              />
            </div>

            <div>
              <label className="label" htmlFor="achievements">
                Key achievements
                <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>Strongly recommended</span>
              </label>
              <textarea
                id="achievements"
                className="textarea"
                placeholder="Top achievements with numbers — users served, revenue impact, performance improvements, cost savings, uptime, release velocity..."
                value={achievements}
                onChange={e => setAchievements(e.target.value)}
                style={{ minHeight: 120 }}
              />
            </div>

            <div>
              <label className="label" htmlFor="linkedin-url">
                LinkedIn URL
                <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>Optional</span>
              </label>
              <input
                id="linkedin-url"
                className="input"
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                style={{ maxWidth: 480 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button className="btn" onClick={() => setCurrentStep(1)}>← Back</button>
            <button
              className="btn primary"
              onClick={handleProceedToConfirmation}
              disabled={yearsOfExperience === null || !targetRole.trim()}
            >
              Continue →
            </button>
          </div>

          {(yearsOfExperience === null || !targetRole.trim()) && (
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              * Years of experience and target role are required to continue.
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 3: Confirmation ────────────────────────────────────── */}
      {currentStep === 3 && (
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ marginBottom: 4 }}>Step 3: Review &amp; Generate</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            Review your profile summary. Once you confirm, we&apos;ll extract the full profile and generate your career data.
          </p>

          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ padding: 16, background: '#1a1a2e', borderRadius: 8, border: '1px solid #2a2a3e' }}>
              <div className="kicker" style={{ marginBottom: 12 }}>Profile Summary</div>
              <div className="stack">
                <div className="split">
                  <span>GitHub</span>
                  <span className="muted" style={{ fontSize: 13 }}>{githubUrl}</span>
                </div>
                {linkedinUrl && (
                  <div className="split">
                    <span>LinkedIn</span>
                    <span className="muted" style={{ fontSize: 13 }}>{linkedinUrl}</span>
                  </div>
                )}
                <div className="split">
                  <span>Target role</span>
                  <span className="pill">{targetRole}</span>
                </div>
                <div className="split">
                  <span>Experience</span>
                  <span className="pill">{YEARS_OPTIONS.find(o => o.value === yearsOfExperience)?.label}</span>
                </div>
                {analysis && (
                  <>
                    <div className="split">
                      <span>Repos analyzed</span>
                      <span className="pill good">{analysis.reposCount}</span>
                    </div>
                    <div className="split">
                      <span>Languages</span>
                      <span className="muted" style={{ fontSize: 13 }}>{analysis.languages.join(', ')}</span>
                    </div>
                  </>
                )}
                {workHistory && (
                  <div className="split">
                    <span>Work history</span>
                    <span className="pill good">Provided</span>
                  </div>
                )}
                {achievements && (
                  <div className="split">
                    <span>Achievements</span>
                    <span className="pill good">Provided</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {submitError && (
            <div className="notice" style={{ marginTop: 16, color: '#c41' }}>{submitError}</div>
          )}

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button className="btn" onClick={() => setCurrentStep(2)}>← Back</button>
            <button
              className="btn primary"
              onClick={handleGenerateResume}
              disabled={submitting}
            >
              {submitting ? 'Generating your resume...' : 'Generate my resume'}
            </button>
          </div>
        </div>
      )}

      </>)}

    </div>
  );
}

// ─── Step Indicator Components ──────────────────────────────────────────────

function StepIndicator({ step, label, current }: { step: number; label: string; current: number }) {
  const isActive = current >= step;
  const isCurrent = current === step;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          background: isActive ? '#4f46e5' : '#2a2a3e',
          color: isActive ? '#fff' : '#888',
          border: isCurrent ? '2px solid #818cf8' : '2px solid transparent',
          transition: 'all 0.2s',
        }}
      >
        {current > step ? '✓' : step}
      </div>
      <span style={{ fontSize: 12, color: isActive ? '#e0e0e0' : '#666' }}>{label}</span>
    </div>
  );
}

function StepConnector({ active }: { active: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        height: 2,
        background: active ? '#4f46e5' : '#2a2a3e',
        margin: '0 8px',
        marginBottom: 20,
        transition: 'background 0.2s',
      }}
    />
  );
}
