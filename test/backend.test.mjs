import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {Store} from '../lib/store.mjs';
import {validateTutorInput,validateTutorOutput} from '../lib/ai.mjs';
import {starter,broken,fixed,alternative,scriptKind,executableScript,propose,applyPlan,snapshot} from '../dist/core.js';
test('persistent sessions are scoped, expire, revoke sharing, and suppress small cohorts',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rejoin-store-'));try{const path=join(dir,'state.json'),store=new Store(path),a=store.create(),b=store.create();a.session.share=true;a.session.progress='stuck';store.save();assert.equal(store.publicRoom('Disconnected',null).counts,null);assert.notEqual(a.session.csrf,b.session.csrf);assert.equal(new Store(path).get(a.token).progress,'stuck');assert.equal(store.get('guessed'),null);for(let i=0;i<4;i++){const c=store.create();c.session.share=true;c.session.progress='ready';}assert.deepEqual(store.publicRoom('Connected','channel').counts,{ready:4,stuck:1,building:0,unknown:0});store.remove(a.token);assert.equal(store.publicRoom('Connected','channel').counts,null);b.session.expires=0;assert.equal(store.get(b.token),null);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('AI boundary requires consent, rejects secrets/oversize, and grounds evidence',()=>{
 const body={script:broken,target:'C2',question:'Help me',consent:'ai-script-v1'};
 assert.equal(validateTutorInput(body).kind,'broken');assert.throws(()=>validateTutorInput({...body,consent:false}));assert.throws(()=>validateTutorInput({...body,script:'sk-'+ 'a'.repeat(35)}),/credential/);assert.throws(()=>validateTutorInput({...body,script:'a'.repeat(24001)}));
 assert.throws(()=>validateTutorOutput({hint:'x',explanation:'x',nextAction:'review',evidence:['invented-test']},validateTutorInput(body)));
 const result=validateTutorOutput({hint:'x',explanation:'x',nextAction:'review',evidence:['E1']},{...validateTutorInput(body),kind:'unsupported'});assert.equal(result.nextAction,'handoff');
});
test('HTTP: instructor auth, CSRF, independent guests, sharing, deletion, paused room and AI configuration',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rejoin-http-'));const port=4391;const origin=`http://localhost:${port}`;
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),PUBLIC_ORIGIN:origin,REJOIN_DATA_FILE:join(dir,'state.json'),REJOIN_HOST_PASSWORD:'test-only-password-123456',OPENAI_API_KEY:'',TWITCH_ACCESS_TOKEN:'',TWITCH_CLIENT_ID:''},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server did not start')),8000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});});
  const guest=async()=>{const response=await fetch(origin+'/api/session');const data=await response.json();return {cookie:response.headers.get('set-cookie').split(';')[0],...data};};
  const a=await guest(),b=await guest();assert.notEqual(a.csrf,b.csrf);assert.equal(a.share,false);
  const request=(path,data,session=a,extra={})=>fetch(origin+path,{method:data?'POST':'GET',headers:{Cookie:session.cookie,Origin:origin,'Content-Type':'application/json','X-CSRF-Token':session.csrf,...extra},...(data?{body:JSON.stringify(data)}:{})});
  assert.equal((await request('/api/host')).status,403);
  assert.equal((await request('/api/progress',{share:true,progress:'ready'},a,{'X-CSRF-Token':b.csrf})).status,403);
  assert.equal((await request('/api/progress',{share:true,progress:'ready'},a,{Origin:'https://attacker.example'})).status,403);
  assert.equal((await request('/api/progress',{share:true,progress:'stuck'})).status,200);
  assert.equal((await (await request('/api/session',null,b)).json()).share,false);
  const login=await request('/api/login',{password:'test-only-password-123456'});assert.equal(login.status,200);const host={...await login.json(),cookie:login.headers.get('set-cookie').split(';')[0]};
  assert.equal((await request('/api/host',null,a)).status,403);
  assert.equal((await request('/api/host',{action:'checkpoint',checkpoint:'C3'},host)).status,200);
  assert.equal((await (await request('/api/room',null,b)).json()).checkpoint,'C3');
  assert.equal((await request('/api/host',{action:'pause'},host)).status,200);
  assert.equal((await request('/api/tutor',{id:crypto.randomUUID(),consent:'ai-script-v1',script:broken,target:'C2',question:'Help'},b)).status,409);
  await request('/api/host',{action:'resume'},host);
  assert.equal((await request('/api/tutor',{id:crypto.randomUUID(),consent:'ai-script-v1',script:broken,target:'C2',question:'Help'},b)).status,503);
  assert.equal((await request('/api/host',{action:'note',note:'Review event listeners'},host)).status,200);
  const publicData=await (await request('/api/room',null,b)).json();assert.equal(publicData.note,'Review event listeners');assert.equal(publicData.counts,null);assert.ok(!JSON.stringify(publicData).includes('csrf'));
  const del=await fetch(origin+'/api/session',{method:'DELETE',headers:{Cookie:b.cookie,Origin:origin,'X-CSRF-Token':b.csrf}});assert.equal(del.status,200);assert.equal((await request('/api/progress',{share:true,progress:'ready'},b)).status,403);
  assert.equal((await fetch(origin+'/.env')).status,404);assert.equal((await fetch(origin+'/api/workspaces/other-user')).status,404);
 }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));rmSync(dir,{recursive:true,force:true});}
});
