import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const secret=()=>randomBytes(32).toString('base64url');
export class Store {
 constructor(path){this.path=path;this.data={room:{checkpoint:'C2',paused:false,ended:false,note:'',updatedAt:Date.now()},sessions:{},budget:{hour:0,calls:0}};if(path){try{this.data=JSON.parse(readFileSync(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}}this.prune();}
 save(){if(!this.path)return;mkdirSync(dirname(this.path),{recursive:true,mode:0o700});writeFileSync(this.path+'.tmp',JSON.stringify(this.data),{mode:0o600});renameSync(this.path+'.tmp',this.path);}
 prune(){for(const [id,s] of Object.entries(this.data.sessions))if(s.expires<Date.now())delete this.data.sessions[id];this.save();}
 create(){this.prune();if(Object.keys(this.data.sessions).length>=500)throw Object.assign(Error('Room capacity reached. Try again later.'),{status:429});const token=secret();const session={csrf:secret(),host:false,share:false,progress:'unknown',checkpoint:null,expires:Date.now()+86400000,linkedId:null,blocker:'none',reportedAt:null};this.data.sessions[digest(token)]=session;this.save();return {token,session};}
 get(token){const session=this.data.sessions[digest(token||'')];return session?.expires>Date.now()?session:null;}
 remove(token){delete this.data.sessions[digest(token||'')];this.save();}
 aggregate(){const sessions=Object.values(this.data.sessions).filter(s=>s.expires>Date.now()&&!s.host);const shared=sessions.filter(s=>s.share);const counts={ready:0,stuck:0,building:0,unknown:0};const checkpoints={C1:0,C2:0,C3:0},blockers={binding:0,count:0,markup:0,protected:0,unsupported:0};for(const s of shared){counts[s.progress]++;if(Object.hasOwn(checkpoints,s.checkpoint))checkpoints[s.checkpoint]++;if(Object.hasOwn(blockers,s.blocker))blockers[s.blocker]++;}return {participants:sessions.length,optedIn:shared.length,unknown:sessions.length-shared.length,counts,checkpoints,blockers,lastReportAt:Math.max(0,...shared.map(s=>s.reportedAt||0))};}
 publicRoom(connection,channel){const a=this.aggregate();return {...this.data.room,connection,channel,participants:a.participants,optedIn:a.optedIn,counts:a.optedIn>=5?a.counts:null,checkpoints:a.optedIn>=5?a.checkpoints:null,blockers:Object.fromEntries(Object.entries(a.blockers).filter(([,n])=>n>=5)),lastReportAt:a.lastReportAt,progressType:'self-reported',aggregateSuppressed:a.optedIn<5};}
}
