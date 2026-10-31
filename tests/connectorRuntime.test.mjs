import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSource,validateAsset,digest} from '../scripts/core.mjs';
test('structured sources require exact bound hash, preserving existing Drive sources',()=>
{
    validateSource({source:{presentationId:'legacy',revision:'1',project:{uri:'https://drive.google.com/file/d/legacy/view'}}});
    const m={source:{presentationId:'new',revision:'1',project:{format:'accortic-slide-blocks-v1',uri:'urn:accortic:slides:sha256:'+'a'.repeat(64)}},approval:{sourceSha256:'a'.repeat(64)}};
    validateSource(m);m.approval.sourceSha256='b'.repeat(64);assert.throws(()=>validateSource(m),/hash/);
    m.source.project={format:'unexpected',uri:'https://evil.invalid/'};assert.throws(()=>validateSource(m),/Drive/);
});
test('private native GrapesJS sources bind the exact hash without changing legacy Drive provenance',()=>{
 const m={source:{presentationId:'native',revision:'2',project:{format:'accortic-grapes-v1',uri:'urn:accortic:slides:sha256:'+'c'.repeat(64)}},approval:{sourceSha256:'c'.repeat(64)}};
 validateSource(m);m.approval.sourceSha256='d'.repeat(64);assert.throws(()=>validateSource(m),/hash/);
 m.source.project.uri='https://drive.google.com/file/d/original/view';validateSource(m);
 m.source.project={format:'unrecognized',uri:'urn:accortic:slides:sha256:'+'d'.repeat(64)};assert.throws(()=>validateSource(m),/Drive/);
});
test('image signature, MIME, extension and content hash must agree; no SVG/HTML',()=>
{
    const b=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64');
    const asset={mime:'image/png',path:'assets/'+digest(b).slice(0,20)+'.png'};validateAsset(asset,b);
    assert.throws(()=>validateAsset({...asset,mime:'image/jpeg'},b));assert.throws(()=>validateAsset({...asset,path:'assets/'+'0'.repeat(20)+'.png'},b));
    assert.throws(()=>validateAsset({...asset,mime:'image/svg+xml'},Buffer.from('<svg/>')));
});
test('new connector runtimes have explicit approved hashes and old runtime remains trusted',async()=>
{
    const approved=JSON.parse(await readFile(new URL('../runtime/approved.json',import.meta.url)));
    for(const file of ['player.js','slides.css'])for(const prefix of ['','connector-'])assert(approved[file].includes(digest(await readFile(new URL('../runtime/'+prefix+file,import.meta.url)))));
});
