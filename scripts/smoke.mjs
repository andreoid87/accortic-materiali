import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {digest} from './core.mjs';
const base=process.argv[2];if(!base?.startsWith('https://'))throw Error('HTTPS Pages base URL required');
const c=JSON.parse(await readFile('catalog.json','utf8')),report=[];
async function get(url){for(let attempt=0;attempt<5;attempt++){const r=await fetch(url,{headers:{'Cache-Control':'no-cache'}});if(r.ok)return r;await new Promise(resolve=>setTimeout(resolve,5000));}throw Error('Remote unavailable: '+url);}
for(const release of c.releases){const local=await readFile(join('releases',release,'material.json')),remote=Buffer.from(await(await get(new URL(release+'/material.json',base))).arrayBuffer());assert(local.equals(remote),'Remote manifest mismatch');const m=JSON.parse(local);
 let total=remote.length;const assets=[];for(const f of m.files){const r=await get(new URL(release+'/'+f.path,base)),body=Buffer.from(await r.arrayBuffer());assert(digest(body)===f.sha256,'Remote hash mismatch '+f.path);total+=body.length;assets.push({path:f.path,bytes:body.length,cache:r.headers.get('cache-control'),encoding:r.headers.get('content-encoding')});}
 report.push({release,totalDecodedBytes:total,files:assets});}
const remoteCatalog=await(await get(new URL('catalog.json',base))).json();assert.deepEqual(remoteCatalog,c,'Catalog mismatch');console.log(JSON.stringify(report,null,2));
