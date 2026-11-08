import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {parse,parseFragment,serialize} from 'parse5';
import assert from 'node:assert/strict';
import {walk,attr,digest} from './core.mjs';

export const READER_PATH='reader/v1';
const siteRoot='/accortic-materiali/';
const controls='<nav class="reader-navigation" aria-label="Navigazione slide"><button id="reader-previous" type="button">← Precedente</button><output id="reader-position" aria-live="polite"></output><button id="reader-next" type="button">Successiva →</button></nav><button id="reader-fullscreen" type="button" aria-pressed="false">Schermo intero</button><button id="reader-return" type="button" hidden>Torna alla domanda</button><p id="reader-status" role="status" class="reader-status"></p>';
const set=(node,name,value)=>{node.attrs??=[];const old=node.attrs.find(a=>a.name===name);if(old)old.value=value;else node.attrs.push({name,value});};

/** Build-time view of approved content. Source releases are never rewritten. */
export function readerHtml(html,release,permalink){
 assert(/^[a-z0-9][a-z0-9-]{0,79}\/v[1-9][0-9]{0,5}$/.test(release),'Invalid release');
 const document=parse(html);let head,header,body,main,players=0;
 walk(document,node=>{
  if(node.tagName==='head')head=node;
  if(node.tagName==='body')body=node;
  if(node.tagName==='main')main=node;
  if(node.tagName==='header')header??=node;
  if(attr(node,'id')?.startsWith('reader-'))throw Error('Reader control ID collision');
  if(permalink&&node.tagName==='meta'&&attr(node,'http-equiv')?.toLowerCase()==='content-security-policy'){
   const policy=attr(node,'content');assert(/(?:^|;)\s*connect-src\s+'none'\s*(?:;|$)/.test(policy),'Unexpected source connection policy');
   set(node,'content',policy.replace(/(^|;)\s*connect-src\s+'none'/,"$1 connect-src 'self'"));
  }
  if(node.tagName==='script'){assert(attr(node,'src')==='player.js','Unexpected script');set(node,'src',permalink?siteRoot+'slides/permalink.js?hash='+permalink.resolverHash:siteRoot+READER_PATH+'/player.js');players++;}
  else if(node.tagName==='img'){const src=attr(node,'src');assert(src?.startsWith('assets/'),'Unexpected image');set(node,'src',siteRoot+release+'/'+src);}
  else if(node.tagName==='link'){assert(attr(node,'href')==='slides.css','Unexpected stylesheet');set(node,'href',siteRoot+release+'/slides.css');}
 });
 assert(head&&header&&body&&main&&players===1,'Unsupported approved reader structure');
 set(body,'class','standalone-reader');set(main,'dir','ltr');
 if(permalink){
  set(body,'data-material-id',permalink.id);set(body,'data-published-ref',release);set(body,'data-slide-permalink','true');
  walk(main,node=>{if(node.tagName==='section'&&(attr(node,'class')??'').split(' ').includes('slide'))set(node,'hidden','');});
 }
 set(header,'class','reader-toolbar');
 for(const node of parseFragment(controls).childNodes){node.parentNode=header;header.childNodes.push(node);}
 for(const node of parseFragment('<meta name="referrer" content="no-referrer"><link rel="stylesheet" href="'+siteRoot+READER_PATH+'/reader.css">').childNodes){node.parentNode=head;head.childNodes.push(node);}
 return serialize(document);
}

export async function buildReaders(catalog,out,root=process.cwd()){
 const readerRoot=join(out,READER_PATH);await mkdir(readerRoot,{recursive:true});
 await copyFile(join(root,'runtime/reader-v1.js'),join(readerRoot,'player.js'));
 await copyFile(join(root,'runtime/reader-v1.css'),join(readerRoot,'reader.css'));
 const resources=await Promise.all(['player.js','reader.css'].map(async path=>({path:READER_PATH+'/'+path,sha256:digest(await readFile(join(readerRoot,path)))})));
 await mkdir(join(out,'slides'),{recursive:true});
 const resolver=await readFile(join(root,'runtime/permalink.js')),resolverHash=digest(resolver);
 await writeFile(join(out,'slides/permalink.js'),resolver);
 resources.push({path:'slides/permalink.js',sha256:resolverHash});
 const index={version:1,resources,views:[],permalinks:[]};
 for(const release of catalog.releases){
  const source=await readFile(join(root,'releases',release,'index.html'),'utf8');
  const output=readerHtml(source,release),target=join(readerRoot,release);
  await mkdir(target,{recursive:true});await writeFile(join(target,'index.html'),output);
  index.views.push({release,path:READER_PATH+'/'+release+'/',sha256:digest(Buffer.from(output))});
 }
 // Only the activated, published reference is eligible. Never infer latest from
 // release order: queued publications must not replace the current presentation.
 for(const [id,release] of Object.entries(catalog.current)){
  assert(catalog.releases.includes(release)&&release.startsWith(id+'/v'),'Invalid current release');
  assert(/^[a-z0-9][a-z0-9-]{0,79}$/.test(id),'Invalid material ID');
  // Serve approved text in a real initial document for Chrome Translate.
  // The resolver checks current again, including when this HTML is cached.
  const source=await readFile(join(root,'releases',release,'index.html'),'utf8');
  const output=readerHtml(source,release,{id,resolverHash}),path='slides/'+id+'/';
  await mkdir(join(out,path),{recursive:true});await writeFile(join(out,path,'index.html'),output);
  index.permalinks.push({release,path,sha256:digest(Buffer.from(output))});
 }
 await writeFile(join(readerRoot,'index.json'),JSON.stringify(index));
}
