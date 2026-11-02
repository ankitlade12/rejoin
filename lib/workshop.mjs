import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {starter,broken,fixed,complete,checkpoints,contractVersion,validate,scriptKind} from '../dist/core.js';
export const references={C1:{...starter,'script.js':broken},C2:{...starter,'script.js':fixed},C3:{...starter,'script.js':complete}};
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function buildManifest(){return {id:'community-rsvp',version:contractVersion,files:Object.keys(starter),limits:{files:3,bytesPerFile:100000},runtime:'restricted-canonical-browser',harnessHash:hash(readFileSync(new URL('../dist/preview.js',import.meta.url),'utf8')),checkpoints:checkpoints.map((c,i)=>({...c,version:contractVersion,parents:i?[checkpoints[i-1].id]:[],referenceHash:hash(references[c.id]),tests:i===0?['title']:i===1?['title','registration','announcement']:['title','registration','announcement','count'],practice:'Explain why an event listener receives a function instead of calling it immediately.'}))};}
export function validateManifest(manifest){
 const expected=buildManifest();if(JSON.stringify(manifest)!==JSON.stringify(expected))throw Error('Workshop contract differs from its published manifest. Review, version and republish before release.');
 for(const [id,files] of Object.entries(references)){validate(files);if(id!=='C1'&&scriptKind(files['script.js'])!==id)throw Error('Reference does not match '+id);}
 return manifest;
}
export const manifest=validateManifest(JSON.parse(readFileSync(new URL('../dist/workshop-manifest.json',import.meta.url),'utf8')));
