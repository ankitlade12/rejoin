import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.env')){console.log('.env already exists; no settings changed.');}else{const template=readFileSync('.env.example','utf8').replace('replace-with-a-long-random-password',randomBytes(24).toString('base64url'));writeFileSync('.env',template,{mode:0o600,flag:'wx'});console.log('Created private .env with a random instructor password. Open .env locally to view it and configure optional integrations. Never share this file.');}
