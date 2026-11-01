import {randomBytes,scryptSync,createCipheriv,createDecipheriv} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export class TwitchVault {
 constructor(path,password){this.path=path;this.key=password?scryptSync(password,'rejoin-twitch-v1',32):null;}
 load(){if(!this.key)return null;let data;try{data=JSON.parse(readFileSync(this.path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}const decipher=createDecipheriv('aes-256-gcm',this.key,Buffer.from(data.iv,'base64'));decipher.setAuthTag(Buffer.from(data.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.body,'base64')),decipher.final()]).toString());}
 save(tokens){if(!this.key)throw Error('Instructor password required to store Twitch authorization.');const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv);const body=Buffer.concat([cipher.update(JSON.stringify(tokens)),cipher.final()]);mkdirSync(dirname(this.path),{recursive:true,mode:0o700});writeFileSync(this.path+'.tmp',JSON.stringify({iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),body:body.toString('base64')}),{mode:0o600});renameSync(this.path+'.tmp',this.path);}
}
export function twitchAuthorizedFetch({tokens,clientId,clientSecret,onTokens,fetchImpl=fetch}){
 let current={...tokens},refreshing=null;
 async function refresh(){
  if(!current.refresh_token||!clientSecret)throw Error('Twitch needs authorization.');
  const response=await fetchImpl('https://id.twitch.tv/oauth2/token',{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',client_id:clientId,client_secret:clientSecret,refresh_token:current.refresh_token}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Twitch renewal failed.');const next=await response.json();
  if(typeof next.access_token!=='string'||typeof next.refresh_token!=='string')throw Error('Invalid Twitch renewal response.');
  onTokens(next);current=next;
 }
 return async(url,options={})=>{
  if(!['id.twitch.tv','api.twitch.tv'].includes(new URL(url).hostname))throw Error('Unsupported Twitch endpoint.');
  const send=()=>{const headers=new Headers(options.headers);if(headers.has('Authorization'))headers.set('Authorization',(String(headers.get('Authorization')).startsWith('OAuth ')?'OAuth ':'Bearer ')+current.access_token);return fetchImpl(url,{...options,headers,signal:options.signal||AbortSignal.timeout(10000)});};
  let response=await send();if(response.status!==401)return response;
  if(!refreshing)refreshing=refresh().finally(()=>{refreshing=null;});await refreshing;return send();
 };
}
