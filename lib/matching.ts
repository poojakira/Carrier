import { Job } from '@prisma/client';

export type CandidateProfile = { skills: string[]; roles: string[]; locations: string[]; salaryMin?: number | null; sponsorship?: string; projects: string[] };
const score = (text: string, needles: string[]) => needles.length ? Math.round((needles.filter(n => text.toLowerCase().includes(n.toLowerCase())).length / needles.length) * 100) : 70;

export function calculateMatch(job: Job, p: CandidateProfile) {
  const body = `${job.title} ${job.description}`;
  const technicalFit = score(body, p.skills);
  const experienceFit = score(body, p.projects);
  const educationFit = 90;
  const projectFit = score(body, p.projects);
  const locationFit = p.locations.some(x => job.location.toLowerCase().includes(x.toLowerCase())) || job.remote ? 100 : 65;
  const compensationFit = !p.salaryMin || !job.salaryMax ? 70 : job.salaryMax >= p.salaryMin ? 100 : Math.max(0, Math.round(job.salaryMax / p.salaryMin * 100));
  const authorizationFit = p.sponsorship === 'Not required' && job.sponsorship ? 60 : 100;
  const seniorityFit = 90;
  const careerValueFit = Math.round((technicalFit + projectFit + 90) / 3);
  const overallFit = Math.round((technicalFit * .18 + experienceFit * .12 + educationFit * .08 + projectFit * .15 + locationFit * .08 + compensationFit * .10 + authorizationFit * .08 + seniorityFit * .08 + careerValueFit * .13));
  return { technicalFit, experienceFit, educationFit, projectFit, locationFit, compensationFit, authorizationFit, seniorityFit, careerValueFit, overallFit };
}
