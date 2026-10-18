import test from 'node:test';
import assert from 'node:assert/strict';
import {supabase,signUpWithEmail,loginWithGoogle,requireOwner,insertVaultItemRow,uploadVaultFile,updateVaultItemRow,saveUserData,clearUserQuizAttempts,validateVaultFile,onAuthStateChanged,resetPassword} from './supabase.ts';
import {resetAuthAttempts} from '../utils/authGuard.ts';
import {calculateQuizResults,generateQuizSession} from '../utils/quizBank.ts';
const uid='11111111-1111-4111-8111-111111111111';
const user={id:uid,email:'test@example.test',user_metadata:{full_name:'Test Student'}};
const owner=(t:any)=>t.mock.method(supabase.auth,'getUser',async()=>({data:{user},error:null}));

test('signup requiring email confirmation does not fabricate an authenticated user',async t=>{
  resetAuthAttempts();
  t.mock.method(supabase.auth,'signUp',async()=>({data:{user,session:null},error:null} as any));
  const db=t.mock.method(supabase,'from',()=>{throw new Error('Must not save without session');});
  assert.equal(await signUpWithEmail(user.email,'Test-password123','Test Student'),null);
  assert.equal(db.mock.callCount(),0);resetAuthAttempts();
});
test('Google disabled reports configuration error without pretending success',async t=>{
  resetAuthAttempts();
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({external:{google:false}})));
  const oauth=t.mock.method(supabase.auth,'signInWithOAuth',async()=>({data:{},error:null} as any));
  await assert.rejects(loginWithGoogle(),/not enabled/);assert.equal(oauth.mock.callCount(),0);resetAuthAttempts();
});
test('Google enabled initiates redirect without asking for a user before callback',async t=>{
  resetAuthAttempts();
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({external:{google:true}})));
  t.mock.method(supabase.auth,'signInWithOAuth',async()=>({data:{provider:'google',url:'https://example.test'},error:null} as any));
  const lookup=t.mock.method(supabase.auth,'getUser',async()=>{throw new Error('Premature user query');});
  assert.equal(await loginWithGoogle(),undefined);assert.equal(lookup.mock.callCount(),0);resetAuthAttempts();
});
test('password reset network/server failure is propagated',async t=>{
  resetAuthAttempts();t.mock.method(supabase.auth,'resetPasswordForEmail',async()=>({data:null,error:new Error('Network unavailable')} as any));
  await assert.rejects(resetPassword('test@example.test'),/Network unavailable/);resetAuthAttempts();
});
test('auth subscription ignores repeated token refresh for same account and cleans up',async t=>{
  let listener:any;let stopped=false;const seen:any[]=[];
  t.mock.method(supabase.auth,'onAuthStateChange',(cb:any)=>{listener=cb;return {data:{subscription:{unsubscribe:()=>{stopped=true;}}}} as any;});
  const off=onAuthStateChanged(u=>{seen.push(u?.uid||null);});
  listener('INITIAL_SESSION',{user});listener('TOKEN_REFRESHED',{user});
  await new Promise(r=>setTimeout(r,10));assert.deepEqual(seen,[uid]);
  listener('SIGNED_OUT',null);await new Promise(r=>setTimeout(r,10));assert.deepEqual(seen,[uid,null]);
  off();listener('SIGNED_IN',{user});await new Promise(r=>setTimeout(r,10));assert.equal(seen.length,2);assert.equal(stopped,true);
});
test('different-account metadata and attachment access is rejected',async t=>{
  owner(t);await assert.rejects(requireOwner('other'),/different account/);
  await assert.rejects(insertVaultItemRow({title:'x',kind:'Note',domain:'Other',tags:[],file_path:'other/file.pdf'}),/Invalid file owner/);
  await assert.rejects(updateVaultItemRow('id',{file_path:`${uid}/../other/file.pdf`}),/Invalid file owner/);
});
test('document upload uses authenticated owner and inserts explicit user_id',async t=>{
  owner(t);let path='';let row:any;
  t.mock.method(supabase.storage,'from',()=>({upload:async(p:string)=>{path=p;return {data:{path:p},error:null};}} as any));
  t.mock.method(supabase,'from',()=>({insert:(rows:any[])=>{row=rows[0];return {select:()=>({single:async()=>({data:{...row,id:'test-item'},error:null})})};}} as any));
  const uploaded=await uploadVaultFile(new File(['%PDF-1.4 test'],'My report.PDF',{type:'application/pdf'}));
  assert.match(path,new RegExp(`^${uid}/[a-f0-9-]+\\.pdf$`));
  await insertVaultItemRow({title:' Report ',kind:'Note',domain:'Other',tags:[],file_path:uploaded.filePath});
  assert.equal(row.user_id,uid);assert.equal(row.title,'Report');
});
test('failed metadata insert attempts uploaded-file cleanup and propagates error',async t=>{
  owner(t);let removed:any;
  t.mock.method(supabase.storage,'from',()=>({remove:async(paths:any)=>{removed=paths;return {error:null};}} as any));
  t.mock.method(supabase,'from',()=>({insert:()=>({select:()=>({single:async()=>({data:null,error:new Error('RLS denied')})})})} as any));
  await assert.rejects(insertVaultItemRow({title:'Test',kind:'Note',domain:'Other',tags:[],file_path:`${uid}/test.pdf`}),/RLS denied/);
  assert.deepEqual(removed,[`${uid}/test.pdf`]);
});
test('quiz save uses database snake_case column and clear performs owner-scoped delete',async t=>{
  owner(t);const writes:any[]=[];let deleted:any;
  t.mock.method(supabase,'from',(table:string)=>({upsert:async(row:any)=>{writes.push({table,row});return {error:null};},delete:()=>({eq:async(k:string,v:string)=>{deleted={table,k,v};return {error:null};}})} as any));
  const attempt=calculateQuizResults(generateQuizSession('quick'),{},1,'quick');
  await saveUserData(uid,{quizAttempts:[attempt]});await clearUserQuizAttempts(uid);
  assert.deepEqual(writes[1].row.domain_breakdowns,attempt.domainBreakdowns);
  assert.equal('domainBreakdowns' in writes[1].row,false);
  assert.deepEqual(deleted,{table:'quiz_attempts',k:'user_id',v:uid});
});
test('storage errors and malformed file descriptors do not report upload success',async t=>{
  owner(t);t.mock.method(supabase.storage,'from',()=>({upload:async()=>({data:null,error:new Error('Bucket not found')})} as any));
  await assert.rejects(uploadVaultFile(new File(['test'],'notes.txt',{type:'text/plain'})),/Bucket not found/);
  for(const file of [{name:'x.pdf',size:0,type:'application/pdf'},{name:'x.pdf',size:NaN,type:'application/pdf'},{name:'x.pdf',size:20,type:'image/png'}])assert.equal(validateVaultFile(file).valid,false);
});
