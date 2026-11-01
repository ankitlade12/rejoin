import test from 'node:test';
import assert from 'node:assert/strict';
import {startTwitch} from '../lib/twitch.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('EventSub handshake, host authorization, duplicate messages, migration and revocation',async()=>{
 const sockets=[],calls=[],states=[],events=[];
 class Socket extends EventTarget{constructor(url){super();this.url=url;sockets.push(this);}sendEvent(type,payload,id=crypto.randomUUID()){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({metadata:{message_type:type,message_id:id},payload})}));}close(){this.dispatchEvent(new Event('close'));}}
 const fetchImpl=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('validate')?{client_id:'client',scopes:['user:read:chat'],user_id:'host',login:'workshop'}:{}};};
 const stop=await startTwitch({token:'fixture-token',clientId:'client',fetchImpl,WebSocketImpl:Socket,onState:s=>states.push(s),onCommand:(e,id)=>events.push({e,id})});
 try{
  const first=sockets[0];first.sendEvent('session_welcome',{session:{id:'session-one',keepalive_timeout_seconds:10}});await tick();
  assert.equal(states.at(-1).connection,'Connected');const subscription=JSON.parse(calls[1].options.body);assert.equal(subscription.type,'channel.chat.message');assert.equal(subscription.condition.broadcaster_user_id,'host');
  const message=(text,user='host')=>({subscription:{type:'channel.chat.message'},event:{broadcaster_user_id:'host',chatter_user_id:user,message:{text}}});
  first.sendEvent('notification',message('!checkpoint C3'),'one');first.sendEvent('notification',message('!checkpoint C3'),'one');first.sendEvent('notification',message('!checkpoint C1','viewer'));await tick();assert.equal(events.length,1);assert.equal(events[0].e.checkpoint,'C3');
  first.sendEvent('notification',message('!stuck','learner'));assert.equal(events.at(-1).id,'learner');assert.equal(events.at(-1).e.type,'stuck');
  first.sendEvent('session_reconnect',{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/reconnect'}});assert.equal(sockets.length,2);sockets[1].sendEvent('session_welcome',{session:{id:'session-two'}});await tick();assert.equal(calls.filter(c=>c.url.includes('subscriptions')).length,1);
  sockets[1].sendEvent('revocation',{});assert.equal(states.at(-1).connection,'Twitch access revoked');
 }finally{stop();}
});
test('EventSub rejects mismatched token client and missing chat scope',async()=>{
 for(const identity of [{client_id:'wrong',scopes:['user:read:chat'],user_id:'host'},{client_id:'client',scopes:[],user_id:'host'}])await assert.rejects(startTwitch({token:'fixture',clientId:'client',onState:()=>{},onCommand:()=>{},fetchImpl:async()=>({ok:true,json:async()=>identity})}),/mismatch/);
});
test('public invitation replies require explicit application opt-in and write scope, with cooldown',async()=>{
 const sockets=[],sent=[];let enabled=false;
 class Socket extends EventTarget{constructor(){super();sockets.push(this);}event(type,payload){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({metadata:{message_type:type,message_id:crypto.randomUUID()},payload})}));}close(){this.dispatchEvent(new Event('close'));}}
 const stop=await startTwitch({token:'fixture',clientId:'client',WebSocketImpl:Socket,onState:()=>{},onCommand:e=>enabled&&e.type==='join'?'Join: https://workshop.example/?join=1':undefined,fetchImpl:async(url,options)=>{
  if(url.includes('/chat/messages'))sent.push(JSON.parse(options.body));
  return {ok:true,json:async()=>url.includes('validate')?{client_id:'client',scopes:['user:read:chat','user:write:chat'],user_id:'host',login:'workshop'}:{data:[{is_sent:true}]}};
 }});
 try{const socket=sockets[0];socket.event('session_welcome',{session:{id:'session',keepalive_timeout_seconds:10}});await tick();const message={subscription:{type:'channel.chat.message'},event:{broadcaster_user_id:'host',chatter_user_id:'viewer',message:{text:'!rejoin'}}};socket.event('notification',message);await tick();assert.equal(sent.length,0);enabled=true;socket.event('notification',message);await tick();socket.event('notification',message);await tick();assert.equal(sent.length,1);assert.equal(sent[0].message,'Join: https://workshop.example/?join=1');}finally{stop();}
});
