import assert from 'node:assert/strict';
// The catalog changes twice per publication. A successful HTTP response may
// still contain the first deployment while Pages propagates the activation.
export async function verifyCatalog(base,expected,{request=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms)),attempts=12}={}){
 let last;
 for(let attempt=0;attempt<attempts;attempt++){
  const url=new URL('catalog.json',base);url.searchParams.set('verify',Date.now()+'-'+attempt);
  try{const r=await request(url,{headers:{'Cache-Control':'no-cache'}});assert(r.ok,'Catalog unavailable: HTTP '+r.status);assert.deepEqual(await r.json(),expected,'Catalog mismatch');return;}
  catch(error){last=error;if(attempt+1<attempts)await pause(5000);}
 }
 throw last;
}
