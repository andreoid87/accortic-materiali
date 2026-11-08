import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createServer} from 'node:http';
import {chromium,expect} from '@playwright/test';
import {buildReaders} from '../scripts/reader-v1.mjs';

test('permalinks follow activated publications, preserve slide IDs and handle missing slides',async()=>{
 const root=await mkdtemp(join(tmpdir(),'accortic-permalinks-')),out=join(root,'site');
 let browser,server;
 try{
  await cp('runtime',join(root,'runtime'),{recursive:true});
  const html=(ids,version)=>`<!doctype html><html><head><link rel="stylesheet" href="slides.css"></head><body data-slide-width="960" data-slide-height="540"><header><h1>Fixture</h1><label>Slide<select id="selection">${ids.map(id=>`<option value="${id}">${id}</option>`).join('')}</select></label><button id="zoom">Ingrandisci</button></header><main>${ids.map(id=>`<section class="slide" id="${id}"><div class="viewport"><div class="surface"><div class="canvas">${id} ${version}</div></div></div></section>`).join('')}</main><script src="player.js"></script></body></html>`;
  for(const [version,ids] of [[1,['alpha','beta','removed']],[2,['beta','alpha']]]){
   const path=join(root,'releases/deck/v'+version);await mkdir(path,{recursive:true});
   await writeFile(join(path,'index.html'),html(ids,version));
   await writeFile(join(path,'slides.css'),'header{display:flex;flex-wrap:wrap} .viewport{width:100%;overflow:auto}.canvas{width:960px;height:540px} section[hidden]{display:none}');
  }
  const catalog={releases:['deck/v1','deck/v2'],current:{deck:'deck/v1'}};
  await buildReaders(catalog,out,root);await writeFile(join(out,'catalog.json'),JSON.stringify(catalog));
  const first=await readFile(join(out,'slides/deck/index.html'),'utf8');
  assert(first.includes('alpha 1'),'Published text must be in the initial HTML for native language detection');assert(!first.includes('alpha 2'),'Queued publication leaked');
  const historical=await readFile(join(out,'reader/v1/deck/v1/index.html'));
  const source=await readFile(join(root,'releases/deck/v1/index.html'));
  server=createServer(async(req,res)=>{
   try{
    const path=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\/accortic-materiali\//,'');
    const file=resolve(out,path+(path.endsWith('/')?'index.html':''));
    if(!file.startsWith(out+sep))throw Error('Invalid path');
    const content=await readFile(file).catch(()=>readFile(resolve(root,'releases',path)));
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(content);
   }catch{res.writeHead(404);res.end('Presentazione non disponibile');}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}/accortic-materiali/`;
  browser=await chromium.launch({channel:process.env.CI?undefined:'msedge'});
  const page=await browser.newPage();
  await page.addInitScript(()=>{
   window.originalPermalinkDocument=document;
   Document.prototype.open=Document.prototype.write=()=>{throw Error('Browser document must be preserved for native Translate');};
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const link=base+'slides/deck/#alpha';
  await page.goto(link);await expect(page.locator('section.slide:visible')).toHaveText('alpha 1');
  // Activate the second immutable version, with a different order and one removal.
  catalog.current.deck='deck/v2';await buildReaders(catalog,out,root);await writeFile(join(out,'catalog.json'),JSON.stringify(catalog));
  assert((await readFile(join(out,'slides/deck/index.html'),'utf8')).includes('alpha 2'));
  // Deliberately serve a cached v1 entry while the catalog points at v2.
  await page.route(base+'slides/deck/',route=>route.fulfill({contentType:'text/html',body:first}));await page.reload();
  assert.equal(page.url(),link);await expect(page.locator('section.slide:visible')).toHaveText('alpha 2');
  await expect(page.locator('#reader-position')).toHaveText('2 / 2');assert(await page.evaluate(()=>document===window.originalPermalinkDocument));
  await page.getByRole('button',{name:'Precedente'}).click();await expect(page).toHaveURL(/#beta$/);
  await expect(page.locator('section.slide:visible')).toHaveText('beta 2');
  for(const id of ['removed','unknown','%E0%A4%A']){
   await page.goto(base+'slides/deck/#'+id);await expect(page.locator('#reader-status')).toContainText('Slide non disponibile');
   await expect(page.locator('section.slide:visible')).toHaveCount(0);await expect(page.locator('#reader-next')).toBeDisabled();
   await page.locator('#selection').selectOption('alpha');await expect(page.locator('section.slide:visible')).toHaveText('alpha 2');
  }
  for(const width of [390,1366]){
   await page.setViewportSize({width,height:844});await page.goto(link);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await expect.poll(async()=>(await page.locator('section.slide:visible .canvas').boundingBox()).width).toBeLessThanOrEqual(width);
   await page.locator('#reader-fullscreen').click();await expect(page.locator('#reader-fullscreen')).toHaveAttribute('aria-pressed','true');
   await page.locator('#reader-fullscreen').click();await expect(page.locator('#reader-fullscreen')).toHaveAttribute('aria-pressed','false');
  }
  await page.goto(base+'reader/v1/deck/v1/#removed');await expect(page.locator('section.slide:visible')).toHaveText('removed 1');
  assert.deepEqual(await readFile(join(out,'reader/v1/deck/v1/index.html')),historical);
  assert.deepEqual(await readFile(join(root,'releases/deck/v1/index.html')),source);
  assert.equal((await page.goto(base+'slides/nonexistent/#alpha')).status(),404);
  await page.route('**/catalog.json?*',route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.goto(link);await expect(page.locator('#reader-status')).toContainText('non disponibile');
  await expect(page.locator('section.slide:visible')).toHaveCount(0);await page.unroute('**/catalog.json?*');
  await writeFile(join(out,'catalog.json'),JSON.stringify({...catalog,current:{}}));
  await page.reload();await expect(page.locator('#reader-status')).toContainText('non disponibile');
  await expect(page.locator('section.slide:visible')).toHaveCount(0);
  await writeFile(join(out,'catalog.json'),JSON.stringify(catalog));
  await page.unroute(base+'slides/deck/');
  const legacy='<!doctype html><html lang="it"><head><meta charset="utf-8"></head><body data-material-id="deck"><main id="permalink-status">Caricamento</main><script src="/accortic-materiali/slides/permalink.js"></script></body></html>';
  await page.route(base+'slides/deck/',route=>route.fulfill({contentType:'text/html',body:legacy}));
  await page.reload();await expect(page.locator('section.slide:visible')).toHaveText('alpha 2');
  assert(await page.evaluate(()=>document===window.originalPermalinkDocument));
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));assert(root.startsWith(resolve(tmpdir())+sep));await rm(root,{recursive:true,force:true});}
});
