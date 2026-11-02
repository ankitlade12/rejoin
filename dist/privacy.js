// The same screening is used for human handoffs and AI requests. Detection is best effort.
const patterns=[/sk-[A-Za-z0-9_-]{16,}/g,/AKIA[A-Z0-9]{16}/g,/-----BEGIN[^\n]*PRIVATE KEY-----[\s\S]*?(?:-----END[^\n]*PRIVATE KEY-----|$)/g,/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]\s*['"])[^'"\n]{8,}(['"])/gi];
export function redact(text){let count=0;let value=String(text);for(const [i,pattern] of patterns.entries())value=value.replace(pattern,(...args)=>{count++;return i===3?args[1]+'[REDACTED]'+args[2]:'[REDACTED]';});return {text:value,count};}
export function helpPacket({files,selected,target,question,checks,history,version}){
 const packet={workshop:'community-rsvp',version,target,question:redact(question).text,files:{},checks:checks?{passed:checks.passed,message:checks.message,checks:checks.checks}:null,attempts:history.slice(-10),notice:'Review before sharing. Detection is best effort. Downloaded copies cannot be revoked.'};let redactions=redact(question).count;
 for(const name of selected){if(!Object.hasOwn(files,name))throw Error('Unknown file');const result=redact(files[name]);packet.files[name]=result.text;redactions+=result.count;}
 return {packet,redactions};
}
