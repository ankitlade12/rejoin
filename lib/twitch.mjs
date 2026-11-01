import {command} from '../dist/core.js';
export async function startTwitch({token,clientId,onState,onCommand,fetchImpl=fetch,WebSocketImpl=WebSocket}){
 const room={connection:'Connecting to Twitch',channel:null};
 const publish=()=>onState({...room});
 const validation=await fetchImpl('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token}`}});
 if(!validation.ok)throw Error('Invalid token');const identity=await validation.json();
 if(identity.client_id!==clientId||!identity.scopes.includes('user:read:chat')||!identity.user_id)throw Error('Token scope mismatch');
 room.canReply=identity.scopes.includes('user:write:chat');room.channel=identity.login;room.connection='Connecting to Twitch';publish();
 let lastReply=0;const seen=new Set();let activeSocket,stopped=false,retry,health;let lastMessage=Date.now(),keepalive=15000;
 const connect=(address='wss://eventsub.wss.twitch.tv/ws',migration=false)=>{
  if(stopped)return;
  const socket=new WebSocketImpl(address);
  socket.addEventListener('message',async raw=>{try{
   const data=JSON.parse(raw.data);const type=data.metadata.message_type;lastMessage=Date.now();
   if(type==='session_welcome'){
    if(migration){const old=activeSocket;activeSocket=socket;old?.close();}else activeSocket=socket;
    keepalive=(data.payload.session.keepalive_timeout_seconds||10)*1000+5000;
    if(!migration){const sub=await fetchImpl('https://api.twitch.tv/helix/eventsub/subscriptions',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Client-Id':clientId,'Content-Type':'application/json'},body:JSON.stringify({type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:identity.user_id,user_id:identity.user_id},transport:{method:'websocket',session_id:data.payload.session.id}})});if(!sub.ok){stopped=true;socket.close();room.connection='Twitch subscription failed';publish();return;}}
    room.connection='Connected';publish();clearInterval(health);health=setInterval(()=>{if(Date.now()-lastMessage>keepalive)activeSocket?.close();},3000);
   }else if(type==='session_reconnect'){
    const url=new URL(data.payload.session.reconnect_url);if(url.protocol!=='wss:'||url.hostname!=='eventsub.wss.twitch.tv')throw Error('Untrusted reconnect');connect(url.href,true);
   }else if(type==='revocation'){stopped=true;room.connection='Twitch access revoked';publish();socket.close();clearInterval(health);}
   else if(type==='notification'){
    const id=data.metadata.message_id;if(seen.has(id))return;seen.add(id);if(seen.size>1000)seen.delete(seen.values().next().value);
    if(data.payload.subscription?.type!=='channel.chat.message')return;
    const event=data.payload.event;if(event.broadcaster_user_id!==identity.user_id)return;
    const result=command(event.message.text,event.chatter_user_id,identity.user_id);
    if(result){const reply=onCommand(result,event.chatter_user_id);if(result.type==='join'&&typeof reply==='string'&&room.canReply&&Date.now()-lastReply>=30000){lastReply=Date.now();const sent=await fetchImpl('https://api.twitch.tv/helix/chat/messages',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Client-Id':clientId,'Content-Type':'application/json'},body:JSON.stringify({broadcaster_id:identity.user_id,sender_id:identity.user_id,message:reply.slice(0,450)}),signal:AbortSignal.timeout(10000)});if(!sent.ok||(await sent.json()).data?.[0]?.is_sent!==true){room.connection='Connected · chat reply failed';publish();}}}
    if(['!stuck','!ready'].includes(event.message.text.trim()))onCommand({type:event.message.text.trim().slice(1)},event.chatter_user_id);
   }
  }catch{room.connection='Twitch event error';publish();}});
  socket.addEventListener('error',()=>{});
  socket.addEventListener('close',()=>{if(stopped||socket!==activeSocket&&activeSocket)return;activeSocket=null;room.connection='Twitch disconnected · events may be missing';publish();clearInterval(health);clearTimeout(retry);retry=setTimeout(()=>connect(),3000);});
 };
 connect();
 // Installed connector revalidates authorization; it never persists or returns the access token.
 const validationTimer=setInterval(async()=>{try{const r=await fetchImpl('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token}`}});if(!r.ok){stopped=true;activeSocket?.close();clearInterval(health);room.connection='Twitch token expired';publish();}}catch{room.connection='Twitch validation unavailable';publish();}},3600000);validationTimer.unref();
 return ()=>{stopped=true;clearTimeout(retry);clearInterval(health);clearInterval(validationTimer);activeSocket?.close();};
}
