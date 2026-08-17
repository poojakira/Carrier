'use client';

import { useEffect, useState, useRef } from 'react';

const STYLES = [
  'Minimal Dark',
  'Gradient Modern',
  'Cyberpunk Neon',
  'Clean Professional',
  'Creative Artistic',
] as const;

export default function PortfolioPage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [style, setStyle] = useState<string>(STYLES[0]);
  const [customDescription, setCustomDescription] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then(setProfile);
  }, []);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, customDescription }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to generate portfolio');
        return;
      }
      const html = await res.text();
      setGeneratedHtml(html);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (generatedHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(generatedHtml);
        doc.close();
      }
    }
  }, [generatedHtml]);

  const skills: string[] = profile?.skillsJson
    ? JSON.parse(profile.skillsJson as string)
    : [];
  const projects: { name: string }[] = profile?.projectsJson
    ? JSON.parse(profile.projectsJson as string)
    : [];

  return (
    <div className="content">
      <div className="topbar">
        <div>
          <div className="eyebrow">Creative Tools</div>
          <h1 className="h1">3D Portfolio Generator</h1>
          <div className="muted">
            Generate a stunning, self-contained 3D portfolio website from your
            profile data.
          </div>
        </div>
      </div>

      <div className="grid grid2">
        {/* Profile Summary */}
        <section className="card">
          <h2>Your Profile Data</h2>
          {!profile ? (
            <p className="muted">Loading profile…</p>
          ) : (
            <div className="form-grid">
              <div>
                <label className="label">Headline</label>
                <div className="muted">{(profile.headline as string) || '—'}</div>
              </div>
              <div>
                <label className="label">Location</label>
                <div className="muted">{(profile.location as string) || '—'}</div>
              </div>
              <div className="full">
                <label className="label">Summary</label>
                <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                  {(profile.summary as string) || '—'}
                </div>
              </div>
              <div>
                <label className="label">Skills ({skills.length})</label>
                <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
                  {skills.slice(0, 10).map((s: string) => (
                    <span className="pill" key={s}>
                      {s}
                    </span>
                  ))}
                  {skills.length > 10 && (
                    <span className="muted">+{skills.length - 10} more</span>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Projects ({projects.length})</label>
                <div className="muted">
                  {projects
                    .slice(0, 5)
                    .map((p) => p.name)
                    .join(', ') || '—'}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Generation Controls */}
        <section className="card">
          <h2>Generate Portfolio</h2>
          <div className="form-grid">
            <div className="full">
              <label className="label" htmlFor="style-select">
                Design Style
              </label>
              <select
                id="style-select"
                className="input"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="full">
              <label className="label" htmlFor="custom-desc">
                How do you want your portfolio to look?
              </label>
              <textarea
                id="custom-desc"
                className="textarea"
                placeholder="e.g., Focus on my AI/ML projects, use a futuristic aesthetic, emphasize my leadership experience…"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="full">
              <button
                className="btn primary"
                onClick={handleGenerate}
                disabled={loading || !profile}
              >
                {loading ? 'Generating…' : '✨ Generate Portfolio'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Generated Portfolio Preview + Actions */}
      {generatedHtml && (
        <section className="card" style={{ marginTop: 24 }}>
          <div className="split">
            <h2>Portfolio Preview</h2>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy HTML'}
              </button>
              <button className="btn primary" onClick={handleDownload}>
                Download HTML
              </button>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
            }}
          >
            <iframe
              ref={iframeRef}
              title="Portfolio Preview"
              style={{
                width: '100%',
                height: '600px',
                border: 'none',
                background: '#0a0a0a',
              }}
              sandbox="allow-scripts"
            />
          </div>
        </section>
      )}
    </div>
  );
}
