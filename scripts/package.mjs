import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {parse,serialize} from 'parse5';
import {walk,attr,digest,canonical,CSP,validateRelease} from './core.mjs';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/package.mjs <reviewed preview directory> <new release directory>');
const root=resolve(output);await mkdir(dirname(root),{recursive:true});await mkdir(root);await mkdir(join(root,'assets'));
const source=JSON.parse(await readFile(join(input,'source-snapshot.json'),'utf8'));
const document=parse(await readFile(join(input,'index.html'),'utf8'));
const set=(n,k,v)=>{n.attrs??=[];n.attrs=n.attrs.filter(a=>a.name!==k);n.attrs.push({name:k,value:String(v)});};
walk(document,n=>{
 if(n.tagName==='head')n.childNodes=n.childNodes.filter(x=>x.tagName!=='style');
 if(n.tagName==='script'){n.childNodes=[];set(n,'src','player.js');set(n,'defer','');}
 if(n.tagName==='body'){set(n,'data-slide-width','960');set(n,'data-slide-height','540');}
 if(n.tagName==='p'&&attr(n,'class')==='source'){
  const text=n.childNodes.map(x=>x.value??'').join('').replace(/Immagine di apertura:/g,'Riferimento iconografico:').replace(/Immagine:/g,'Riferimento iconografico:').replace(/dal materiale editoriale fornito/g,'come riferimento per l’illustrazione IA').replace(/mostrata integralmente per conservarne frecce e relazioni/g,'usata come riferimento concettuale per frecce e relazioni').replace(/L’immagine originale è mostrata integralmente e ingrandita/g,'L’illustrazione IA è mostrata integralmente e ingrandita').replace(/Immagine originale/g,'Illustrazione IA').replace(/Le immagini didattiche/g,'Le illustrazioni IA');
  n.childNodes=[{nodeName:'#text',value:text+' Illustrazioni generate con IA dal docente, prendendo spunto dal manuale; dichiarazione docente del 2026-10-07.',parentNode:n}];
 }
});
let html=serialize(document).replace('</head>',`<link rel="stylesheet" href="slides.css"><meta http-equiv="Content-Security-Policy" content="${CSP}"></head>`);
await writeFile(join(root,'index.html'),html);
for(const path of ['player.js','slides.css'])await copyFile(new URL('../runtime/'+path,import.meta.url),join(root,path));
const assets=new Map(),slides={},slideOrder=source.slides.map(s=>s.objectId);
const text=e=>(e.shape?.text?.textElements??[]).map(t=>t.textRun?.content??'').join('').trim();
for(const s of source.slides){
 const texts=s.pageElements.map(text).filter(Boolean),images=s.pageElements.filter(e=>e.image).map(e=>e.image.contentUrl);
 const reference=texts.find(t=>/^p[.p\s]/.test(t))??'pp. 42–49';
 slides[s.objectId]={title:texts[1]??texts[0],assets:images,tags:[],tagStatus:'pending-P31D',coverage:{reference,sourcePresentationSlide:s.objectId}};
 for(const path of images){if(assets.has(path))continue;await copyFile(join(input,path),join(root,path));assets.set(path,{path,mime:'image/webp',origin:'teacher-declared-ai-generated',alt:'Illustrazione didattica: '+slides[s.objectId].title});}
}
const paths=['index.html','player.js','slides.css',...assets.keys()].sort(),files=[];
for(const path of paths){const bytes=await readFile(join(root,path));files.push({path,bytes:bytes.length,sha256:digest(bytes)});}
const manifest={schemaVersion:1,materialId:'interno-pc',version:1,title:source.title,width:960,height:540,slideOrder,slides,assets:[...assets.values()],files,packageHash:digest(canonical(files)),source:{presentationId:source.presentationId,revision:source.revisionId,bibliography:'Barbero, Vaschetto, Rolfo, Dal BIT all’INTELLIGENZA ARTIFICIALE, Unità 3, pp.42–49',project:{format:'google-slides-native-snapshot-v1',uri:'https://drive.google.com/file/d/1weSrk8SplnoaC3W1-MAlrk9_gVgRyRPX/view',editorStatus:'P31C-pending'}},approval:{publicDistribution:true,imageOrigin:'teacher-declared-ai-generated',evidence:'Docente 2026-10-07: «sono immagini generate con IA ho solo preso spunto dal libro»; richiesta di proseguire con distribuzione GitHub Pages.'}};
await writeFile(join(root,'material.json'),JSON.stringify(manifest,null,2)+'\n');console.log(await validateRelease(root));
