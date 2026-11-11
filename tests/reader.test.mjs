import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parse} from 'parse5';
import {readerHtml} from '../scripts/reader-v1.mjs';
import {walk,attr} from '../scripts/core.mjs';

test('every approved release gets a standalone view without changing its slide text or IDs',async()=>{
 const catalog=JSON.parse(await readFile('catalog.json','utf8'));
 for(const release of catalog.releases){
  const source=await readFile('releases/'+release+'/index.html','utf8'),output=readerHtml(source,release);
  const collect=html=>{const ids=[],text=[];walk(parse(html),node=>{if(node.tagName==='section'&&(attr(node,'class')??'').split(' ').includes('slide'))ids.push(attr(node,'id'));if(node.nodeName==='#text'&&node.parentNode?.tagName!=='script'&&node.parentNode?.tagName!=='style')text.push(node.value);});return{ids,text};};
  assert.deepEqual(collect(output).ids,collect(source).ids);
  // Every original text node survives, in the original order; controls only add text.
  const after=collect(output).text;let index=0;for(const value of collect(source).text){index=after.indexOf(value,index);assert(index>=0,'Original text missing');index++;}
  assert(output.includes('reader/v1/player.js'));assert(output.includes('reader-fullscreen'));assert(!output.includes('<iframe'));
  assert(output.includes('/accortic-materiali/'+release+'/slides.css'));
  assert.equal(await readFile('releases/'+release+'/index.html','utf8'),source);
 }
});
test('unrecognized reader resources or conflicting IDs fail before publication',()=>{
 const html='<html><head><link rel="stylesheet" href="slides.css"></head><body><header></header><main></main><script src="player.js"></script></body></html>';
 assert.throws(()=>readerHtml(html,'../escape/v1'));
 assert.throws(()=>readerHtml(html.replace('player.js','evil.js'),'interno-pc/v4'));
 assert.throws(()=>readerHtml(html.replace('<main>','<main id="reader-next">'),'interno-pc/v4'));
});


test('permanent views permit only same-origin catalog reads and preserve every other release policy',async()=>{
 const catalog=JSON.parse(await readFile('catalog.json','utf8'));
 const policy=html=>{let value;walk(parse(html),node=>{if(node.tagName==='meta'&&attr(node,'http-equiv')?.toLowerCase()==='content-security-policy')value=attr(node,'content');});return value;};
 for(const release of catalog.releases){
  const source=await readFile('releases/'+release+'/index.html','utf8'),original=policy(source);
  assert(original.includes("connect-src 'none'"));
  assert.equal(policy(readerHtml(source,release)),original,'Historical connection policy changed');
  const permanent=readerHtml(source,release,{id:release.split('/')[0],resolverHash:'a'.repeat(64)});
  assert.equal(policy(permanent),original.replace("connect-src 'none'","connect-src 'self'"));
  assert.equal(await readFile('releases/'+release+'/index.html','utf8'),source);
 }
});

test('fullscreen v2 keeps legacy v1 views unchanged',async()=>{
 const catalog=JSON.parse(await readFile('catalog.json','utf8'));
 const release=catalog.current['periferiche-memorie-massa-google-slides-20261101'];
 const source=await readFile('releases/'+release+'/index.html','utf8');
 const v1=readerHtml(source,release),v2=readerHtml(source,release,undefined,'reader/v2');
 assert(v1.includes('/reader/v1/player.js'));assert(!v1.includes('data-reader-version="2"'));
 assert(v2.includes('/reader/v2/player.js'));assert(v2.includes('/reader/v2/reader.css'));
 assert(v2.includes('data-reader-version="2"'));
 assert.equal((v1.match(/<section /g)||[]).length,(v2.match(/<section /g)||[]).length);
});
