import test from 'node:test';
import assert from 'node:assert/strict';
import {consumeAuthAttempt,resetAuthAttempts} from './authGuard.ts';
import {freshWorkspace,sanitizeWorkspace,validQuizAttempt} from './workspaceStorage.ts';
import {ASSESSMENT_QUESTIONS,calculateDomainScore,calculateCombinedScore,sanitizeDomainMetrics} from './scoring.ts';
import {QUIZ_BANK,generateQuizSession,calculateQuizResults} from './quizBank.ts';

test('repeated failed auth requests stop at five and resume after cooldown',()=>{
  resetAuthAttempts();
  for(let i=0;i<5;i++)consumeAuthAttempt(100000+i);
  assert.throws(()=>consumeAuthAttempt(100010),/Too many attempts/);
  consumeAuthAttempt(160005);resetAuthAttempts();
});
test('fresh real account has no answers, history, tasks, or demo identity',()=>{
  const fresh=freshWorkspace(false,'New Student');
  assert.equal(fresh.isDemoMode,false);assert.equal(fresh.studentName,'New Student');
  assert.deepEqual(fresh.assessmentAnswers,{});assert.deepEqual(fresh.quizAttempts,[]);
  assert.deepEqual(fresh.snapshots,[]);assert.deepEqual(fresh.planProgressByCareer,{});
});
test('valid assessment values survive reload; unknown IDs and invalid options do not',()=>{
  const answers=Object.fromEntries(ASSESSMENT_QUESTIONS.map(q=>[q.id,q.options[2].value]));
  const clean=sanitizeWorkspace({...freshWorkspace(false),assessmentAnswers:{...answers,unknown:95}});
  assert.deepEqual(clean.assessmentAnswers,answers);
  assert.deepEqual(sanitizeWorkspace({assessmentAnswers:{prog_practice:999}}).assessmentAnswers,{});
});
test('malformed workspace and quiz data cannot crash consumers',()=>{
  for(const value of [null,[],42,'broken',{domainMetrics:[],quizAttempts:{},snapshots:42,assessmentAnswers:null},{quizAttempts:[{},null,{domainScores:{}}],planProgressByCareer:{bad:{a:true}}}]) {
    const clean=sanitizeWorkspace(value);
    assert.equal(Array.isArray(clean.quizAttempts),true);
    for(const metrics of Object.values(clean.domainMetrics))assert.ok(Number.isFinite(calculateDomainScore(metrics).score));
  }
});
test('non-finite and string metrics cannot produce NaN or scores outside 0–100',()=>{
  for(const value of [NaN,Infinity,-Infinity,'bad',{},null,undefined,-100,1000]) {
    const metrics={marks:value,confidence:value,practice:value,skill:value} as any;
    const result=calculateDomainScore(metrics);
    assert.ok(Number.isFinite(result.score)&&result.score>=0&&result.score<=100);
    assert.ok(Number.isFinite(calculateCombinedScore(value as any,Infinity)));
    assert.ok(Number.isFinite(sanitizeDomainMetrics({programming:metrics}).programming.confidence));
  }
});
test('200 randomized quiz sessions preserve domain balance, unique questions and answer mapping',()=>{
  const original=JSON.stringify(QUIZ_BANK);
  for(const mode of ['quick','full'] as const)for(let run=0;run<100;run++){
    const questions=generateQuizSession(mode);const count=mode==='quick'?12:24;
    assert.equal(questions.length,count);assert.equal(new Set(questions.map(q=>q.id)).size,count);
    for(const domain of ['programming','analytical','communication','design'])assert.equal(questions.filter(q=>q.domain===domain).length,count/4);
    for(const q of questions){const source=QUIZ_BANK.find(x=>x.id===q.id)!;assert.equal(q.options[q.correctIndex],source.options[source.correctIndex]);}
    const perfect=calculateQuizResults(questions,Object.fromEntries(questions.map(q=>[q.id,q.correctIndex])),30,mode);
    assert.equal(perfect.overallScore,100);assert.equal(perfect.correctQuestions,count);assert.ok(validQuizAttempt(perfect));
    const empty=calculateQuizResults(questions,{},0,mode);assert.equal(empty.overallScore,0);
    assert.notEqual(perfect.id,empty.id);
  }
  assert.equal(JSON.stringify(QUIZ_BANK),original);
});
