'use client';

import { useState, useRef, useEffect } from 'react';

type ConversationState =
  | 'awaiting_portfolio'
  | 'awaiting_jd'
  | 'awaiting_achievements'
  | 'follow_up'
  | 'generating'
  | 'complete';

interface Message {
  id: string;
  role: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      content: 'Hi! Paste your portfolio link and I will include it in your tailored resume.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [conversationState, setConversationState] = useState<ConversationState>('awaiting_portfolio');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [achievements, setAchievements] = useState<string[]>([]);
  const [resumeHtml, setResumeHtml] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResume, setShowResume] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isLoading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    // Check for "done" trigger in awaiting_achievements state
    const isDone = /^(done|generate|finish|that'?s? (all|it)|no more)$/i.test(text);
    const effectiveState = isDone && conversationState === 'awaiting_achievements' ? 'awaiting_achievements' : conversationState;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationState: effectiveState,
          portfolioLink,
          jobDescription,
          achievements,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      // Update state from response
      if (data.portfolioLink) setPortfolioLink(data.portfolioLink);
      if (data.jobDescription) setJobDescription(data.jobDescription);
      if (data.achievements) setAchievements(data.achievements);
      if (data.conversationState) setConversationState(data.conversationState);

      // Handle resume generation
      if (data.action === 'show_resume') {
        setResumeHtml(data.resumeHtml || '');
        setResumeText(data.resumeText || '');
        setShowResume(true);
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'bot',
        content: `Something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  function downloadResume() {
    if (!resumeText) return;
    const blob = new Blob([resumeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailored-resume.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadResumeHtml() {
    if (!resumeHtml) return;
    const blob = new Blob([resumeHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailored-resume.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="content">
      <div className="topbar">
        <div>
          <div className="eyebrow">AI Agent</div>
          <h1 className="h1">Resume Tailoring Chatbot</h1>
          <div className="muted">Honest, skeptical resume generation through guided conversation.</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, marginTop: 16, minHeight: 'calc(100vh - 200px)' }}>
        {/* Chat Panel */}
        <div style={{ flex: showResume ? '0 0 50%' : '1', display: 'flex', flexDirection: 'column' }}>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 280px)' }}>
            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
              role="log"
              aria-live="polite"
              aria-label="Chat messages"
            >
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: msg.role === 'user' ? 'var(--accent, #2563eb)' : 'var(--card-bg, #f3f4f6)',
                      color: msg.role === 'user' ? '#fff' : 'inherit',
                      whiteSpace: 'pre-wrap',
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'var(--card-bg, #f3f4f6)',
                      fontSize: 14,
                    }}
                  >
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop: '1px solid var(--border, #e5e7eb)', padding: '12px 0 0' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={inputRef}
                  className="input"
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder={
                    conversationState === 'awaiting_portfolio' ? 'Paste your portfolio link...' :
                    conversationState === 'awaiting_jd' ? 'Paste the job description...' :
                    conversationState === 'awaiting_achievements' ? 'Describe an achievement or type "done"...' :
                    conversationState === 'follow_up' ? 'Provide clarification...' :
                    'Type a message...'
                  }
                  disabled={isLoading || conversationState === 'complete'}
                  aria-label="Chat input"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn primary"
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim() || conversationState === 'complete'}
                >
                  Send
                </button>
              </div>
              <div className="muted small" style={{ marginTop: 6 }}>
                {conversationState === 'awaiting_portfolio' && 'Step 1/4 — Portfolio link'}
                {conversationState === 'awaiting_jd' && 'Step 2/4 — Job description'}
                {conversationState === 'awaiting_achievements' && `Step 3/4 — Achievements (${achievements.length} added)`}
                {conversationState === 'follow_up' && 'Follow-up — Clarification needed'}
                {conversationState === 'complete' && '✓ Resume generated'}
              </div>
            </div>
          </div>
        </div>

        {/* Resume Preview Panel */}
        {showResume && (
          <div style={{ flex: '0 0 48%' }}>
            <div className="card" style={{ maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}>
              <div className="split" style={{ marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Resume Preview</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn primary" onClick={downloadResumeHtml}>
                    Download HTML
                  </button>
                  <button className="btn" onClick={downloadResume}>
                    Download TXT
                  </button>
                </div>
              </div>
              <div
                dangerouslySetInnerHTML={{ __html: resumeHtml }}
                style={{
                  background: '#fff',
                  padding: 24,
                  borderRadius: 8,
                  border: '1px solid var(--border, #e5e7eb)',
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: '#1a1a1a',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
