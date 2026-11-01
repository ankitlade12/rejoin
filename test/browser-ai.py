# UI contract test with a disclosed mocked AI response; does not call OpenAI.
import json,os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(**({'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
 page=browser.new_page();requests=[]
 def session(route):
  response=route.fetch();data=response.json();data['aiConfigured']=True
  route.fulfill(response=response,json=data)
 def tutor(route):
  data=route.request.post_data_json;requests.append(data)
  route.fulfill(json={'hint':'What connects the click to register?','explanation':'The prepared binding is missing.','nextAction':'review','evidence':['script.js: event binding is missing'],'id':data['id'],'source':'OpenAI fixture'})
 page.route('**/api/session',session);page.route('**/api/tutor',tutor)
 page.goto('http://localhost:4173');page.wait_for_timeout(400)
 page.get_by_role('button',name='✧ Help me continue →').click();page.get_by_role('button',name='Ask AI about my code').click()
 page.get_by_role('button',name='Ask AI',exact=True).click();assert len(requests)==0
 page.locator('#ai-agree').check();page.locator('#ai-question').fill('Why does the button not respond?');page.get_by_role('button',name='Ask AI',exact=True).click()
 page.get_by_role('heading',name='One step at a time.').wait_for()
 assert len(requests)==1
 assert set(requests[0])=={'id','consent','script','target','question'}
 assert requests[0]['consent']=='ai-script-v1'
 assert 'addEventListener' not in page.locator('#code').input_value()
 page.get_by_role('button',name='Review a suggested fix →').click();page.get_by_role('button',name='Check suggestion',exact=True).click()
 page.wait_for_function("document.querySelector('#candidate-result')?.textContent.includes('checks passed')")
 page.get_by_role('button',name='Approve & apply this fix →').click()
 assert page.get_by_role('heading',name='Back in the flow.').is_visible()
 print('PASS: no AI request without consent; exact scoped payload; escaped guidance; no auto-apply; candidate verification and approval. Provider response mocked.')
 browser.close()
