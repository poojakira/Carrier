import { createHash } from 'crypto';

export type NormalizedJob = {
  source: 'greenhouse' | 'lever' | 'manual';
  externalId: string;
  company: string;
  title: string;
  location: string;
  url: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  remote?: boolean;
  sponsorship?: boolean;
  requirements?: string[];
  applyUrl?: string;
};

export type SubmitApplicationInput = {
  job: NormalizedJob;
  candidate: { name: string; email: string; resumeText: string };
  resumeVersion: string;
  coverLetter: string;
  answers: { question: string; answer: string }[];
};

function htmlToText(input: string) {
  return input.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
function splitName(name: string) { const p=name.trim().split(/\s+/); return { firstName:p[0] || '', lastName:p.slice(1).join(' ') || '' }; }

export class GreenhouseAdapter {
  constructor(private readonly boardToken: string, private readonly applicationApiKey?: string) {}
  async listJobs(): Promise<NormalizedJob[]> {
    const r=await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(this.boardToken)}/jobs?content=true`,{next:{revalidate:300}} as any);
    if(!r.ok) throw new Error(`Greenhouse jobs request failed (${r.status})`);
    const j=await r.json();
    return (j.jobs||[]).map((x:any)=>({source:'greenhouse',externalId:String(x.id),company:j.name||this.boardToken,title:x.title,location:x.location?.name||'',url:x.absolute_url,description:htmlToText(x.content||''),requirements:[],applyUrl:x.absolute_url,remote:(x.location?.name||'').toLowerCase().includes('remote')}));
  }
  async getQuestions(jobId: string) {
    const r=await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(this.boardToken)}/jobs/${encodeURIComponent(jobId)}?questions=true`,{next:{revalidate:300}} as any);
    if(!r.ok) throw new Error(`Greenhouse job request failed (${r.status})`);
    const j=await r.json(); return (j.questions||[]).map((q:any)=>({id:String(q.id),label:q.label,required:!!q.required,type:q.type,fields:q.fields||[]}));
  }
  async submit(input: SubmitApplicationInput, formFields: Record<string, unknown>) {
    if(!this.applicationApiKey) throw new Error('Greenhouse submission is not enabled because no authorized employer application credential is configured.');
    const {firstName,lastName}=splitName(input.candidate.name);
    const body=new FormData(); body.set('id',input.job.externalId); body.set('first_name',firstName); body.set('last_name',lastName); body.set('email',input.candidate.email); body.set('resume',new Blob([input.candidate.resumeText],{type:'text/plain'}),'resume.txt'); body.set('cover_letter',new Blob([input.coverLetter],{type:'text/plain'}),'cover-letter.txt');
    for(const [k,v] of Object.entries(formFields)) body.set(k,typeof v==='string'?v:JSON.stringify(v));
    const auth=Buffer.from(`${this.applicationApiKey}:`).toString('base64');
    const r=await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(this.boardToken)}/jobs/${encodeURIComponent(input.job.externalId)}`,{method:'POST',headers:{Authorization:`Basic ${auth}`},body});
    const text=await r.text(); if(!r.ok) throw new Error(`Greenhouse application failed (${r.status}): ${text.slice(0,500)}`);
    return {externalReference:createHash('sha256').update(text).digest('hex').slice(0,24),submittedAt:new Date().toISOString(),confirmation:{provider:'greenhouse',status:r.status,response:text.slice(0,1000)}};
  }
}

export class LeverAdapter {
  constructor(private readonly company: string, private readonly apiKey?: string) {}
  async listJobs(): Promise<NormalizedJob[]> {
    const auth=this.apiKey?`Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`:undefined;
    const r=await fetch(this.apiKey?`https://api.lever.co/v1/postings?state=published&distributionChannel=public&include=content`:`https://api.lever.co/v0/postings/${encodeURIComponent(this.company)}?mode=json`,{headers:auth?{Authorization:auth}:undefined,next:{revalidate:300}} as any);
    if(!r.ok) throw new Error(`Lever jobs request failed (${r.status})`);
    const j=await r.json(); const data=j.data||j;
    return (data||[]).map((x:any)=>({source:'lever',externalId:String(x.id),company:this.company,title:x.text||x.position,location:x.categories?.location||x.location||'',url:x.urls?.show||x.applyUrl||x.apply_url||'',applyUrl:x.urls?.apply||x.applyUrl||x.apply_url||'',description:htmlToText(x.content?.description||x.description||''),salaryMin:x.salaryRange?.min,salaryMax:x.salaryRange?.max,remote:String(x.workplaceType||'').toLowerCase().includes('remote')}));
  }
  async getQuestions(jobId:string) {
    const auth=this.apiKey?`Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`:undefined;
    if(!auth) throw new Error('Lever question lookup requires an authorized Lever API key.');
    const r=await fetch(`https://api.lever.co/v1/postings/${encodeURIComponent(jobId)}/apply`,{headers:{Authorization:auth}}); if(!r.ok) throw new Error(`Lever questions failed (${r.status})`); const j=await r.json(); return j.data;
  }
  async submit(jobId:string,payload:any) {
    if(!this.apiKey) throw new Error('Lever submission requires an authorized employer API key.');
    const auth=`Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
    const r=await fetch(`https://api.lever.co/v1/postings/${encodeURIComponent(jobId)}/apply?send_confirmation_email=true`,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const text=await r.text(); if(!r.ok) throw new Error(`Lever application failed (${r.status}): ${text.slice(0,500)}`); const j=JSON.parse(text); return {externalReference:String(j.data?.id||''),submittedAt:new Date().toISOString(),confirmation:j};
  }
}
