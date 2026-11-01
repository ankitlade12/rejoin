import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {command} from './dist/core.js';
const port=Number(process.env.PORT||4173);
const clients=new Set();
let room={checkpoint:'C2',paused:false,connection:'Demo mode',channel:null};
const publish=()=>{for(const client of clients)client.write(`data: ${JSON.stringify(room)}\n\n`);};
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
 const url=new URL(req.url,'http://localhost');
 if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 if(url.pathname==='/api/room'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(room));return;}
 if(url.pathname==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});res.write(`data: ${JSON.stringify(room)}\n\n`);clients.add(res);const timer=setInterval(()=>res.write(': keepalive\n\n'),20000);req.on('close',()=>{clients.delete(res);clearInterval(timer);});return;}
 const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
 if(!['index.html','app.js','core.js','style.css'].includes(name)){res.writeHead(404);res.end('Not found');return;}
 try{const file=await readFile(root+name);res.setHeader('Content-Type',mime['.'+name.split('.').pop()]+'; charset=utf-8');res.end(file);}catch{res.writeHead(500);res.end('Unable to read application file');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Rejoin: http://localhost:${port}`));
const token=process.env.TWITCH_ACCESS_TOKEN;
const clientId=process.env.TWITCH_CLIENT_ID;
if(token&&clientId)startTwitch().catch(()=>{room.connection='Twitch authentication failed';publish();console.error('Twitch connection failed. Check the configured broadcaster token and client ID.');});
async function startTwitch(){
 const validation=await fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token}`}});
 if(!validation.ok)throw Error('Invalid token');const identity=await validation.json();
 if(identity.client_id!==clientId||!identity.scopes.includes('user:read:chat')||!identity.user_id)throw Error('Token scope mismatch');
 room.channel=identity.login;room.connection='Connecting to Twitch';publish();
 const seen=new Set();let activeSocket,stopped=false,retry,health;let lastMessage=Date.now(),keepalive=15000;
 const connect=(address='wss://eventsub.wss.twitch.tv/ws',migration=false)=>{
  if(stopped)return;
  const socket=new WebSocket(address);
  socket.addEventListener('message',async raw=>{try{
   const data=JSON.parse(raw.data);const type=data.metadata.message_type;lastMessage=Date.now();
   if(type==='session_welcome'){
    if(migration){const old=activeSocket;activeSocket=socket;old?.close();}else activeSocket=socket;
    keepalive=(data.payload.session.keepalive_timeout_seconds||10)*1000+5000;
    if(!migration){const sub=await fetch('https://api.twitch.tv/helix/eventsub/subscriptions',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Client-Id':clientId,'Content-Type':'application/json'},body:JSON.stringify({type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:identity.user_id,user_id:identity.user_id},transport:{method:'websocket',session_id:data.payload.session.id}})});if(!sub.ok){stopped=true;socket.close();room.connection='Twitch subscription failed';publish();return;}}
    room.connection='Connected';publish();clearInterval(health);health=setInterval(()=>{if(Date.now()-lastMessage>keepalive)activeSocket?.close();},3000);
   }else if(type==='session_reconnect'){
    const url=new URL(data.payload.session.reconnect_url);if(url.protocol!=='wss:'||url.hostname!=='eventsub.wss.twitch.tv')throw Error('Untrusted reconnect');connect(url.href,true);
   }else if(type==='revocation'){stopped=true;room.connection='Twitch access revoked';publish();socket.close();clearInterval(health);}
   else if(type==='notification'){
    const id=data.metadata.message_id;if(seen.has(id))return;seen.add(id);if(seen.size>1000)seen.delete(seen.values().next().value);
    if(data.payload.subscription?.type!=='channel.chat.message')return;
    const event=data.payload.event;if(event.broadcaster_user_id!==identity.user_id)return;
    const result=command(event.message.text,event.chatter_user_id,identity.user_id);
    if(result?.type==='checkpoint'){room.checkpoint=result.checkpoint;room.paused=false;publish();}
    if(result?.type==='pause'){room.paused=true;publish();}
    if(result?.type==='join')console.log(`A viewer requested Rejoin. Public local workshop: http://localhost:${port}`);
   }
  }catch{room.connection='Twitch event error';publish();}});
  socket.addEventListener('error',()=>{});
  socket.addEventListener('close',()=>{if(stopped||socket!==activeSocket&&activeSocket)return;room.connection='Twitch disconnected · events may be missing';publish();clearInterval(health);clearTimeout(retry);retry=setTimeout(()=>connect(),3000);});
 };
 connect();
 // Installed connector revalidates authorization; it never persists or returns the access token.
 setInterval(async()=>{try{const r=await fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token}`}});if(!r.ok){stopped=true;activeSocket?.close();clearInterval(health);room.connection='Twitch token expired';publish();}}catch{room.connection='Twitch validation unavailable';publish();}},3600000).unref();
}
