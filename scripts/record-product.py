"""Capture a product walkthrough with real hosted UI and explicitly authorized Twitch commands.
Requires TWITCH_CLIENT_ID, TWITCH_ACCESS_TOKEN, REJOIN_HOST_PASSWORD. Never prints credentials.
"""
import json,os,time,urllib.request,urllib.error
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/product';URL='https://rejoin-production-bec2.up.railway.app';scenes=json.loads((OUT/'narration.json').read_text());timeline=[];pages={};contexts={};starts={}
def twitch(url,body=None):
 headers={'Authorization':('OAuth ' if '/validate' in url else 'Bearer ')+os.environ['TWITCH_ACCESS_TOKEN'],'Client-Id':os.environ['TWITCH_CLIENT_ID'],'Content-Type':'application/json'}
 req=urllib.request.Request(url,data=json.dumps(body).encode() if body else None,headers=headers,method='POST' if body else 'GET')
 with urllib.request.urlopen(req,timeout=15) as response:return json.load(response)
identity=twitch('https://id.twitch.tv/oauth2/validate');assert identity['login']=='ankitlade12' and 'user:write:chat' in identity['scopes']
def send_chat(command):
 assert command in ['!checkpoint C1','!checkpoint C2','!checkpoint C3','!pause','!rejoin','!stuck','!ready']
 result=twitch('https://api.twitch.tv/helix/chat/messages',{'broadcaster_id':identity['user_id'],'sender_id':identity['user_id'],'message':command});assert result['data'][0]['is_sent'],str(result['data'][0].get('drop_reason'));print('SENT '+command,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(**({'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
 def create(name):
  ctx=b.new_context(viewport={'width':1600,'height':1000},record_video_dir=str(OUT/'raw'),record_video_size={'width':1600,'height':1000});contexts[name]=ctx;return ctx
 hc=create('host');s=hc.request.get(URL+'/api/session').json();login=hc.request.post(URL+'/api/login',headers={'Origin':URL,'X-CSRF-Token':s['csrf']},data={'password':os.environ['REJOIN_HOST_PASSWORD']});assert login.ok;host_csrf=login.json()['csrf'];original=hc.request.get(URL+'/api/room').json()
 def host_action(action,**values):
  r=hc.request.post(URL+'/api/host',headers={'Origin':URL,'X-CSRF-Token':host_csrf},data={'action':action,**values});assert r.ok,r.status;return r.json()
 create('learner');create('chat')
 for name,ctx in contexts.items():
  page=ctx.new_page();starts[name]=time.monotonic();pages[name]=page
 host=pages['host'];learner=pages['learner'];chat=pages['chat']
 host.goto(URL+'/?host=1');host.get_by_role('button',name='Publish a teaching note').wait_for()
 learner.goto(URL);learner.wait_for_function("document.querySelector('.fineprint')?.textContent.includes('AI help available')")
 chat.goto('https://www.twitch.tv/popout/ankitlade12/chat?popout=',wait_until='domcontentloaded');chat.wait_for_timeout(3000)
 if chat.get_by_role('button',name='Proceed',exact=True).count():chat.get_by_role('button',name='Proceed',exact=True).click()
 host_action('checkpoint',checkpoint='C2');host_action('chat-replies',enabled=True)
 def capture(scene,source,action):
  page=pages[source];page.bring_to_front();page.wait_for_timeout(250);start=time.monotonic();print('RECORD '+scene['id'],flush=True);action();elapsed=time.monotonic()-start;page.wait_for_timeout(max(0,(scene['duration']+0.7-elapsed)*1000));timeline.append({**scene,'source':source,'start':start-starts[source],'duration':time.monotonic()-start})
 def instructor():
  host.get_by_role('button',name='C1 · Make it yours').click();host.wait_for_timeout(1000);host.get_by_role('button',name='C2 · Wire up the RSVP').click();host.get_by_role('button',name='Publish a teaching note').click();host.locator('#note-checkpoint').select_option('C2');host.locator('#host-note').fill('Connect the click event to your registration function. Keep your personal title and styling.');host.wait_for_timeout(1800);host.get_by_role('button',name='Publish note',exact=True).click();host.wait_for_timeout(2000);host.get_by_role('heading',name='Community pulse',exact=False).count()
 def commands():
  for command in ['!checkpoint C1','!checkpoint C2','!checkpoint C3','!pause','!rejoin','!stuck','!ready']:
   send_chat(command);chat.get_by_text(command,exact=True).last.wait_for(timeout=12000);chat.wait_for_timeout(700)
  # Only real public Twitch messages appear in this view; no synthetic chat is injected.
  chat.wait_for_timeout(2000);host_action('checkpoint',checkpoint='C2')
 def workspace():
  learner.goto(URL+'/?join=1');learner.get_by_role('button',name='Start privately →').click();learner.get_by_role('button',name='index.html').click();learner.locator('#code').fill(learner.locator('#code').input_value().replace('Late Night Builders','My Community Hangout'));learner.wait_for_timeout(1200);learner.get_by_role('button',name='style.css').click();learner.wait_for_timeout(1200);learner.get_by_role('button',name='script.js').click()
 def help_flow():
  learner.get_by_role('button',name='✧ Help me continue →').click();learner.wait_for_timeout(1200);learner.get_by_role('button',name='Ask AI about my code').click();learner.locator('#dialog summary').click();learner.wait_for_timeout(1700);learner.locator('#ai-question').fill('Why is my RSVP button not responding? Help me understand the next step.');learner.locator('#ai-agree').check();learner.get_by_role('button',name='Ask AI',exact=True).click();learner.get_by_role('heading',name='One step at a time.').wait_for(timeout=55000)
 def repair():
  learner.get_by_role('button',name='Review a suggested fix →').click();learner.locator('.full-diff summary').click();learner.wait_for_timeout(1800);learner.locator('.full-diff summary').click();learner.get_by_role('button',name='Check suggestion',exact=True).click();learner.wait_for_function("document.querySelector('#candidate-result')?.textContent.includes('checks passed')");learner.wait_for_timeout(1700);learner.get_by_role('button',name='Approve & apply this fix →').click();learner.frame_locator('#preview').get_by_role('button',name='Save my spot').click();learner.locator('#preview').scroll_into_view_if_needed()
 def protection():
  learner.get_by_role('button',name='Keep building →').click();learner.get_by_role('button',name='script.js').click();learner.locator('#code').fill(learner.locator('#code').input_value().replace("button.addEventListener('click', register);",'button.onclick = register;')+'\n// My own approach');learner.get_by_role('button',name='◇ Protect file').click();learner.wait_for_timeout(1700);learner.get_by_role('button',name='✧ Help me continue →').click();learner.get_by_role('button',name='Show me an authored hint →').click();learner.get_by_role('button',name='Review a suggested fix →').click();learner.wait_for_timeout(2000);learner.get_by_role('button',name='Back to my workspace').click();learner.get_by_role('button',name='↶ Undo last fix').click();learner.wait_for_timeout(2000);learner.get_by_role('button',name='Close',exact=True).click()
 def handoff():
  learner.get_by_role('button',name='Prepare a question for the host').click();learner.locator('#question').fill('Can you explain the event listener without replacing my changes?');learner.get_by_role('button',name='Review exact packet').click();learner.wait_for_timeout(2000);learner.get_by_role('button',name='Cancel',exact=True).click();learner.get_by_role('button',name='↓ Export project').click();learner.get_by_role('button',name='Privacy and settings',exact=True).click();learner.wait_for_timeout(1500);learner.get_by_role('button',name='Close',exact=True).click();learner.get_by_role('button',name='Download recovery receipt').click()
 def privacy():
  learner.get_by_role('button',name='Link Twitch & sharing').click();learner.locator('#progress').select_option('building');learner.locator('#progress-checkpoint').select_option('C2');learner.locator('#progress-blocker').select_option('binding');learner.wait_for_timeout(2500);learner.get_by_role('button',name='Close',exact=True).click();learner.goto(URL+'/?overlay=1');learner.wait_for_function("document.querySelector('.overlay')?.textContent.includes('Connected')")
 def ending():
  host_action('end');learner.goto(URL);learner.get_by_role('button',name='Continue in personal practice').click();learner.get_by_role('button',name='Lesson guide',exact=True).click();learner.wait_for_timeout(2200);learner.get_by_role('button',name='Workspace',exact=True).click();learner.evaluate('scrollTo(0,0)')
 actions={'problem':('learner',lambda:learner.evaluate('scrollTo(0,0)')),'need':('learner',lambda:learner.locator('#preview').scroll_into_view_if_needed()),'instructor':('host',instructor),'commands':('chat',commands),'workspace':('learner',workspace),'help':('learner',help_flow),'repair':('learner',repair),'protection':('learner',protection),'handoff':('learner',handoff),'privacy':('learner',privacy),'ending':('learner',ending)}
 try:
  for scene in scenes:capture(scene,*actions[scene['id']])
 finally:
  host_action('checkpoint',checkpoint=original['checkpoint']);host_action('note',note=original.get('note',''),checkpoint=original.get('noteCheckpoint',original['checkpoint']));host_action('chat-replies',enabled=False)
  if original.get('ended'):host_action('end')
  elif original.get('paused'):host_action('pause')
  paths={name:str(page.video.path()) for name,page in pages.items()}
  for name in ['learner','host']:
   ctx=contexts[name];session=ctx.request.get(URL+'/api/session').json();ctx.request.delete(URL+'/api/session',headers={'Origin':URL,'X-CSRF-Token':session['csrf']})
  for ctx in contexts.values():ctx.close()
  (OUT/'timeline.json').write_text(json.dumps({'scenes':timeline,'videos':paths,'commandsWereReal':True,'voice':'Aman, Indian English male, synthesized locally','subtitles':False},indent=2));b.close()
 print('PRODUCT CAPTURE COMPLETE',flush=True)
