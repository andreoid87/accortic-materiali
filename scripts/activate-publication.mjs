import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {validateCatalog,validateRelease} from './core.mjs';
export async function activatePublication(root,id){
 assert(/^[a-f0-9-]{36}$/.test(id||''),'Explicit safe publication ID required');root=resolve(root);
 const intent=JSON.parse(await readFile(join(root,'.github/publications',id+'.json'),'utf8'));
 assert(intent.schemaVersion===1&&intent.publicationId===id&&/^[a-z0-9][a-z0-9-]{0,99}$/.test(intent.materialId),'Invalid publication intent');
 assert(new RegExp('^'+intent.materialId+'/v[1-9][0-9]*$').test(intent.ref),'Invalid release reference');
 const catalog=JSON.parse(await readFile(join(root,'catalog.json'),'utf8'));validateCatalog(catalog);
 assert(catalog.releases.includes(intent.ref),'Release is not registered');
 await validateRelease(join(root,'releases',intent.ref));
 const manifest=JSON.parse(await readFile(join(root,'releases',intent.ref,'material.json'),'utf8'));
 assert(manifest.approval.sourceSha256===intent.sourceSha256,'Published source does not match intent');
 if(catalog.publications?.[id]===intent.ref)return false;
 assert((catalog.current[intent.materialId]??null)===intent.previousRef,'Current changed concurrently; refusing replacement');
 catalog.current[intent.materialId]=intent.ref;catalog.publications={...catalog.publications,[id]:intent.ref};
 await writeFile(join(root,'catalog.json'),JSON.stringify(catalog)+'\n');return true;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const message=process.env.PUBLICATION_MESSAGE?.split('\n')[0]??'';
 const id=message.match(/^publish\(materials\): ([a-f0-9-]{36})$/)?.[1];assert(id,'Trusted publish commit required');
 if(await activatePublication(process.cwd(),id)){
  const git=(...args)=>execFileSync('git',args,{stdio:'ignore'});
  git('add','--','catalog.json');git('-c','user.name=AccorTIC publisher','-c','user.email=publisher@users.noreply.github.com','commit','-m','activate(materials): '+id);
  // Checkout's generated repo-scoped Actions token is removed by its post action.
  git('push','origin','HEAD:dev');
 }
}
