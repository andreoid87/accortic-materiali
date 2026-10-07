import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {parse} from 'parse5';
import assert from 'node:assert/strict';
export const digest=data=>createHash('sha256').update(data).digest('hex');
export const safePath=p=>typeof p==='string'&&/^[a-zA-Z0-9_./-]+$/.test(p)&&!p.startsWith('/')&&!p.split('/').some(s=>!s||s==='.'||s==='..');
export const canonical=value=>JSON.stringify(value);
export async function filesAt(root,prefix=''){const entries=await readdir(join(root,prefix),{withFileTypes:true});const result=[];for(const e of entries){assert(!e.isSymbolicLink(),'Symlinks prohibited');const path=prefix?prefix+'/'+e.name:e.name;if(e.isDirectory())result.push(...await filesAt(root,path));else result.push(path);}return result.sort();}
export function walk(node,fn){fn(node);for(const child of node.childNodes??[])walk(child,fn);}
export const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
export function validateHtml(html,manifest){
 const allowed=new Set(['html','head','meta','title','link','body','header','h1','label','select','option','button','main','section','div','img','table','colgroup','col','tbody','tr','td','span','a','svg','defs','marker','path','details','summary','p','script']);
 const ids=[],assets=new Set(manifest.assets.map(a=>a.path));let scripts=0,csp=false;
 walk(parse(html),n=>{if(!n.tagName)return;assert(allowed.has(n.tagName),'Unsupported HTML '+n.tagName);
  for(const a of n.attrs??[]){assert(!/^on/i.test(a.name),'Event handlers prohibited');if(a.name==='style')assert(!/url\s*\(|@import|expression/i.test(a.value),'Remote/executable CSS prohibited');}
  if(n.tagName==='meta'){assert(attr(n,'http-equiv')!=='refresh','Redirect prohibited');if(attr(n,'http-equiv')==='Content-Security-Policy')csp=attr(n,'content')===CSP;}
  if(n.tagName==='script'){scripts++;assert(attr(n,'src')==='player.js'&&!n.childNodes.some(x=>x.value?.trim()),'Only trusted external player allowed');}
  if(n.tagName==='link')assert(attr(n,'rel')==='stylesheet'&&attr(n,'href')==='slides.css','Only local stylesheet allowed');
  if(n.tagName==='img')assert(assets.has(attr(n,'src')),'Unlisted image');
  if(n.tagName==='a')assert(/^https:\/\//.test(attr(n,'href')??''),'Only HTTPS links allowed');
  if(n.tagName==='body')assert(Number(attr(n,'data-slide-width'))===manifest.width&&Number(attr(n,'data-slide-height'))===manifest.height,'Canvas size mismatch');
  if(n.tagName==='section'&&(attr(n,'class')??'').split(' ').includes('slide'))ids.push(attr(n,'id'));
 });
 assert(scripts===1&&csp,'Trusted player and restrictive CSP required');assert.deepEqual(ids,manifest.slideOrder,'Slide order mismatch');
}
export const CSP="default-src 'none'; img-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
export async function validateRelease(root){
 const m=JSON.parse(await readFile(join(root,'material.json'),'utf8'));
 assert(m.schemaVersion===1&&/^[a-z0-9-]+$/.test(m.materialId)&&Number.isInteger(m.version)&&m.version>0,'Invalid identity');
 assert(m.title&&m.width>0&&m.height>0&&m.width<=4000&&m.height<=4000,'Invalid canvas');
 assert(m.approval?.publicDistribution===true&&m.approval?.imageOrigin==='teacher-declared-ai-generated'&&m.approval.evidence,'Public distribution evidence required');
 assert(m.source?.presentationId&&m.source.revision&&m.source.project?.uri?.startsWith('https://drive.google.com/'),'Editorial Drive project required');
 assert(Array.isArray(m.slideOrder)&&new Set(m.slideOrder).size===m.slideOrder.length&&m.slideOrder.length,'Stable slide IDs required');
 assert.deepEqual(Object.keys(m.slides).sort(),[...m.slideOrder].sort(),'Slide index mismatch');
 for(const id of m.slideOrder){assert(/^[a-zA-Z0-9_-]+$/.test(id),'Unsafe slide ID');const s=m.slides[id];assert(s.title&&Array.isArray(s.tags)&&s.coverage?.reference,'Missing slide metadata');for(const t of s.tags)assert(t.id&&t.weight>0,'Invalid weighted tag');}
 const paths=m.files.map(f=>f.path);assert(new Set(paths).size===paths.length,'Duplicate files');
 assert.deepEqual(await filesAt(root),[...paths,'material.json'].sort(),'Extra/untracked package files');
 let bytes=0;for(const file of m.files){assert(safePath(file.path),'Unsafe file path');const data=await readFile(join(root,file.path));assert(data.length===file.bytes&&digest(data)===file.sha256,'File integrity '+file.path);bytes+=data.length;}
 assert(digest(canonical(m.files))===m.packageHash,'Package hash mismatch');
 for(const asset of m.assets){assert(asset.mime==='image/webp'&&/^assets\/[a-f0-9]{20}\.webp$/.test(asset.path),'Invalid asset');assert(paths.includes(asset.path),'Unlisted asset');const b=await readFile(join(root,asset.path));assert(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP','Invalid WebP signature');assert(digest(b).startsWith(asset.path.split('/')[1].slice(0,20)),'Asset content hash mismatch');}
 for(const id of m.slideOrder)for(const path of m.slides[id].assets)assert(m.assets.some(a=>a.path===path),'Unlisted slide asset');
 const trusted=JSON.parse(await readFile(new URL('../runtime/approved.json',import.meta.url),'utf8'));
 for(const path of ['player.js','slides.css'])assert(trusted[path]?.includes(digest(await readFile(join(root,path)))),'Untrusted runtime '+path);
 validateHtml(await readFile(join(root,'index.html'),'utf8'),m);
 return {materialId:m.materialId,version:m.version,slides:m.slideOrder.length,assets:m.assets.length,bytes,htmlBytes:m.files.find(f=>f.path==='index.html').bytes};
}
export function validateCatalog(c){assert(c.schemaVersion===1&&Array.isArray(c.releases)&&c.current&&typeof c.current==='object','Invalid catalog');assert(new Set(c.releases).size===c.releases.length,'Duplicate release');for(const p of c.releases)assert(/^[a-z0-9-]+\/v[1-9][0-9]*$/.test(p),'Invalid release path');for(const [id,path]of Object.entries(c.current))assert(path.startsWith(id+'/')&&c.releases.includes(path),'Current points outside releases');}
