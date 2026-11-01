import test from 'node:test';
import assert from 'node:assert/strict';
import {tutor} from '../lib/ai.mjs';
import {broken} from '../dist/core.js';
test('real SDK adapter sends only approved context, requests structured output, disables storage and validates returned evidence',async()=>{
 let request;
 const fetch=async(url,options)=>{request=JSON.parse(options.body);return new Response(JSON.stringify({id:'resp_fixture',object:'response',created_at:1,status:'completed',model:'gpt-5-mini',output:[{id:'msg_fixture',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:JSON.stringify({hint:'What connects a click to register?',explanation:'The handler exists; the prepared event binding is missing.',nextAction:'review',evidence:['E1','E2']}),annotations:[]}]}],usage:{input_tokens:40,output_tokens:40,total_tokens:80,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}}),{headers:{'Content-Type':'application/json'}});};
 const result=await tutor({consent:'ai-script-v1',script:broken,question:'Why?',target:'C2'},AbortSignal.timeout(2000),{apiKey:'fixture-key',fetch});
 assert.equal(request.store,false);assert.equal(request.text.format.type,'json_schema');assert.equal(request.max_output_tokens,1800);assert.ok(!JSON.stringify(request).includes('fixture-key'));assert.equal(result.nextAction,'review');assert.ok(result.evidence[0].includes('binding is missing'));
});
