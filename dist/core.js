export const contractVersion='1.1.0';
import {parse} from './vendor/acorn.mjs';
export const checkpoints = [
  { id: 'C1', title: 'Make it yours', detail: 'Build your event page. Give it your own title and style.' },
  { id: 'C2', title: 'Wire up the RSVP', detail: 'Connect a click event to the RSVP button. Register only once.' },
  { id: 'C3', title: 'Count your community', detail: 'Update the attendee count and announce the confirmation.' }
];
export const binding = "button.addEventListener('click', register);";
export const broken = `// Your community. Your event.\nconst button = document.querySelector('#rsvp');\nconst status = document.querySelector('#status');\n\nfunction register() {\n  button.textContent = "You're on the list!";\n  button.disabled = true;\n  status.textContent = 'See you at the next stream.';\n}\n\n// TODO: connect the button to register\n`;
export const fixed = broken.replace('// TODO: connect the button to register', binding);
export const complete = fixed.replace("  button.disabled = true;", "  button.disabled = true;\n  document.querySelector('#count').textContent = String(Number(document.querySelector('#count').textContent) + 1);");
export const alternative = fixed.replace(binding, 'button.onclick = register;');
export const starter = {
 'index.html': `<main class="event-card">\n  <span class="eyebrow">THE COMMUNITY HANGOUT</span>\n  <h1>Late Night Builders</h1>\n  <p>A little code. Good company. Something worth building.</p>\n  <div class="event-meta">SAT, NOV 14 · 7:00 PM CT</div>\n  <div class="attendees"><span id="count">42</span> builders joining</div>\n  <button id="rsvp">Save my spot <span>↗</span></button>\n  <p id="status" role="status" aria-live="polite">No tickets. Just bring your curiosity.</p>\n</main>`,
 'style.css': `body { background: #131018; color: #faf7ff; font-family: system-ui, sans-serif; padding: 32px; margin: 0; }\n.event-card { max-width: 420px; margin: 16px auto; padding: 32px; border: 1px solid #4b365e; border-radius: 18px; background: #20152d; }\n.eyebrow { color: #c6a0ff; font-size: 10px; letter-spacing: 2px; font-weight: 700; }\nh1 { font-size: 37px; line-height: 1.05; letter-spacing: -1.6px; margin: 28px 0 16px; }\np { color: #b9adc8; font-size: 13px; line-height: 1.7; }\n.event-meta { font-size: 11px; margin: 24px 0; color: #e0d5eb; }\n.attendees { font-size: 12px; color: #c9bbdb; margin-bottom: 22px; }\nbutton { display: flex; justify-content: space-between; width: 100%; padding: 15px; background: #a970ff; border: 0; border-radius: 8px; color: #170b26; font-weight: 700; cursor: pointer; }\nbutton:disabled { background: #c4a3f1; }\n#status { text-align: center; font-size: 10px; margin-bottom: 0; }`,
 'script.js': broken
};
export function validate(files) {
 const keys = Object.keys(files);
 if(keys.length !== 3 || keys.some(k => !Object.hasOwn(starter,k))) throw Error('This workshop supports index.html, style.css and script.js only.');
 if(keys.some(k => typeof files[k] !== 'string' || new TextEncoder().encode(files[k]).length > 100000)) throw Error('Each file must be text and smaller than 100 KB.');
}
export const snapshot = files => JSON.stringify(files);
function signature(code){return JSON.stringify(parse(code,{ecmaVersion:2022}), (key,value)=>['start','end','raw'].includes(key)?undefined:value);}
const patterns=[[broken,'broken'],[fixed,'C2'],[alternative,'C2'],[complete,'C3'],[complete.replace(binding,'button.onclick = register;'),'C3']].map(([code,kind])=>[signature(code),kind]);
export function scriptKind(code) {try{if(typeof code!=='string'||code.length>100000)return 'unsupported';const ast=signature(code);return patterns.find(([pattern])=>pattern===ast)?.[1]||'unsupported';}catch{return 'unsupported';}}
export function executableScript(code){const kind=scriptKind(code);return kind==='broken'?broken:kind==='C2'?fixed:kind==='C3'?complete:'';}
export function propose(files, target, protectedFiles = []) {
 validate(files);
 const kind=scriptKind(files['script.js']);
 if (target === 'C1') return {state:'no-change',message:'This checkpoint needs no JavaScript repair. Run the preview to inspect your event page.'};
 if (kind === 'unsupported') return {state:'unsupported',message:'This code differs from the prepared workshop. Your implementation may be valid. Automatic execution and repair are unavailable; export a help packet for your instructor.'};
 if (kind === 'C3' || (target === 'C2' && kind === 'C2')) return {state:'no-change',message:'Your event handler already meets the prepared code contract. No rewrite needed. Run checks to confirm the page structure.'};
 if (protectedFiles.includes('script.js')) return {state:'conflict',message:'The required change touches protected script.js. Keep it protected and ask your instructor, or unlock the file and request a new review.'};
 let repaired=files['script.js'];
 const additions=[];
 if(kind==='broken'){repaired+='\n'+binding+'\n';additions.push(binding);}
 if(target==='C3'){
  const fn=parse(repaired,{ecmaVersion:2022}).body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='register');
  const statement=fn.body.body.find(node=>node.type==='ExpressionStatement'&&node.expression.type==='AssignmentExpression'&&node.expression.left.property?.name==='disabled');
  const line="\n  document.querySelector('#count').textContent = String(Number(document.querySelector('#count').textContent) + 1);";
  repaired=repaired.slice(0,statement.end)+line+repaired.slice(statement.end);additions.push(line.trim());
 }
 const next={...files,'script.js':repaired};
 if(scriptKind(repaired)!==target)throw Error('The suggested change is outside the supported workshop. Ask your instructor.');
 return {state:'candidate',version:contractVersion,before:snapshot(files),after:snapshot(next),files:next,target,removed:'No existing lines removed',added:additions.join('\n')};
}
export function applyPlan(files, plan) {
 if(plan.version!==contractVersion || plan.state !== 'candidate' || snapshot(files)!==plan.before) throw Error('Your code changed since this review. Request a fresh review before applying.');
 if(snapshot(plan.files)!==plan.after) throw Error('This suggestion changed. Request a fresh review.');
 return structuredClone(plan.files);
}
export function undoPlan(files, undo) {
 if(!undo || snapshot(files)!==undo.after) throw Error('You have newer edits. Download the pre-fix copy to keep both versions.');
 return JSON.parse(undo.before);
}
export function command(text, userId, hostId) {
 const message=text.trim();
 if(userId === hostId && /^!checkpoint C[123]$/.test(message)) return {type:'checkpoint',checkpoint:message.split(' ')[1]};
 if(userId === hostId && message === '!pause') return {type:'pause'};
 if(message === '!rejoin') return {type:'join'};
 // Learner signals are resolved separately against OAuth-linked, opted-in sessions.
 return null;
}
