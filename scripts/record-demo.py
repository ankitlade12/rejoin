"""Record real hosted browser actions. Requires a real Twitch checkpoint command during capture.
Captions are editorial; the fixture and restricted runner are disclosed. No fake chat or results.
"""
import json,os,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts';OUT.mkdir(exist_ok=True)
URL='https://rejoin-production-bec2.up.railway.app'
marks=[];start=time.monotonic()
def caption(text):marks.append({'at':time.monotonic()-start,'text':text})
with sync_playwright() as p:
 browser=p.chromium.launch(**({'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
 ctx=browser.new_context(viewport={'width':1600,'height':1000},record_video_dir=str(OUT/'raw'),record_video_size={'width':1600,'height':1000});page=ctx.new_page();video=page.video;start=time.monotonic()
 page.goto(URL);page.wait_for_function("document.querySelector('#connection-badge')?.textContent.includes('TWITCH CONNECTED')")
 initial=page.locator('.stream-current strong').inner_text();assert initial.startswith('C3'),initial
 print('RECORDING READY: send !checkpoint C2 in the real Twitch chat now.',flush=True)
 page.wait_for_function("document.querySelector('.stream-current strong')?.textContent.startsWith('C2')",timeout=240000)
 event=time.monotonic()-start
 marks.append({'at':max(0,event-4),'text':'REJOIN — Keep your place in a live coding workshop. Prepared RSVP lesson; real Twitch events.'})
 caption('The broadcaster just sent !checkpoint C2 in Twitch. The live checkpoint updates without replacing learner code.');page.wait_for_timeout(7000)
 page.get_by_role('button',name='index.html').click();page.locator('#code').fill(page.locator('#code').input_value().replace('Late Night Builders','My Community Hangout'));caption('A beginner personalizes the event title. Recovery should preserve that work.');page.wait_for_timeout(5000)
 page.get_by_role('button',name='script.js').click();page.get_by_role('button',name='✧ Help me continue →').click();caption('The prepared defect is a missing click binding. Help starts with an explicit choice.');page.wait_for_timeout(4000)
 page.get_by_role('button',name='Ask AI about my code').click();page.locator('details').last.click();caption('Only the reviewed script and question go to OpenAI. No code is sent before consent.');page.wait_for_timeout(5000)
 page.locator('#ai-question').fill('Why does my RSVP button not respond? Explain the next step.');page.locator('#ai-agree').check();page.get_by_role('button',name='Ask AI',exact=True).click();caption('A real OpenAI request gives guidance. The model cannot apply edits or certify success.')
 page.get_by_role('heading',name='One step at a time.').wait_for(timeout=55000);page.wait_for_timeout(5000)
 page.get_by_role('button',name='Review a suggested fix →').click();caption('Trusted workshop code proposes the small change. HTML, styles and personal text remain unchanged.');page.wait_for_timeout(5000)
 page.get_by_role('button',name='Check suggestion',exact=True).click();page.wait_for_function("document.querySelector('#candidate-result')?.textContent.includes('checks passed')");caption('Behavioral checks run on a temporary candidate. Approval is bound to the exact reviewed revision.');page.wait_for_timeout(4000)
 page.get_by_role('button',name='Approve & apply this fix →').click();page.frame_locator('#preview').get_by_role('button',name='Save my spot').click();caption('The RSVP now works, and My Community Hangout is preserved. This verifies behavior, not mastery.');page.locator('#preview').scroll_into_view_if_needed();page.wait_for_timeout(6000)
 page.get_by_role('button',name='Keep building →').click();page.locator('#code').fill(page.locator('#code').input_value()+'\n// New work after recovery');page.get_by_role('button',name='↶ Undo last fix').click();caption('Undo protects newer edits by offering a separate pre-fix copy. Nothing is silently discarded.');page.wait_for_timeout(6000);page.get_by_role('button',name='Close',exact=True).click()
 # Separate, explicitly prepared learner cases; local storage only.
 page.evaluate("async()=>{const c=await import('/core.js');localStorage.setItem('rejoin.workspace',JSON.stringify({files:{...c.starter,'script.js':c.alternative},protections:['style.css']}));}");page.reload();page.wait_for_timeout(500)
 page.get_by_role('button',name='✧ Help me continue →').click();page.get_by_role('button',name='Show me an authored hint →').click();page.get_by_role('button',name='Review a suggested fix →').click();caption('Prepared learner B uses a valid alternative: onclick. Rejoin accepts it without rewriting.');page.wait_for_timeout(6000)
 page.evaluate("async()=>{const c=await import('/core.js');localStorage.setItem('rejoin.workspace',JSON.stringify({files:c.starter,protections:['script.js']}));}");page.reload();page.wait_for_timeout(500)
 page.get_by_role('button',name='✧ Help me continue →').click();page.get_by_role('button',name='Show me an authored hint →').click();page.get_by_role('button',name='Review a suggested fix →').click();caption('Prepared learner C protects the file containing the defect. Rejoin refuses to overwrite it.');page.wait_for_timeout(6000)
 page.get_by_role('button',name='Prepare a help packet').click();page.locator('#question').fill('Please help me understand the event binding without replacing my work.');page.get_by_role('button',name='Review exact packet').click();caption('Human handoff is also private: select files, review redacted content, then choose whom to share it with.');page.wait_for_timeout(6000);page.get_by_role('button',name='Cancel',exact=True).click()
 page.goto(URL+'/?overlay=1');page.wait_for_function("document.querySelector('.overlay')?.textContent.includes('Connected')");caption('The public OBS overlay shows the live checkpoint. Small cohorts stay hidden; learner code never appears.');page.wait_for_timeout(6000)
 caption('Built with OpenAI Codex. 25 automated tests, 30 versioned cases, three reference checkpoints. Source: github.com/ankitlade12/rejoin');page.wait_for_timeout(6000)
 # Remove only the recording guest.
 page.evaluate("async()=>{const s=await(await fetch('/api/session')).json();await fetch('/api/session',{method:'DELETE',headers:{'X-CSRF-Token':s.csrf}})}")
 await_end=time.monotonic()-start;ctx.close();path=video.path();browser.close()
 (OUT/'recording.json').write_text(json.dumps({'raw':str(path),'trimStart':max(0,event-4),'end':await_end,'captions':marks,'notice':'Real hosted actions and OpenAI response; real Twitch event. B/C are disclosed prepared fixtures, not human research participants.'},indent=2))
 print('RECORDING COMPLETE: '+str(path),flush=True)
