import {ASSESSMENT_QUESTIONS,DEMO_PROFILE,DEFAULT_DOMAIN_METRICS,sanitizeDomainMetrics,CAREER_PLANS,type DomainKey,type DomainMetrics,type AssessmentSnapshot} from './scoring.ts';
import type {QuizAttempt} from './quizBank.ts';
export interface WorkspaceData {
  isDemoMode:boolean;studentName:string;studentYear:string;studentFocus:string;studentStatement:string;
  domainMetrics:Record<DomainKey,DomainMetrics>;assessmentAnswers:Record<string,number>;
  selectedCareerId:string;planProgressByCareer:Record<string,Record<string,boolean>>;
  snapshots:AssessmentSnapshot[];quizAttempts:QuizAttempt[];
}
const KEY='skillpath_guest_workspace_v1';
const domains:DomainKey[]=['programming','analytical','communication','design'];
const record=(v:unknown):v is Record<string,any>=>!!v && typeof v==='object' && !Array.isArray(v);
const score=(v:unknown)=>typeof v==='number' && Number.isFinite(v) && v>=0 && v<=100;
export function validQuizAttempt(v:any):v is QuizAttempt {
 return record(v) && typeof v.id==='string' && Number.isFinite(v.timestamp) && ['quick','full'].includes(v.mode) && Number.isInteger(v.totalQuestions) && v.totalQuestions>0 && Number.isInteger(v.correctQuestions) && v.correctQuestions>=0 && v.correctQuestions<=v.totalQuestions && score(v.overallScore) && Number.isFinite(v.timeTakenSeconds) && v.timeTakenSeconds>=0 && domains.includes(v.strongestDomain) && record(v.domainScores) && record(v.domainBreakdowns) && domains.every(d=>score(v.domainScores[d]) && record(v.domainBreakdowns[d]) && ['score','earnedPoints','maxPoints','correctCount','totalCount'].every(k=>Number.isFinite(v.domainBreakdowns[d][k]) && v.domainBreakdowns[d][k]>=0));
}
export function freshWorkspace(demo=true,name=''):WorkspaceData {
 return {isDemoMode:demo,studentName:demo?DEMO_PROFILE.name:name,studentYear:demo?DEMO_PROFILE.year:'Year 1 Undergraduate',studentFocus:demo?DEMO_PROFILE.focus:'',studentStatement:demo?DEMO_PROFILE.statement:'',domainMetrics:sanitizeDomainMetrics(demo?DEMO_PROFILE.domainMetrics:DEFAULT_DOMAIN_METRICS),assessmentAnswers:demo?{...DEMO_PROFILE.answers}:{},selectedCareerId:'frontend-developer',planProgressByCareer:{},snapshots:[],quizAttempts:[]};
}
export function sanitizeWorkspace(raw:unknown):WorkspaceData {
 if(!record(raw))return freshWorkspace();
 const base=freshWorkspace(raw.isDemoMode===true);
 for(const k of ['studentName','studentYear','studentFocus','studentStatement'] as const) if(typeof raw[k]==='string')base[k]=raw[k].slice(0,10000);
 base.domainMetrics=sanitizeDomainMetrics(raw.domainMetrics);
 if(record(raw.assessmentAnswers))base.assessmentAnswers=Object.fromEntries(Object.entries(raw.assessmentAnswers).filter(([k,v])=>ASSESSMENT_QUESTIONS.some(q=>q.id===k && q.options.some(o=>o.value===v)))) as Record<string,number>;
 // The scoring engine's question IDs are the authoritative allowlist.
 if(typeof raw.selectedCareerId==='string' && Object.hasOwn(CAREER_PLANS,raw.selectedCareerId))base.selectedCareerId=raw.selectedCareerId;
 if(record(raw.planProgressByCareer))for(const [career,progress] of Object.entries(raw.planProgressByCareer)) {
  if(!Object.hasOwn(CAREER_PLANS,career) || !record(progress))continue;
  const ids=new Set(CAREER_PLANS[career].flatMap(m=>m.tasks.map(t=>t.id)));
  base.planProgressByCareer[career]=Object.fromEntries(Object.entries(progress).filter(([id,value])=>ids.has(id) && typeof value==='boolean'));
 }
 if(Array.isArray(raw.snapshots))base.snapshots=raw.snapshots.filter(v=>record(v) && typeof v.id==='string' && Number.isFinite(v.timestamp) && record(v.scores) && domains.every(d=>score(v.scores[d])) && record(v.answers)).slice(-100);
 if(Array.isArray(raw.quizAttempts))base.quizAttempts=raw.quizAttempts.filter(validQuizAttempt).slice(-100);
 return base;
}
export function readGuestWorkspace():WorkspaceData {try{return sanitizeWorkspace(JSON.parse(localStorage.getItem(KEY) || 'null'));}catch{return freshWorkspace();}}
export function writeGuestWorkspace(data:WorkspaceData):boolean {try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch{return false;}}
