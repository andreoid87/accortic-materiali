import test from 'node:test';
import assert from 'node:assert/strict';
import {validateHtml,CSP} from '../scripts/core.mjs';
const m={width:960,height:540,slideOrder:['p1'],assets:[]};
const shell=extra=>`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${CSP}"><link rel="stylesheet" href="slides.css"></head><body data-slide-width="960" data-slide-height="540"><section class="slide" id="p1">${extra}</section><script src="player.js"></script></body></html>`;
test('native editor typography/table/SVG and static inline stylesheet pass without executable content',()=>validateHtml(shell('<style>.canvas{width:960px;color:#123} @media print{.canvas{opacity:1}}</style><h2>Title</h2><ul><li><strong>Text</strong></li></ul><table><thead><tr><th>Column</th></tr></thead></table><svg><defs><marker id="arrow"></marker></defs><path marker-end="url(#arrow)"></path></svg>'),m));
test('editor styles cannot load remote CSS, escape checks, redirect or add active/SVG resources',()=>{
 for(const extra of ['<style>@import "https://evil.invalid/a";</style>','<style>.x{background:url(https://evil.invalid/a)}</style>','<style>@font-face{font-family:x;src:local(x)}</style>','<style>.x{width:expression(alert(1))}</style>','<style>.x{background:u\\72l(https://evil.invalid/a)}</style>','<svg><path marker-end="url(https://evil.invalid/a)"></path></svg>','<svg><path href="https://evil.invalid/a"></path></svg>','<svg><path xlink:href="#a"></path></svg>','<div srcdoc="secret"></div>','<img srcset="https://evil.invalid/a">','<meta http-equiv="Refresh" content="0;https://evil.invalid">'])assert.throws(()=>validateHtml(shell(extra),m),extra);
});
