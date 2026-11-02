import json,os,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('REJOIN_TEST_URL','http://localhost:4173')
fixtures=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {fixtures} from './test/fixtures.mjs';console.log(JSON.stringify(fixtures))"],text=True))
with sync_playwright() as p:
 browser=p.chromium.launch(**({'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
 context=browser.new_context(accept_downloads=True);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL);page.wait_for_function("document.querySelector('footer')?.textContent.includes('Twitch')")
 # Run the actual browser verifier against every supported fixture, and refuse every unsupported one.
 outcomes=page.evaluate('''async fixtures=>{const core=await import('/core.js'),{verify}=await import('/preview.js');const results=[];
 for(const f of fixtures){const plan=core.propose(f.files,f.target,f.protected||[]);if(f.stale){let refused=false;try{core.applyPlan({...f.files,[f.stale]:f.files[f.stale]+'changed'},plan);}catch{refused=true;}results.push({id:f.id,ok:refused});continue;}
 if(f.expected==='conflict'){results.push({id:f.id,ok:plan.state==='conflict'});continue;}
 const result=await verify(plan.state==='candidate'?plan.files:f.files,f.target);results.push({id:f.id,ok:result.passed===(f.pass===true),message:result.message});}return results;}''',fixtures)
 assert all(x['ok'] for x in outcomes),outcomes
 refs=page.evaluate('''async()=>{const c=await import('/core.js'),{verify}=await import('/preview.js');return await Promise.all([['C1',c.broken],['C2',c.fixed],['C3',c.complete]].map(async([id,script])=>({id,...await verify({...c.starter,'script.js':script},id)})));}''');assert all(r['passed'] for r in refs),refs
 assert not errors,errors
 print('PASS: 30 benchmark browser outcomes, all three instructor references, no false success',flush=True)
 def repair():
  page.get_by_role('button',name='✧ Help me continue →').click();page.get_by_role('button',name='Show me an authored hint →').click();page.get_by_role('button',name='Review a suggested fix →').click();page.get_by_role('button',name='Check suggestion',exact=True).click();page.wait_for_function("document.querySelector('#candidate-result')?.textContent.includes('checks passed')");page.get_by_role('button',name='Approve & apply this fix →').click()
 repair();assert page.get_by_role('heading',name='Back in the flow.').is_visible()
 page.locator('#code').fill('while(true){}');page.wait_for_timeout(350)
 assert page.get_by_role('heading',name='Back in the flow.').count()==0
 assert 'not yet' in page.locator('#positions').inner_text()
 with page.expect_download() as download:page.get_by_role('button',name='Download recovery receipt').click()
 receipt=json.loads(Path(download.value.path()).read_text());assert any(a['outcome']=='approved' for a in receipt['attempts']);assert receipt['currentRevisionVerified'] is None
 page.locator('#code').fill('const api_key = "FAKE_FIXTURE_SECRET_123456";');page.wait_for_timeout(350)
 page.get_by_role('button',name='Prepare a question for the host').click();page.locator('#question').fill('password="ANOTHER_FAKE_SECRET_123"');page.get_by_role('button',name='Review exact packet').click()
 preview=page.locator('[aria-label="Exact redacted help packet"]').inner_text();assert 'FAKE_FIXTURE' not in preview and 'ANOTHER_FAKE' not in preview and '[REDACTED]' in preview
 assert set(json.loads(preview)['files'])=={'script.js'}
 with page.expect_download() as download:page.get_by_role('button',name='Download reviewed packet').click()
 assert Path(download.value.path()).read_text()==preview
 page.evaluate("()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('fixture','QuotaExceededError')};}")
 page.locator('#code').fill('// unsaved fixture');page.wait_for_timeout(350);page.get_by_role('button',name='index.html').click();assert 'Save failed' in page.locator('#save-state').inner_text()
 page.evaluate('()=>{Storage.prototype.setItem=window.originalSet;}')
 page.get_by_role('button',name='Privacy and settings',exact=True).click();assert page.get_by_role('dialog',name='Your code. Your choice.').is_visible();picker=page.locator('#import');assert picker.is_visible();picker.focus();assert picker.evaluate('(e)=>e===document.activeElement');page.get_by_role('button',name='Close',exact=True).click()
 print('PASS: stale success cleared, receipt retains approved history, exact redacted packet, persistent save failure, keyboard-accessible import',flush=True)
 # Three independent learners: prepared defect, valid alternative, protected conflict.
 guests=[]
 for variant in ['broken','alternative','protected']:
  ctx=browser.new_context();tab=ctx.new_page();tab.goto(URL);tab.wait_for_timeout(200)
  if variant=='alternative':tab.locator('#code').fill(tab.evaluate("async()=> (await import('/core.js')).alternative"))
  if variant=='protected':tab.get_by_role('button',name='◇ Protect file').click()
  tab.get_by_role('button',name='✧ Help me continue →').click();tab.get_by_role('button',name='Show me an authored hint →').click();tab.get_by_role('button',name='Review a suggested fix →').click()
  expected={'broken':'A small fix.Your project intact.','alternative':'No rewrite needed.','protected':'Your protectioncomes first.'}[variant]
  assert tab.locator('#recovery-content h2').inner_text().replace('\n','')==expected
  guests.append((ctx,tab))
 print('PASS: three isolated learner states, repair / valid alternative / protected refusal',flush=True)
 # Scope notes and end behavior through the real local server, with test-only host password.
 host_context=browser.new_context();host=host_context.new_page();host.goto(URL+'/?host=1');host.get_by_role('button',name='Instructor sign in →').click();host.locator('#host-password').fill(os.environ.get('REJOIN_TEST_PASSWORD','test-only-password-123456'));host.get_by_role('button',name='Sign in',exact=True).click();host.get_by_role('button',name='Publish a teaching note').click();host.locator('#note-checkpoint').select_option('C2');host.locator('#host-note').fill('Review the event binding at C2.');host.get_by_role('button',name='Publish note',exact=True).click()
 page.get_by_text('Review the event binding at C2.',exact=True).wait_for();page.get_by_role('button',name='Dismiss note').click();assert page.get_by_text('Review the event binding at C2.',exact=True).count()==0
 host.get_by_role('button',name='End workshop',exact=True).click();page.get_by_text('The live workshop has ended.',exact=True).wait_for();page.get_by_role('button',name='Continue in personal practice').click();page.get_by_role('button',name='✧ Help me continue →').click();assert page.get_by_role('button',name='Show me an authored hint →').is_visible()
 host.get_by_role('button',name='Resume workshop',exact=True).click()
 print('PASS: checkpoint-linked note, note dismissal, end/continuation and resume',flush=True)
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 for tab in [page,host]+[t for _,t in guests]:
  tab.evaluate("async()=>{const s=await(await fetch('/api/session')).json();await fetch('/api/session',{method:'DELETE',headers:{'X-CSRF-Token':s.csrf}})}")
 Path('/tmp/rejoin-release-browser-results.json').write_text(json.dumps({'fixtures':outcomes,'references':refs,'consoleErrors':errors},indent=2))
 browser.close()
