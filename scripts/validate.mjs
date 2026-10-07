import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {validateRelease,validateCatalog} from './core.mjs';
export async function validateRepository(root=process.cwd(),base=process.env.BASE_SHA){
 const c=JSON.parse(await readFile(join(root,'catalog.json'),'utf8'));validateCatalog(c);
 if(base&&/^\w{40}$/.test(base)&&!/^0+$/.test(base)){
  const previous=execFileSync('git',['ls-tree','-r','--name-only',base,'--','releases/'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
  for(const file of previous){const old=execFileSync('git',['show',base+':'+file],{cwd:root});assert(old.equals(await readFile(join(root,file))),'Immutable release changed or removed: '+file);}
  try{const old=JSON.parse(execFileSync('git',['show',base+':catalog.json'],{cwd:root,encoding:'utf8'}));assert(old.releases.every(r=>c.releases.includes(r)),'Published releases cannot be removed');}catch(error){if(!String(error).includes('does not exist'))throw error;}
  const exists=execFileSync('git',['ls-tree','--name-only',base,'--','runtime/approved.json'],{cwd:root,encoding:'utf8'}).trim();
  if(exists){const old=JSON.parse(execFileSync('git',['show',base+':runtime/approved.json'],{cwd:root,encoding:'utf8'})),current=JSON.parse(await readFile(join(root,'runtime/approved.json'),'utf8'));for(const file of ['player.js','slides.css'])assert(old[file].every(hash=>current[file]?.includes(hash)),'Trusted old runtimes must remain valid');}
 }
 const report=[];for(const release of c.releases){const m=JSON.parse(await readFile(join(root,'releases',release,'material.json'),'utf8'));assert(release===m.materialId+'/v'+m.version,'Release path mismatch');report.push(await validateRelease(join(root,'releases',release)));}
 console.log(JSON.stringify(report,null,2));return c;
}
if(process.argv[1]?.endsWith('validate.mjs'))await validateRepository();
