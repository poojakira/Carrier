import { ApplicationStatus, Job, Policy, PolicyMode } from '@prisma/client';

export type PolicyDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  reasons: string[];
  mode: PolicyMode;
};

function list(raw: string) { try { return JSON.parse(raw) as string[]; } catch { return []; } }

export function evaluatePolicy(job: Job, policy: Policy, alreadyApplied: boolean, automationPaused: boolean): PolicyDecision {
  const reasons: string[] = [];
  if (!policy.enabled) reasons.push('Policy is disabled.');
  if (automationPaused) reasons.push('Automation is globally paused.');
  if (job.overallFit < policy.minMatch) reasons.push(`Match ${job.overallFit} is below minimum ${policy.minMatch}.`);
  if (policy.minSalary && (job.salaryMax ?? 0) < policy.minSalary) reasons.push('Compensation is below the configured floor.');
  const roles = list(policy.targetRolesJson);
  if (roles.length && !roles.some(r => job.title.toLowerCase().includes(r.toLowerCase()))) reasons.push('Role is outside target roles.');
  if (policy.requireSponsorship === false && job.sponsorship === true) reasons.push('Sponsorship requirement conflicts with policy.');
  if (policy.blockDuplicates && alreadyApplied) reasons.push('Duplicate application blocked.');
  const risky = job.trustScore < 70 || ((() => { try { return JSON.parse(job.riskFlagsJson || '[]'); } catch { return []; } })()).length > 0;
  if (risky && policy.requireApprovalForRisky) reasons.push('Risk signals require human approval.');

  const hardFail = reasons.filter(r => !r.includes('Risk signals')).length > 0;
  return {
    allowed: !hardFail,
    requiresApproval: reasons.some(r => r.includes('Risk signals')) || policy.mode === PolicyMode.REVIEW_ALL || (policy.mode === PolicyMode.REVIEW_RISKY && risky),
    reasons,
    mode: policy.mode,
  };
}
