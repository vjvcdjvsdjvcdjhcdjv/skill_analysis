// All remote API calls are intercepted. No accounts/files are created on a real backend.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const server=await createServer({logLevel:'silent',server:{host:'127.0.0.1',port:3187,strictPort:true}});
await server.listen();
console.log('Local server ready');
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const base='http://127.0.0.1:3187';
const uid='11111111-1111-4111-8111-111111111111';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'student@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{full_name:'New Student'},identities:[],created_at:new Date().toISOString()};
const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:uid,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.test-signature`;
const session={access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user};
let passed=0;
async function scenario(name,run){if(process.env.TEST_FILTER && !name.includes(process.env.TEST_FILTER))return;console.log(`RUN ${name}`);await run();passed++;console.log(`PASS ${name}`);}
async function setup(options={}){
  const context=await browser.newContext({viewport:options.mobile?{width:390,height:844}:{width:1440,height:1000}});
  const state={accountUser:user,passwordUpdates:0,profile:null,attempts:[],vault:[],loginCalls:0,profileReads:0,uploads:0,unknown:[],pageErrors:[],...options};
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
    if(url.origin===base)return route.continue();
    if(!url.hostname.endsWith('.supabase.co'))return route.abort();
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/auth/v1/settings')return json({external:{google:!!state.google}});
    if(path==='/auth/v1/signup')return json(state.confirmEmail?{...user,identities:[]}:session);
    if(path==='/auth/v1/token'){state.loginCalls++;return state.badLogin?json({code:'invalid_credentials',msg:'Invalid login credentials'},400):json({...session,user:state.accountUser});}
    if(path==='/auth/v1/user'){if(method==='PUT')state.passwordUpdates++;return json(state.accountUser);}
    if(path==='/auth/v1/logout')return json({});
    if(path==='/auth/v1/recover')return state.resetFails?json({msg:'Email service unavailable'},500):json({});
    if(path==='/rest/v1/profiles'){
      if(method==='GET'){state.profileReads++;return json(state.profile);}
      state.profile={...(state.profile||{}),...request.postDataJSON()};return json(state.profile);
    }
    if(path==='/rest/v1/quiz_attempts'){
      if(method==='GET')return json(state.attempts);
      if(method==='DELETE'){state.attempts=[];return json({});}
      const row=request.postDataJSON();state.attempts=state.attempts.filter(a=>a.id!==row.id).concat(row);return json(row);
    }
    if(path==='/rest/v1/vault_items'){
      if(method==='GET')return json(state.vault);
      const row={...request.postDataJSON()[0],id:'vault-test',created_at:new Date().toISOString()};state.vault.push(row);return json(row);
    }
    if(path.startsWith('/storage/v1/object/vault/')){
      state.uploads++;return state.uploadFails?json({statusCode:'403',message:'Upload denied by storage policy',error:'Unauthorized'},403):json({Key:path.slice('/storage/v1/object/'.length),Id:'test-file'});
    }
    state.unknown.push(`${method} ${path}`);return json({message:'Unexpected mock request'},400);
  });
  const page=await context.newPage();page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(15000);page.on('pageerror',e=>state.pageErrors.push(e.message));
  await page.goto(base);
  const finish=async()=>{assert.deepEqual(state.pageErrors,[]);assert.deepEqual(state.unknown,[]);await context.close();};
  return {page,state,context,finish};
}
async function signup(page){
  await page.getByRole('tab',{name:'Create Account'}).click();
  await page.getByLabel('Full Name',{exact:true}).fill('New Student');
  await page.getByLabel(/Email Address/).fill('student@example.test');
  await page.getByLabel('Password',{exact:true}).fill('Test-password123');
  await page.getByLabel('Confirm Password',{exact:true}).fill('Test-password123');
  await page.getByRole('button',{name:'Create Account',exact:true}).click();
}
try {
  await scenario('new signup lands on Home; dashboard has no fabricated scores',async()=>{
    const {page,state,finish}=await setup();await signup(page);
    await page.waitForURL('**/#home');await page.getByRole('button',{name:'Start 8-question assessment'}).waitFor();
    await page.goto(`${base}/#dashboard`);await page.getByRole('heading',{name:'No scores yet'}).waitFor();
    if(process.env.CAPTURE_SCREENSHOTS)await page.screenshot({path:'/tmp/skillpath-dashboard.png',fullPage:true});
    assert.equal(await page.getByText('Top Profile Match',{exact:true}).count(),0);
    await page.goto(`${base}/#careers`);await page.getByText('Not assessed',{exact:true}).first().waitFor();
    assert.equal(await page.getByText('Top Profile Match',{exact:true}).count(),0);
    await page.goto(`${base}/#assessment`);
    const reads=state.profileReads;
    await page.getByRole('button',{name:/Rarely \/ Never/}).click();
    await page.waitForTimeout(1100);assert.equal(state.profileReads,reads,'editing must not refetch profile');
    assert.equal(state.profile.assessment_answers.prog_practice,20);
    await page.reload();await page.getByRole('button',{name:/Rarely \/ Never/}).waitFor();
    assert.equal(state.profile.assessment_answers.prog_practice,20);
    await finish();
  });
  await scenario('account switching does not copy one account into guest or a new account',async()=>{
    const {page,state,finish}=await setup();await signup(page);await page.waitForURL('**/#home');
    await page.goto(`${base}/#assessment`);await page.getByRole('button',{name:/Rarely \/ Never/}).click();
    await page.waitForTimeout(1000);
    await page.evaluate(async()=>{const api=await import('/src/services/supabase.ts');await api.logoutUser();});
    await page.getByRole('button',{name:'Log In with Email'}).waitFor();
    const guest=await page.evaluate(()=>JSON.parse(localStorage.getItem('skillpath_guest_workspace_v1')));
    assert.notEqual(guest.studentName,'New Student');
    state.accountUser={...user,id:'22222222-2222-4222-8222-222222222222',email:'second@example.test',user_metadata:{full_name:'Second Student'}};
    state.profile=null;state.attempts=[];
    await page.getByLabel(/Email Address/).fill('second@example.test');await page.getByLabel('Password',{exact:true}).fill('Test-password123');
    await page.getByRole('button',{name:'Log In with Email'}).click();await page.waitForURL('**/#home');
    await page.goto(`${base}/#dashboard`);await page.getByRole('heading',{name:'No scores yet'}).waitFor();
    assert.equal(await page.getByText('New Student',{exact:true}).count(),0);await finish();
  });
  await scenario('password recovery link renders update form and saves a new password',async()=>{
    const {page,state,finish}=await setup();await signup(page);await page.waitForURL('**/#home');
    await page.goto(`${base}/?recovery=1`);await page.getByLabel('New password',{exact:true}).fill('Changed-password123');
    await page.getByLabel('Confirm new password',{exact:true}).fill('Changed-password123');
    await page.getByRole('button',{name:'Save new password'}).click();await page.getByRole('heading',{name:'Password updated'}).waitFor();
    assert.equal(state.passwordUpdates,1);await page.getByRole('button',{name:'Continue to Home'}).click();await page.waitForURL('**/#home');await finish();
  });
  await scenario('email confirmation stays on login and explains the next step',async()=>{
    const {page,finish}=await setup({confirmEmail:true});await signup(page);
    await page.getByText('Check your email to confirm your account, then sign in.').waitFor();
    assert.equal(new URL(page.url()).hash,'');await finish();
  });
  await scenario('six repeated failed logins make only five mocked requests',async()=>{
    const {page,state,finish}=await setup({badLogin:true});
    await page.getByLabel(/Email Address/).fill('student@example.test');
    await page.getByLabel('Password',{exact:true}).fill('wrong-password');
    for(let i=0;i<6;i++){await page.getByRole('button',{name:'Log In with Email'}).click();await page.getByRole('button',{name:'Log In with Email'}).waitFor();}
    await page.getByText(/Too many attempts\. Please wait/).waitFor();assert.equal(state.loginCalls,5);await finish();
  });
  await scenario('Google disabled provider is explained without false login',async()=>{
    const {page,finish}=await setup();await page.getByRole('button',{name:'Continue with Google'}).click();
    await page.getByText(/Google sign-in is not enabled for this site yet/).waitFor();
    assert.equal(new URL(page.url()).hash,'');await finish();
  });
  for(const fails of [false,true])await scenario(`document upload ${fails?'failure displays real reason':'success inserts owned metadata'}`,async()=>{
    const {page,state,finish}=await setup({uploadFails:fails});await signup(page);
    await page.waitForURL('**/#home');await page.goto(`${base}/#vault`);
    await page.locator('input[type=file]').first().setInputFiles({name:'study-notes.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test document')});
    if(fails){await page.getByText(/Upload denied by storage policy/).first().waitFor();assert.equal(state.vault.length,0);}
    else {await page.getByText('study notes',{exact:true}).first().waitFor();assert.equal(state.vault[0].user_id,uid);assert.ok(state.vault[0].file_path.startsWith(`${uid}/`));}
    assert.equal(state.uploads,1);await finish();
  });
  await scenario('guest mobile routes, corrupted storage, quiz completion and persistence',async()=>{
    const {page,state,finish}=await setup({mobile:true});
    await page.evaluate(()=>{localStorage.setItem('skillpath_guest_chosen','true');localStorage.setItem('skillpath_guest_workspace_v1','{"quizAttempts":{},"domainMetrics":null,"assessmentAnswers":null}');});
    await page.reload();
    for(const route of ['home','profile','assessment','dashboard','careers','plan','method','vault','evidence']){
      await page.goto(`${base}/#${route}`);await page.locator('main').waitFor();
      assert.ok(await page.locator('main').innerText(),route);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} horizontal overflow`);
    }
    await page.goto(`${base}/#quiz`);await page.getByRole('button',{name:'Start Quick Quiz'}).click();
    for(let i=0;i<12;i++){
      await page.getByRole('button',{name:/^A /}).click();
      await page.getByRole('button',{name:i===11?'Finish & View Diagnostics':'Next Question'}).click();
    }
    await page.getByText('Measured Quiz vs Baseline Self-Report').waitFor();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('skillpath_guest_workspace_v1')));
    assert.equal(saved.quizAttempts.length,1);assert.equal(saved.quizAttempts[0].totalQuestions,12);
    assert.ok(saved.quizAttempts[0].overallScore>=0 && saved.quizAttempts[0].overallScore<=100);
    await page.reload();await page.getByRole('button',{name:'View Past Attempts (1)'}).waitFor();
    assert.equal(state.loginCalls,0);await finish();
  });
  console.log(`${passed} browser scenarios passed; external API requests mocked.`);
} finally {await browser.close();await server.close();}
