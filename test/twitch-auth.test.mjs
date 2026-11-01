import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TwitchVault,twitchAuthorizedFetch} from '../lib/twitch-auth.mjs';
test('refresh credentials are encrypted, integrity checked, and bound to host password',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rejoin-vault-'));try{const path=join(dir,'tokens.enc'),vault=new TwitchVault(path,'fixture-long-password');const tokens={access_token:'private-access-fixture',refresh_token:'private-refresh-fixture'};assert.equal(vault.load(),null);vault.save(tokens);assert.ok(!readFileSync(path,'utf8').includes(tokens.access_token));assert.deepEqual(vault.load(),tokens);assert.throws(()=>new TwitchVault(path,'wrong-password').load());const saved=JSON.parse(readFileSync(path));saved.tag=Buffer.alloc(16).toString('base64');writeFileSync(path,JSON.stringify(saved));assert.throws(()=>vault.load());}finally{rmSync(dir,{recursive:true,force:true});}
});
test('a 401 renews tokens once across concurrent requests and persists the rotated refresh token',async()=>{
 let refreshes=0,saved;
 const auth=twitchAuthorizedFetch({tokens:{access_token:'expired',refresh_token:'old-refresh'},clientId:'client',clientSecret:'secret',onTokens:t=>{saved=t;},fetchImpl:async(url,options)=>{
  if(url.endsWith('/token')){refreshes++;assert.equal(options.body.get('grant_type'),'refresh_token');await new Promise(r=>setTimeout(r,10));return {ok:true,json:async()=>({access_token:'renewed',refresh_token:'new-refresh'})};}
  return {status:options.headers.get('Authorization').endsWith('expired')?401:200};
 }});
 const results=await Promise.all([auth('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:'OAuth old'}}),auth('https://api.twitch.tv/helix/eventsub/subscriptions',{headers:{Authorization:'Bearer old'}})]);assert.ok(results.every(r=>r.status===200));assert.equal(refreshes,1);assert.equal(saved.refresh_token,'new-refresh');await assert.rejects(auth('https://attacker.example')); 
});
