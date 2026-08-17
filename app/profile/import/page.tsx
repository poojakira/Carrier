'use client';

import { useState } from 'react';

type ImportMethod = 'urls' | 'resume' | null;
type ImportResult = {
  success: boolean;
  method: string;
  confidence?: number;
  warnings?: string[];
  source?: string;
  profile?: { name: string; headline: string; skillsCount: number; experienceCount: number; educationCount: number };
  parsed?: { name: string; headline: string; skillsCount: number; experienceCount: number; educationCount: number; certificationsCount: number };
};

export default function ImportProfile() {
  const [method, setMethod] = useState<ImportMethod>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  async function handleImport() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body = method === 'urls'
        ? { mode: 'urls', githubUrl: githubUrl.trim() || undefined, linkedinUrl: linkedinUrl.trim() || undefined }
        : { mode: 'resume', resumeText };

      const res = await fetch('/api/profile/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = () => setResumeText(reader.result as string);
      reader.readAsText(file);
    } else if (file.type === 'application/pdf') {
      // For PDF, instruct user to paste text (PDF parsing requires server-side lib)
      setError('PDF upload detected. Please copy-paste the text content from your resume. Most PDF viewers support Select All → Copy.');
    } else {
      setError('Unsupported file type. Please upload a .txt file or paste your resume text.');
    }
  }

  return (
    <div className="content">
      <div className="topbar">
        <div>
          <div className="eyebrow">Profile Setup</div>
          <h1 className="h1">Import your profile</h1>
          <div className="muted">
            Choose how to provide your information. We&apos;ll generate an unrejectable, 100% keyword-matched resume for every job application.
          </div>
        </div>
      </div>

      {/* Method Selection */}
      {!method && (
        <div className="grid grid2" style={{ marginTop: 24 }}>
          <button
            className="card"
            onClick={() => setMethod('urls')}
            style={{ cursor: 'pointer', textAlign: 'left', border: '2px solid transparent' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
            <h2>Option 1: GitHub &amp; LinkedIn URLs</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Provide your GitHub and/or LinkedIn profile URLs. We&apos;ll automatically extract your skills,
              projects, experience, and education to build a complete professional profile.
            </p>
            <div className="pill good" style={{ marginTop: 12 }}>Automatic extraction</div>
          </button>

          <button
            className="card"
            onClick={() => setMethod('resume')}
            style={{ cursor: 'pointer', textAlign: 'left', border: '2px solid transparent' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <h2>Option 2: Upload Old Resume</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Upload or paste your existing resume. We&apos;ll parse it into structured data and use it to
              generate tailored, ATS-optimized resumes with 100% keyword coverage for each job.
            </p>
            <div className="pill good" style={{ marginTop: 12 }}>Instant parsing</div>
          </button>
        </div>
      )}

      {/* URLs Method */}
      {method === 'urls' && !result && (
        <div className="card" style={{ marginTop: 24 }}>
          <button className="btn" onClick={() => setMethod(null)} style={{ marginBottom: 16 }}>← Back</button>
          <h2>Enter your profile URLs</h2>
          <p className="muted" style={{ marginBottom: 20 }}>
            Provide at least one URL. Both together give the most complete profile.
          </p>

          <div className="form-grid">
            <div>
              <label className="label">GitHub Profile URL</label>
              <input
                className="input"
                placeholder="https://github.com/yourusername"
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
              />
              <div className="small muted" style={{ marginTop: 4 }}>
                Extracts: repos, languages, contributions, technologies, projects
              </div>
            </div>
            <div>
              <label className="label">LinkedIn Profile URL</label>
              <input
                className="input"
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
              />
              <div className="small muted" style={{ marginTop: 4 }}>
                Extracts: experience, skills, education, certifications, summary
              </div>
            </div>
          </div>

          {error && <div className="notice" style={{ marginTop: 16, color: '#c41' }}>{error}</div>}

          <button
            className="btn primary"
            onClick={handleImport}
            disabled={loading || (!githubUrl.trim() && !linkedinUrl.trim())}
            style={{ marginTop: 20 }}
          >
            {loading ? 'Extracting profile data...' : 'Extract & Build Profile'}
          </button>
        </div>
      )}

      {/* Resume Method */}
      {method === 'resume' && !result && (
        <div className="card" style={{ marginTop: 24 }}>
          <button className="btn" onClick={() => setMethod(null)} style={{ marginBottom: 16 }}>← Back</button>
          <h2>Upload or paste your resume</h2>
          <p className="muted" style={{ marginBottom: 20 }}>
            We&apos;ll parse your resume into structured sections (experience, skills, education) and use it to
            generate 100% keyword-matched, XYZ+STAR formatted resumes for each job you apply to.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Upload resume file (.txt)</label>
            <input
              type="file"
              accept=".txt,.text"
              onChange={handleFileUpload}
              style={{ marginTop: 4 }}
            />
          </div>

          <div>
            <label className="label">Or paste resume text</label>
            <textarea
              className="textarea"
              placeholder="Paste your full resume text here..."
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              style={{ minHeight: 300, fontFamily: 'monospace', fontSize: 13 }}
            />
            <div className="small muted" style={{ marginTop: 4 }}>
              {resumeText.length > 0 ? `${resumeText.length} characters • ${resumeText.split('\n').length} lines` : 'Copy from your PDF, Word doc, or any text source'}
            </div>
          </div>

          {error && <div className="notice" style={{ marginTop: 16, color: '#c41' }}>{error}</div>}

          <button
            className="btn primary"
            onClick={handleImport}
            disabled={loading || resumeText.trim().length < 50}
            style={{ marginTop: 20 }}
          >
            {loading ? 'Parsing resume...' : 'Parse & Build Profile'}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>✅</span>
            <div>
              <h2 style={{ margin: 0 }}>Profile imported successfully!</h2>
              <div className="muted">
                {result.method === 'url_extraction'
                  ? `Extracted from ${result.source} (${result.confidence}% confidence)`
                  : 'Parsed from uploaded resume'}
              </div>
            </div>
          </div>

          <div className="grid grid2" style={{ marginTop: 16 }}>
            <div>
              <div className="kicker">Extracted</div>
              <div className="stack">
                <div className="split">
                  <span>Name</span>
                  <span className="pill">{(result.profile || result.parsed)?.name || '—'}</span>
                </div>
                <div className="split">
                  <span>Skills</span>
                  <span className="pill good">{(result.profile || result.parsed)?.skillsCount || 0} found</span>
                </div>
                <div className="split">
                  <span>Experience entries</span>
                  <span className="pill good">{(result.profile || result.parsed)?.experienceCount || 0} found</span>
                </div>
                <div className="split">
                  <span>Education</span>
                  <span className="pill">{(result.profile || result.parsed)?.educationCount || 0} found</span>
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

          {result.warnings && result.warnings.length > 0 && (
            <div className="notice" style={{ marginTop: 16 }}>
              <strong>Warnings:</strong>
              {result.warnings.map((w, i) => <div key={i} className="small muted">{w}</div>)}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <a href="/profile" className="btn primary">View & Edit Profile</a>
            <a href="/jobs" className="btn">Browse Jobs</a>
            <button className="btn" onClick={() => { setResult(null); setMethod(null); }}>Import Again</button>
          </div>
        </div>
      )}

      {/* Info section */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="kicker">How the 100% match works</div>
        <h3>Unrejectable resume generation</h3>
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="split">
            <span>1. Extract your verified skills &amp; experience</span>
            <span className="pill">from GitHub/LinkedIn/resume</span>
          </div>
          <div className="split">
            <span>2. Parse job description keywords</span>
            <span className="pill">technical + action + domain</span>
          </div>
          <div className="split">
            <span>3. Reorder experience by relevance</span>
            <span className="pill">most relevant first</span>
          </div>
          <div className="split">
            <span>4. Format every bullet as XYZ + STAR combined</span>
            <span className="pill good">proven format</span>
          </div>
          <div className="split">
            <span>5. Inject ALL missing keywords into correct sections</span>
            <span className="pill good">100% ATS match</span>
          </div>
          <div className="split">
            <span>6. Apply template rules</span>
            <span className="pill">Calibri 10.5pt • 0.6in margins • max 2 pages</span>
          </div>
        </div>
        <div className="notice" style={{ marginTop: 16 }}>
          <strong>Truthfulness contract:</strong> The system reorders and rewrites your verified evidence for maximum impact,
          but never invents employment, metrics, credentials, skills, or experience.
        </div>
      </div>
    </div>
  );
}
