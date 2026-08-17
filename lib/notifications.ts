/**
 * Notification System
 * 
 * Sends transactional emails via Resend API for key application events.
 * Falls back gracefully when RESEND_API_KEY is not configured.
 */

export type NotificationType =
  | 'application_prepared'
  | 'application_submitted'
  | 'application_status_changed'
  | 'new_matching_jobs'
  | 'approval_needed'
  | 'automation_paused'
  | 'weekly_digest';

export type NotificationPayload = {
  type: NotificationType;
  to: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export type NotificationPreferences = {
  emailEnabled: boolean;
  applicationUpdates: boolean;
  newJobs: boolean;
  weeklyDigest: boolean;
  approvalAlerts: boolean;
};

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  applicationUpdates: true,
  newJobs: true,
  weeklyDigest: true,
  approvalAlerts: true,
};

// ─── Resend API Client ─────────────────────────────────────────────────────────

const RESEND_API_URL = 'https://api.resend.com/emails';

function getResendKey(): string | null {
  const key = process.env.RESEND_API_KEY;
  return key && key.length > 0 ? key : null;
}

function getFromAddress(): string {
  return process.env.NOTIFICATION_FROM_EMAIL || 'Careerly OS <notifications@careerly.app>';
}

export async function sendEmail(payload: NotificationPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = getResendKey();
  if (!apiKey) {
    console.warn('[notifications] RESEND_API_KEY not configured — email not sent:', payload.subject);
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to: [payload.to],
        subject: payload.subject,
        html: wrapInTemplate(payload.subject, payload.body),
        tags: [{ name: 'type', value: payload.type }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[notifications] Resend API error:', response.status, errText);
      return { success: false, error: `Resend API ${response.status}: ${errText.slice(0, 200)}` };
    }

    const result = await response.json() as { id: string };
    return { success: true, id: result.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[notifications] Send failed:', msg);
    return { success: false, error: msg };
  }
}

// ─── Email Templates ───────────────────────────────────────────────────────────

function wrapInTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f7f7f8;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;border:1px solid #e5e5e5;">
<tr><td style="padding:32px 32px 0;">
  <h1 style="margin:0 0 4px;font-size:20px;color:#111;">${escapeHtml(title)}</h1>
  <div style="height:1px;background:#e5e5e5;margin:16px 0;"></div>
</td></tr>
<tr><td style="padding:0 32px 32px;">
  <div style="font-size:15px;line-height:1.6;color:#333;">${body}</div>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #e5e5e5;border-radius:0 0 8px 8px;">
  <p style="margin:0;font-size:12px;color:#888;">Careerly OS · Career automation platform</p>
</td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Notification Factory Functions ────────────────────────────────────────────

export function notifyApplicationPrepared(to: string, data: { jobTitle: string; company: string; matchScore: number; status: string }): NotificationPayload {
  return {
    type: 'application_prepared',
    to,
    subject: `Application prepared: ${data.jobTitle} at ${data.company}`,
    body: `
      <p>Your application for <strong>${escapeHtml(data.jobTitle)}</strong> at <strong>${escapeHtml(data.company)}</strong> has been prepared.</p>
      <table style="margin:16px 0;border-collapse:collapse;">
        <tr><td style="padding:4px 16px 4px 0;color:#666;">Match score</td><td style="padding:4px 0;font-weight:600;">${data.matchScore}%</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666;">Status</td><td style="padding:4px 0;">${escapeHtml(data.status)}</td></tr>
      </table>
      <p>Resume has been tailored using XYZ/STAR format for this specific role.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/applications" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">View Application</a></p>
    `,
    metadata: data,
  };
}

export function notifyApplicationSubmitted(to: string, data: { jobTitle: string; company: string; adapter: string; submissionRef?: string }): NotificationPayload {
  return {
    type: 'application_submitted',
    to,
    subject: `✓ Submitted: ${data.jobTitle} at ${data.company}`,
    body: `
      <p>Your application for <strong>${escapeHtml(data.jobTitle)}</strong> at <strong>${escapeHtml(data.company)}</strong> has been successfully submitted.</p>
      <table style="margin:16px 0;border-collapse:collapse;">
        <tr><td style="padding:4px 16px 4px 0;color:#666;">Submission method</td><td style="padding:4px 0;">${escapeHtml(data.adapter)}</td></tr>
        ${data.submissionRef ? `<tr><td style="padding:4px 16px 4px 0;color:#666;">Reference</td><td style="padding:4px 0;font-family:monospace;">${escapeHtml(data.submissionRef)}</td></tr>` : ''}
      </table>
      <p style="color:#666;font-size:13px;">The application was submitted with a tailored resume and cover letter generated from your verified profile evidence.</p>
    `,
    metadata: data,
  };
}

export function notifyStatusChanged(to: string, data: { jobTitle: string; company: string; oldStatus: string; newStatus: string; note?: string }): NotificationPayload {
  const emoji = statusEmoji(data.newStatus);
  return {
    type: 'application_status_changed',
    to,
    subject: `${emoji} Status update: ${data.jobTitle} → ${data.newStatus}`,
    body: `
      <p>Your application for <strong>${escapeHtml(data.jobTitle)}</strong> at <strong>${escapeHtml(data.company)}</strong> has moved to a new stage.</p>
      <div style="margin:16px 0;padding:12px 16px;background:#f0f7ff;border-radius:6px;border-left:4px solid #3b82f6;">
        <span style="color:#666;">${escapeHtml(data.oldStatus)}</span> → <strong>${escapeHtml(data.newStatus)}</strong>
      </div>
      ${data.note ? `<p style="color:#666;">${escapeHtml(data.note)}</p>` : ''}
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/applications" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">View Details</a></p>
    `,
    metadata: data,
  };
}

export function notifyNewMatchingJobs(to: string, data: { jobs: { title: string; company: string; matchScore: number }[]; total: number }): NotificationPayload {
  const jobRows = data.jobs.slice(0, 5).map(j =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(j.title)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(j.company)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${j.matchScore}%</td></tr>`
  ).join('');

  return {
    type: 'new_matching_jobs',
    to,
    subject: `${data.total} new matching jobs found`,
    body: `
      <p>We found <strong>${data.total} new jobs</strong> that match your career profile:</p>
      <table style="width:100%;margin:16px 0;border-collapse:collapse;font-size:14px;">
        <tr style="background:#f9f9f9;"><th style="padding:8px 12px;text-align:left;">Role</th><th style="padding:8px 12px;text-align:left;">Company</th><th style="padding:8px 12px;text-align:right;">Match</th></tr>
        ${jobRows}
      </table>
      ${data.total > 5 ? `<p style="color:#666;">...and ${data.total - 5} more.</p>` : ''}
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/jobs" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">View All Jobs</a></p>
    `,
    metadata: { total: data.total },
  };
}

export function notifyApprovalNeeded(to: string, data: { jobTitle: string; company: string; reasons: string[] }): NotificationPayload {
  const reasonList = data.reasons.map(r => `<li style="margin:4px 0;">${escapeHtml(r)}</li>`).join('');
  return {
    type: 'approval_needed',
    to,
    subject: `⚠ Approval needed: ${data.jobTitle} at ${data.company}`,
    body: `
      <p>An application for <strong>${escapeHtml(data.jobTitle)}</strong> at <strong>${escapeHtml(data.company)}</strong> requires your approval before submission.</p>
      <div style="margin:16px 0;padding:12px 16px;background:#fff8e1;border-radius:6px;border-left:4px solid #f59e0b;">
        <strong>Reasons for review:</strong>
        <ul style="margin:8px 0 0;padding-left:20px;">${reasonList}</ul>
      </div>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/applications" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Review & Approve</a></p>
    `,
    metadata: data,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function statusEmoji(status: string): string {
  const map: Record<string, string> = {
    SUBMITTED: '📨',
    SCREEN: '📞',
    INTERVIEW: '🎤',
    OFFER: '🎉',
    REJECTED: '❌',
    WITHDRAWN: '🚫',
  };
  return map[status] || '📋';
}

// ─── Preference Check ──────────────────────────────────────────────────────────

export function shouldNotify(type: NotificationType, prefs: NotificationPreferences): boolean {
  if (!prefs.emailEnabled) return false;
  switch (type) {
    case 'application_prepared':
    case 'application_submitted':
    case 'application_status_changed':
      return prefs.applicationUpdates;
    case 'new_matching_jobs':
      return prefs.newJobs;
    case 'weekly_digest':
      return prefs.weeklyDigest;
    case 'approval_needed':
      return prefs.approvalAlerts;
    case 'automation_paused':
      return true; // Always notify for safety-critical events
    default:
      return true;
  }
}
