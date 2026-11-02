import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyCatalog} from '../scripts/verify-catalog.mjs';
test('activation smoke waits for the exact catalog even after stale HTTP 200',async()=>{
 const expected={current:{deck:'deck/v1'}},urls=[];let waits=0;
 await verifyCatalog('https://example.test/materials/',expected,{pause:async()=>{waits++},request:async url=>{
  urls.push(url.href);return Response.json(urls.length===1?{current:{}}:expected);
 }});
 assert.equal(waits,1);assert.equal(urls.length,2);assert.notEqual(urls[0],urls[1]);assert.match(urls[0],/\/materials\/catalog.json\?verify=/);
});
test('catalog smoke retries unavailable responses but rejects persistent mismatches',async()=>{
 let calls=0;await verifyCatalog('https://example.test/',{ok:true},{pause:async()=>{},request:async()=>++calls===1?new Response('',{status:503}):Response.json({ok:true})});assert.equal(calls,2);
 calls=0;await assert.rejects(verifyCatalog('https://example.test/',{current:{deck:'deck/v1'}},{attempts:3,pause:async()=>{},request:async()=>{calls++;return Response.json({current:{}})}}),/Catalog mismatch/);assert.equal(calls,3);
});
