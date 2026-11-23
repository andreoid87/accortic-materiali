import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateHtml,CSP,PREVIOUS_CSP,LEGACY_CSP} from '../scripts/core.mjs';

const manifest={width:960,height:540,slideOrder:['slide-a'],assets:[]};
const wrap=(marker,policy=CSP)=>`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"><link rel="stylesheet" href="slides.css"></head><body data-slide-width="960" data-slide-height="540"><section class="slide" id="slide-a">${marker}</section><script src="player.js"></script></body></html>`;
const id='miniapp-11111111-1111-4111-8111-111111111111';
const marker=(url)=>`<div data-accortic-miniapp="v1" data-accortic-object="miniapp" data-accortic-miniapp-id="${id}" data-accortic-miniapp-title="Simulatore" data-accortic-miniapp-url="${url}" style="position:absolute;width:440px;height:270px"><p>Miniapp</p></div>`;

test('published material allows only typed, owner-hosted, versioned Miniapp markers',()=>{
 const valid='https://accortic-b69ab.web.app/miniapp/concetto/v1/';
 assert.doesNotThrow(()=>validateHtml(wrap(marker(valid)),manifest));
 assert.doesNotThrow(()=>validateHtml(wrap(marker('https://accordino.it/miniapp/concetto/v24/')),manifest));
 assert.doesNotThrow(()=>validateHtml(wrap(marker('https://andreoid87.github.io/accortic-miniapps/miniapp/concetto/v1/')),manifest));
 assert.doesNotThrow(()=>validateHtml(wrap(marker('https://andreoid87.github.io/miniapp/concetto/v1/')),manifest));
 for(const bad of ['https://evil.invalid/miniapp/concetto/v1/','https://other-user.github.io/miniapp/concetto/v1/','https://andreoid87.github.io/some-repo/miniapp/concetto/latest/','https://andreoid87.github.io/some-repo/miniapp/concetto/v1/?x=1','http://accortic-b69ab.web.app/miniapp/concetto/v1/','https://accortic-b69ab.web.app/miniapp/concetto/latest/','https://accortic-b69ab.web.app/miniapp/concetto/v1/?session=1','javascript:alert(1)'])
  assert.throws(()=>validateHtml(wrap(marker(bad)),manifest),/Miniapp/);
 assert.doesNotThrow(()=>validateHtml(wrap(marker(valid),PREVIOUS_CSP),manifest),'Previous versioned Firebase releases remain valid');
 assert.throws(()=>validateHtml(wrap(marker(valid),LEGACY_CSP),manifest),/CSP/);
 assert.throws(()=>validateHtml(wrap(marker(valid)+marker(valid)),manifest),/Miniapp ID/);
 assert.throws(()=>validateHtml(wrap('<iframe src="'+valid+'"></iframe>'),manifest),/Unsupported HTML/);
 assert.throws(()=>validateHtml(wrap('<script src="evil.js"></script>'),manifest),/trusted external player/i);
});

test('historical releases with no Miniapp retain their original CSP and markup',()=>{
 assert.doesNotThrow(()=>validateHtml(wrap('<p>Vecchia slide</p>',LEGACY_CSP),manifest));
 assert.doesNotThrow(()=>validateHtml(wrap('<p>Nuova slide senza Miniapp</p>'),manifest));
});
