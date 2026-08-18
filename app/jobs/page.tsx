'use client';

import { useEffect, useState, useCallback } from 'react';

interface Job {
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

interface SearchMeta {
  total: number;
  sources: string[];
  boards: string[];
  fetchedAt: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [message, setMessage] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);

  const searchJobs = useCallback(async (kw: string, loc: string, rem: boolean) => {
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (kw) params.set('keywords', kw);
      if (loc) params.set('location', loc);
      if (rem) params.set('remote', 'true');

      const res = await fetch(`/api/jobs/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Search failed');
        setJobs([]);
      } else {
        setJobs(data.jobs || []);
        setMeta(data.meta || null);
      }
    } catch (err) {
      setMessage('Failed to fetch jobs. Please try again.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on page load
  useEffect(() => {
    searchJobs('software engineer', '', false);
  }, [searchJobs]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchTriggered(true);
    searchJobs(keywords, location, remote);
  }

  async function quickApply(job: Job) {
    setMessage(`Preparing application for ${job.title} at ${job.company}...`);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          externalUrl: job.url,
          company: job.company,
          title: job.title,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Application prepared for ${job.title}. Opening application page...`);
        window.open(job.url, '_blank');
      } else {
        // Fallback: open the URL directly for user-assisted apply
        setMessage(`Opening application page for ${job.title} at ${job.company}.`);
        window.open(job.url, '_blank');
      }
    } catch {
      // Fallback: open URL directly
      setMessage(`Opening application page for ${job.title}.`);
      window.open(job.url, '_blank');
    }
  }

  return (
    <div className="content">
      <div className="topbar">
        <div>
          <div className="eyebrow">Discover</div>
          <h1 className="h1">Real-Time Job Search</h1>
          <div className="muted">Jobs fetched in real-time from company career pages</div>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="label" htmlFor="keywords">Keywords</label>
            <input
              id="keywords"
              className="input"
              type="text"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. frontend engineer, Python, product manager"
            />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label className="label" htmlFor="location">Location</label>
            <input
              id="location"
              className="input"
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, London"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
            <input
              id="remote"
              type="checkbox"
              checked={remote}
              onChange={e => setRemote(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="remote" className="label" style={{ margin: 0 }}>Remote only</label>
          </div>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {/* Status messages */}
      {message && <div className="notice" style={{ marginBottom: 16 }}>{message}</div>}

      {/* Loading indicator */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>🔍 Searching live…</div>
          <div className="muted">Fetching from Greenhouse and Lever boards across {meta?.boards?.length || 10} companies</div>
        </div>
      )}

      {/* Results */}
      {!loading && (
        <>
          {meta && (
            <div className="muted small" style={{ marginBottom: 12 }}>
              {meta.total} job{meta.total !== 1 ? 's' : ''} found from {meta.sources.join(' & ')} boards
              {meta.fetchedAt && ` • Fetched ${new Date(meta.fetchedAt).toLocaleTimeString()}`}
            </div>
          )}

          {jobs.length === 0 && !loading && (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>No matching jobs found</div>
              <div className="muted">Try different keywords or broaden your search</div>
            </div>
          )}

          <div className="grid grid2">
            {jobs.map(job => (
              <div className="card" key={job.id}>
                <div className="split">
                  <div>
                    <div className="job-title">{job.title}</div>
                    <div className="muted small">{job.company} · {job.location}</div>
                  </div>
                  <span className={`pill ${job.matchScore >= 70 ? 'good' : ''}`}>
                    {job.matchScore}% match
                  </span>
                </div>
                <p className="small muted" style={{ margin: '8px 0' }}>
                  {stripHtml(job.description).slice(0, 200)}{stripHtml(job.description).length > 200 ? '…' : ''}
                </p>
                <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                  <span className="pill">{job.source}</span>
                  {job.remote && <span className="pill good">Remote</span>}
                  {job.postedAt && (
                    <span className="pill">{new Date(job.postedAt).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="split" style={{ marginTop: 12 }}>
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="small muted">
                    View source ↗
                  </a>
                  <button className="btn primary" onClick={() => quickApply(job)}>
                    Quick Apply
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          {jobs.length > 0 && (
            <div className="muted small" style={{ marginTop: 24, textAlign: 'center' }}>
              Jobs fetched in real-time from company career pages via Greenhouse and Lever public APIs.
              Results may vary based on API availability.
            </div>
          )}
        </>
      )}
    </div>
  );
}
