import os
from playwright.sync_api import sync_playwright
# Run against the server with REJOIN_HOST_PASSWORD set to the test password below.
with sync_playwright() as p:
 browser=p.chromium.launch(**({'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
 learner_context=browser.new_context(viewport={'width':1440,'height':1100})
 page=learner_context.new_page();errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto('http://localhost:4173');page.wait_for_function("document.querySelector('.fineprint')?.textContent.includes('AI help available') || document.querySelector('footer')?.textContent.includes('Twitch not connected')")
 page.get_by_role('button',name='index.html').click()
 code=page.locator('#code');code.fill(code.input_value().replace('Late Night Builders','My Hackathon Hangout'))
 page.get_by_role('button',name='script.js').click()
 script=page.locator('#code').input_value()+'\n// A learner comment stays here'
 page.locator('#code').fill(script)
 page.get_by_role('button',name='✧ Help me continue →').click()
 page.get_by_role('button',name='Show me an authored hint →').click()
 page.get_by_role('button',name='Review a suggested fix →').click()
 page.get_by_role('button',name='Check suggestion',exact=True).click()
 page.wait_for_function("document.querySelector('#candidate-result')?.textContent.includes('checks passed')")
 page.get_by_role('button',name='Approve & apply this fix →').click()
 assert page.get_by_role('heading',name='Back in the flow.').is_visible()
 frame=page.frame_locator('#preview')
 frame.get_by_role('button',name='Save my spot').click()
 assert frame.get_by_role('button',name="You're on the list!").is_disabled()
 assert frame.get_by_role('heading',name='My Hackathon Hangout').is_visible()
 assert 'A learner comment stays here' in page.locator('#code').input_value()
 page.reload();page.wait_for_timeout(300)
 assert 'addEventListener' in page.locator('#code').input_value()
 # Undo after new edits must keep the current workspace intact.
 latest=page.locator('#code').input_value()+'\n// newer work'
 page.locator('#code').fill(latest)
 page.get_by_role('button',name='↶ Undo last fix').click()
 assert page.get_by_role('heading',name='Your newer edits are safe.').is_visible()
 assert page.locator('#code').input_value()==latest
 page.get_by_role('button',name='Close',exact=True).click()
 # Independent host session changes the room; learner text and target survive SSE.
 host_context=browser.new_context(viewport={'width':1440,'height':1000});host=host_context.new_page()
 host.goto('http://localhost:4173');host.wait_for_timeout(400)
 host.get_by_role('button',name='Instructor view',exact=True).click()
 host.get_by_role('button',name='Instructor sign in →').click()
 host.locator('#host-password').fill(os.environ.get('REJOIN_TEST_PASSWORD','test-only-password-123456'))
 host.get_by_role('button',name='Sign in',exact=True).click()
 host.get_by_role('button',name='C3 · Count your community').click()
 page.wait_for_function("document.querySelector('.stream-current strong').textContent.startsWith('C3')")
 assert page.locator('#code').input_value()==latest
 assert 'C2' in page.locator('.target-card strong').inner_text()
 host.get_by_role('button',name='Publish a teaching note').click()
 host.locator('#note-checkpoint').select_option('C2')
 host.locator('#host-note').fill('A function describes what; a listener describes when.')
 host.get_by_role('button',name='Publish note',exact=True).click()
 page.get_by_text('A function describes what; a listener describes when.').wait_for()
 host.get_by_role('button',name='Pause workshop',exact=True).click()
 page.wait_for_function("document.querySelector('footer').textContent.includes('paused')")
 page.get_by_role('button',name='✧ Help me continue →').click()
 assert 'paused' in page.locator('#toast').inner_text()
 host.get_by_role('button',name='Resume workshop',exact=True).click()
 # Sharing is explicit and independent of the host session.
 page.get_by_role('button',name='Community & privacy').click()
 assert not page.locator('#share-progress').is_checked()
 page.locator('#share-progress').check();page.locator('#progress').select_option('stuck')
 page.get_by_role('button',name='Save sharing choice').click()
 host.wait_for_function("document.querySelector('.host-grid')?.textContent.includes('1 learners sharing')")
 assert 'Breakdowns appear' in host.locator('.pulse-grid').inner_text()
 host.screenshot(path='/tmp/rejoin-host.png',full_page=True)
 page.get_by_role('button',name='Community & privacy').click();page.locator('#share-progress').uncheck();page.get_by_role('button',name='Save sharing choice').click()
 # Separate browser has no learner's customized files.
 host.get_by_role('button',name='Workspace',exact=True).click();host.get_by_role('button',name='index.html').click()
 assert 'My Hackathon Hangout' not in host.locator('#code').input_value()
 page.screenshot(path='/tmp/rejoin-desktop.png',full_page=True)
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(400);page.screenshot(path='/tmp/rejoin-mobile.png',full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 assert not errors,errors
 print('PASS: customizations, AST variant repair, actual RSVP, persistence, safe undo, authenticated host, live checkpoints/notes/pause, opt-in sharing/revocation, browser isolation, responsive layout; no page errors.')
 browser.close()
