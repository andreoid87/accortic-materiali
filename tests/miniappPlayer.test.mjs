import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

test('LIM Miniapp expands and returns without reloading its sandboxed frame or losing input state',async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1366,height:850}});
 const url='https://accortic-b69ab.web.app/miniapp/synthetic/v1/';
 const body='<html><body style="margin:0"><button id="add" style="font-size:24px;padding:18px">Aumenta</button><output id="count">0</output><script>let n=0;document.querySelector("#add").addEventListener("click",()=>document.querySelector("#count").textContent=String(++n));</script></body></html>';
 try{
  await page.route(url,route=>route.fulfill({status:200,contentType:'text/html',body}));
  await page.setContent(`<!doctype html><html><body data-slide-width="960" data-slide-height="540"><header><select id="selection"><option value="s1">Prima</option></select><button id="zoom">Ingrandisci</button></header><main><section class="slide" id="s1"><div class="viewport"><div class="surface"><div class="canvas"><div data-accortic-miniapp="v1" data-accortic-miniapp-id="miniapp-11111111-1111-4111-8111-111111111111" data-accortic-miniapp-title="Simulazione" data-accortic-miniapp-url="${url}" style="position:absolute;top:80px;left:80px;width:500px;height:300px"></div></div></div></div></section></main></body></html>`);
  await page.addStyleTag({content:await readFile(new URL('../runtime/slides.css',import.meta.url),'utf8')});
  await page.addScriptTag({content:await readFile(new URL('../runtime/player.js',import.meta.url),'utf8')});
  const host=page.locator('[data-accortic-miniapp="v1"]');
  const iframe=host.locator('iframe');
  await iframe.waitFor();
  assert.equal(await iframe.getAttribute('sandbox'),'allow-scripts');
  assert.equal(await iframe.getAttribute('referrerpolicy'),'no-referrer');
  const frame=page.frameLocator('[data-accortic-miniapp="v1"] iframe');
  await frame.getByRole('button',{name:'Aumenta'}).click();
  assert.equal(await frame.locator('#count').textContent(),'1');
  await page.evaluate(()=>{globalThis.__initialMiniappFrame=document.querySelector('[data-accortic-miniapp] iframe');});
  await host.getByRole('button',{name:'Espandi per LIM'}).click();
  assert.match(await host.getAttribute('class')||'',/miniapp-expanded/);
  assert.equal(await page.evaluate(()=>globalThis.__initialMiniappFrame===document.querySelector('[data-accortic-miniapp] iframe')),true);
  const geometry=await host.boundingBox();
  assert(Math.abs(geometry.width-1366)<2,'Expanded host uses full viewport width');
  await frame.getByRole('button',{name:'Aumenta'}).click();
  assert.equal(await frame.locator('#count').textContent(),'2');
  await host.getByRole('button',{name:'Torna alla slide'}).click();
  assert.equal(await page.evaluate(()=>globalThis.__initialMiniappFrame===document.querySelector('[data-accortic-miniapp] iframe')),true);
  assert.equal(await frame.locator('#count').textContent(),'2');
  await host.getByRole('button',{name:'Espandi per LIM'}).click();
  await page.keyboard.press('Escape');
  assert.equal(await host.evaluate(el=>el.classList.contains('miniapp-expanded')),false);
 }finally{await browser.close();}
});
