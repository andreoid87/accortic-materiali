import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {digest} from './core.mjs';
import {verifyCatalog} from './verify-catalog.mjs';
const base=process.argv[2];if(!base?.startsWith('https://'))throw Error('HTTPS Pages base URL required');
const c=JSON.parse(await readFile('catalog.json','utf8')),report=[];
async function get(url){for(let attempt=0;attempt<5;attempt++){const r=await fetch(url,{headers:{'Cache-Control':'no-cache'}});if(r.ok)return r;await new Promise(resolve=>setTimeout(resolve,5000));}throw Error('Remote unavailable: '+url);}
for(const release of c.releases){const local=await readFile(join('releases',release,'material.json')),remote=Buffer.from(await(await get(new URL(release+'/material.json',base))).arrayBuffer());assert(local.equals(remote),'Remote manifest mismatch');const m=JSON.parse(local);
 let total=remote.length;const assets=[];for(const f of m.files){const r=await get(new URL(release+'/'+f.path,base)),body=Buffer.from(await r.arrayBuffer());assert(digest(body)===f.sha256,'Remote hash mismatch '+f.path);total+=body.length;assets.push({path:f.path,bytes:body.length,cache:r.headers.get('cache-control'),encoding:r.headers.get('content-encoding')});}
 report.push({release,totalDecodedBytes:total,files:assets});}
const readerIndex=await readFile('.site/reader/v1/index.json');
assert(readerIndex.equals(Buffer.from(await(await get(new URL('reader/v1/index.json',base))).arrayBuffer())),'Reader index mismatch');
const readers=JSON.parse(readerIndex);assert(readers.views.length===c.releases.length,'Missing reader views');
assert.equal(readers.permalinks.length,Object.keys(c.current).length,'Missing permanent views');
for(const file of [...readers.resources,...[...readers.views,...readers.permalinks].map(view=>({path:view.path+'index.html',sha256:view.sha256}))]){
 const body=Buffer.from(await(await get(new URL(file.path,base))).arrayBuffer());assert.equal(digest(body),file.sha256,'Reader hash mismatch '+file.path);
}
await verifyCatalog(base,c);console.log(JSON.stringify({releases:report,standaloneReaderViews:readers.views.length},null,2));
