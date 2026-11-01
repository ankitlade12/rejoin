import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {timingSafeEqual} from 'node:crypto';
import {Store,digest,secret} from './lib/store.mjs';
import {tutor,validateTutorInput} from './lib/ai.mjs';
import {startTwitch} from './lib/twitch.mjs';
import {TwitchVault,twitchAuthorizedFetch} from './lib/twitch-auth.mjs';
const port=Number(process.env.PORT||4173), bind=process.env.HOST||'127.0.0.1';
const origin=process.env.PUBLIC_ORIGIN||`http://localhost:${port}`;
const store=new Store(process.env.REJOIN_DATA_FILE||fileURLToPath(new URL('./.data/state.json',import.meta.url)));
const vault=new TwitchVault((process.env.REJOIN_DATA_FILE||fileURLToPath(new URL('./.data/state.json',import.meta.url)))+'.twitch.enc',process.env.REJOIN_HOST_PASSWORD);
let stopTwitch=null,connecting=false;
const clients=new Set(),limits=new Map(),jobs=new Map(),oauth=new Map();
let connection='Twitch not connected',channel=null,canReply=false;
const publicRoom=()=>({...store.publicRoom(connection,channel),canReply});
function publish(){store.data.room.updatedAt=Date.now();store.save();for(const client of clients)client.write(`data: ${JSON.stringify(publicRoom())}\n\n`);}
function fail(status,message){throw Object.assign(Error(message),{status});}
function rate(key,max=60,window=60000){const now=Date.now();let entry=limits.get(key);if(!entry||entry.until<now){entry={until:now+window,count:0};limits.set(key,entry);}if(++entry.count>max)fail(429,'Too many requests. Please try again shortly.');}
setInterval(()=>{for(const [key,value] of limits)if(value.until<Date.now())limits.delete(key);for(const [key,value] of oauth)if(value.expires<Date.now())oauth.delete(key);store.prune();},60000).unref();
const cookie=req=>req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('rejoin_session='))?.slice(15)||'';
function setCookie(res,token,expire=false){res.setHeader('Set-Cookie',`rejoin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expire?0:86400}${origin.startsWith('https:')?'; Secure':''}`);}
function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>35000)fail(413,'Request exceeds 35 KB.');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{fail(400,'Invalid JSON.');}}
function mutate(req,session){if(req.headers.origin!==origin||!session||req.headers['x-csrf-token']!==session.csrf)fail(403,'Request origin or session could not be verified. Reload and try again.');}
function host(session){if(!session?.host)fail(403,'Instructor sign-in required.');}
const root=fileURLToPath(new URL('./dist/',import.meta.url));
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
 let jobId;
 try{
  const url=new URL(req.url,origin), token=cookie(req);let session=store.get(token);
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))rate(req.socket.remoteAddress||'unknown',240);
  if(req.method==='GET'&&url.pathname==='/api/health'){return json(res,{ok:true,aiConfigured:!!process.env.OPENAI_API_KEY,hostConfigured:(process.env.REJOIN_HOST_PASSWORD?.length||0)>=16,twitch:connection,version:'mvp-2'});}
  if(req.method==='GET'&&url.pathname==='/api/session'){
   if(!session){const created=store.create();session=created.session;setCookie(res,created.token);publish();}
   return json(res,{csrf:session.csrf,host:session.host,share:session.share,progress:session.progress,linked:!!session.linkedId,aiConfigured:!!process.env.OPENAI_API_KEY,twitchLinkConfigured:!!process.env.TWITCH_CLIENT_ID&&!!process.env.TWITCH_CLIENT_SECRET,room:publicRoom()});
  }
  if(req.method==='GET'&&url.pathname==='/api/room')return json(res,publicRoom());
  if(req.method==='GET'&&url.pathname==='/api/events'){
   if(clients.size>=100)fail(429,'Room event capacity reached.');res.writeHead(200,{'Content-Type':'text/event-stream',Connection:'keep-alive'});res.write(`data: ${JSON.stringify(publicRoom())}\n\n`);clients.add(res);const timer=setInterval(()=>res.write(': keepalive\n\n'),20000);req.on('close',()=>{clients.delete(res);clearInterval(timer);});return;
  }
  if(req.method==='GET'&&url.pathname==='/api/host'){host(session);return json(res,{...publicRoom(),aggregate:store.aggregate(),aiCalls:store.data.budget.calls});}
  if(req.method==='GET'&&url.pathname==='/auth/twitch/callback'){
   const state=oauth.get(url.searchParams.get('state'));oauth.delete(url.searchParams.get('state'));
   if(!state||state.expires<Date.now()||!session||state.owner!==digest(token))fail(403,'Twitch sign-in expired. Start again from privacy settings.');
   const code=url.searchParams.get('code');if(!code)fail(400,'Twitch sign-in was cancelled.');
   const response=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:process.env.TWITCH_CLIENT_ID,client_secret:process.env.TWITCH_CLIENT_SECRET,code,grant_type:'authorization_code',redirect_uri:origin+'/auth/twitch/callback'}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)fail(502,'Twitch sign-in failed.');const data=await response.json();
   const identityResponse=await fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${data.access_token}`},signal:AbortSignal.timeout(10000)});
   if(!identityResponse.ok)fail(502,'Twitch identity could not be verified.');const identity=await identityResponse.json();if(identity.client_id!==process.env.TWITCH_CLIENT_ID||!identity.user_id)fail(403,'Twitch identity mismatch.');
   if(state.purpose==='broadcaster'){host(session);if(!identity.scopes?.includes('user:read:chat'))fail(403,'Twitch chat permission is required.');vault.save(data);await connectBroadcaster(data);res.writeHead(303,{Location:'/?host=1'});return res.end();}
   for(const s of Object.values(store.data.sessions))if(s.linkedId===identity.user_id)s.linkedId=null;
   session.linkedId=identity.user_id;store.save();res.writeHead(303,{Location:'/?linked=1'});return res.end();
  }
  if(['POST','DELETE'].includes(req.method)&&url.pathname.startsWith('/api/')){
   mutate(req,session);const data=await body(req);
   if(url.pathname==='/api/login'&&req.method==='POST'){
    rate('login:'+req.socket.remoteAddress,5,600000);const expected=process.env.REJOIN_HOST_PASSWORD;
    if(!expected||expected.length<16)fail(503,'Set REJOIN_HOST_PASSWORD to at least 16 characters on the server.');
    if(typeof data.password!=='string'||!timingSafeEqual(Buffer.from(digest(data.password)),Buffer.from(digest(expected))))fail(401,'Incorrect instructor password.');
    // Rotate the session when elevating privileges; the previous cookie loses authority.
    const created=store.create();created.session.host=true;store.remove(token);store.save();setCookie(res,created.token);return json(res,{csrf:created.session.csrf,host:true});
   }
   if(url.pathname==='/api/logout'){session.host=false;store.save();return json(res,{ok:true});}
   if(url.pathname==='/api/progress'){
    if(typeof data.share!=='boolean'||!['unknown','ready','stuck','building'].includes(data.progress))fail(400,'Invalid sharing choice.');
    session.share=data.share;session.progress=data.share?data.progress:'unknown';session.checkpoint=null;publish();return json(res,{share:session.share,progress:session.progress});
   }
   if(url.pathname==='/api/host'){
    host(session);if(data.action==='checkpoint'&&['C1','C2','C3'].includes(data.checkpoint)){store.data.room.checkpoint=data.checkpoint;store.data.room.paused=false;store.data.room.ended=false;}
    else if(data.action==='pause')store.data.room.paused=true;
    else if(data.action==='resume'){store.data.room.paused=false;store.data.room.ended=false;}
    else if(data.action==='end'){store.data.room.ended=true;store.data.room.paused=true;for(const job of jobs.values())job.controller.abort();}
    else if(data.action==='chat-replies'&&typeof data.enabled==='boolean'){if(data.enabled&&(!canReply||!origin.startsWith('https://')))fail(409,'Chat replies need a connected token with user:write:chat and a public HTTPS origin.');store.data.room.chatReplies=data.enabled;}
    else if(data.action==='note'&&typeof data.note==='string'&&data.note.length<=800)store.data.room.note=data.note;
    else fail(400,'Invalid instructor action.');publish();return json(res,publicRoom());
   }
   if(url.pathname==='/api/link'||url.pathname==='/api/connect-twitch'){
    const broadcaster=url.pathname==='/api/connect-twitch';if(broadcaster)host(session);
    if(!process.env.TWITCH_CLIENT_ID||!process.env.TWITCH_CLIENT_SECRET)fail(503,'Twitch account linking is not configured.');
    rate('link:'+digest(token),5,600000);const state=secret();oauth.set(state,{owner:digest(token),expires:Date.now()+300000,purpose:broadcaster?'broadcaster':'learner'});
    const params=new URLSearchParams({client_id:process.env.TWITCH_CLIENT_ID,redirect_uri:origin+'/auth/twitch/callback',response_type:'code',scope:broadcaster?'user:read:chat user:write:chat':'',state,force_verify:'true'});
    return json(res,{url:'https://id.twitch.tv/oauth2/authorize?'+params});
   }
   if(url.pathname==='/api/unlink'){session.linkedId=null;store.save();return json(res,{ok:true});}
   if(url.pathname==='/api/session'&&req.method==='DELETE'){
    for(const job of jobs.values())if(job.owner===digest(token))job.controller.abort();for(const [id,state] of oauth)if(state.owner===digest(token))oauth.delete(id);store.remove(token);publish();setCookie(res,'',true);return json(res,{ok:true});
   }
   if(url.pathname==='/api/tutor'&&req.method==='DELETE'){
    const job=jobs.get(data.id);if(!job||job.owner!==digest(token))fail(404,'Request not found.');job.controller.abort();return json(res,{ok:true});
   }
   if(url.pathname==='/api/tutor'&&req.method==='POST'){
    if(store.data.room.paused)fail(409,'The workshop is paused. Editing and export remain available.');
    if(!process.env.OPENAI_API_KEY)fail(503,'AI is not configured. Instructor-authored hints are still available.');
    validateTutorInput(data);
    if(typeof data.id!=='string'||!/^[\da-f-]{36}$/.test(data.id))fail(400,'Invalid request ID.');
    if([...jobs.values()].some(j=>j.owner===digest(token)))fail(409,'You already have an active request.');
    rate('ai:'+digest(token),5,3600000);const hour=Math.floor(Date.now()/3600000);if(store.data.budget.hour!==hour)store.data.budget={hour,calls:0};if(store.data.budget.calls>=Number(process.env.REJOIN_AI_CALL_LIMIT||40))fail(429,'The room AI budget is exhausted for this hour.');store.data.budget.calls++;store.save();
    if(jobs.has(data.id))fail(409,'Request ID already in use.');jobId=data.id;const controller=new AbortController();jobs.set(jobId,{controller,owner:digest(token)});res.on('close',()=>controller.abort());
    try{const result=await tutor(data,AbortSignal.any([controller.signal,AbortSignal.timeout(45000)]));if(controller.signal.aborted||!store.get(token))return;return json(res,{...result,id:jobId,source:'OpenAI',model:process.env.OPENAI_MODEL||'gpt-5-mini'});}catch{if(!res.destroyed)json(res,{error:'AI could not finish. Your project is unchanged. Try an authored hint or prepare a host handoff.'},503);return;}
   }
   fail(404,'Endpoint not found.');
  }
  if(url.pathname.startsWith('/api/'))fail(404,'Endpoint not found.');
  if(req.method!=='GET')fail(405,'Method not allowed.');
  const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!['index.html','app.js','core.js','style.css','live.js','vendor/acorn.mjs'].includes(name))fail(404,'Not found.');
  const file=await readFile(root+name);res.writeHead(200,{'Content-Type':({'html':'text/html','css':'text/css','js':'text/javascript','mjs':'text/javascript'})[name.split('.').pop()]+'; charset=utf-8'});res.end(file);
 }catch(error){if(!res.headersSent)json(res,{error:error.status?error.message:'Service unavailable. Your local project is safe.'},error.status||500);else if(!res.writableEnded)res.end();}
 finally{if(jobId)jobs.delete(jobId);}
});
server.listen(port,bind,()=>console.log(`Rejoin: ${origin}`));
server.on('error',error=>{console.error(`Server failed: ${error.code||'unknown error'}`);process.exitCode=1;});
async function connectBroadcaster(tokens){
 if(connecting)throw Object.assign(Error('Twitch connection is already being updated.'),{status:409});connecting=true;
 try{
  stopTwitch?.();stopTwitch=null;
  stopTwitch=await startTwitch({token:tokens.access_token,clientId:process.env.TWITCH_CLIENT_ID,
   fetchImpl:twitchAuthorizedFetch({tokens,clientId:process.env.TWITCH_CLIENT_ID,clientSecret:process.env.TWITCH_CLIENT_SECRET,onTokens:next=>vault.save(next)}),
   onState:state=>{connection=state.connection;channel=state.channel;canReply=!!state.canReply;publish();},
   onCommand:(event,userId)=>{
    if(store.data.room.ended)return;
    if(event.type==='join'&&store.data.room.chatReplies&&canReply&&origin.startsWith('https://'))return `Join the coding workshop privately: ${origin}/?join=1`;
    if(event.type==='checkpoint'){store.data.room.checkpoint=event.checkpoint;store.data.room.paused=false;publish();}
    if(event.type==='pause'){store.data.room.paused=true;publish();}
    if(['stuck','ready'].includes(event.type)){const learner=Object.values(store.data.sessions).find(s=>s.linkedId===userId&&s.share&&s.expires>Date.now());if(learner){learner.progress=event.type;publish();}}
   }});
 }catch{connection='Twitch needs authorization';publish();throw Error('Twitch connection could not be established.');}finally{connecting=false;}
}
let storedTokens=null;try{storedTokens=vault.load();}catch{console.error('Saved Twitch authorization could not be opened. Connect Twitch again from the host console.');}
if(process.env.TWITCH_CLIENT_ID&&(storedTokens||process.env.TWITCH_ACCESS_TOKEN))connectBroadcaster(storedTokens||{access_token:process.env.TWITCH_ACCESS_TOKEN}).catch(()=>{});
function shutdown(){stopTwitch?.();for(const job of jobs.values())job.controller.abort();for(const client of clients)client.end();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
