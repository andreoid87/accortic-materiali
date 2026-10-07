import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {validateRepository} from './validate.mjs';
const c=await validateRepository(),out='.site';await mkdir(out,{recursive:true});
// Fresh CI checkout has no previous build directory; never prune source releases.
for(const release of c.releases)await cp(join('releases',release),join(out,release),{recursive:true});
await cp('catalog.json',join(out,'catalog.json'));await writeFile(join(out,'.nojekyll'),'');
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const links=[];for(const [id,path]of Object.entries(c.current)){const m=JSON.parse(await readFile(join('releases',path,'material.json'),'utf8'));links.push(`<li><a href="${path}/">${escape(m.title)}</a> · versione ${m.version}</li>`);}
await writeFile(join(out,'index.html'),`<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Materiali AccorTIC</title></head><body><h1>Materiali AccorTIC</h1>${links.length?'<ul>'+links.join('')+'</ul>':'<p>Materiali in preparazione.</p>'}</body></html>`);
