// Resolve the active publication on every opening, including a cached entry page.
// Only public, validated release views are loaded; editorial drafts are never read.
(async()=>{
 const id=document.body.dataset.materialId,status=document.getElementById('permalink-status');
 try{
  const base='/accortic-materiali/',fresh=crypto.randomUUID();
  const get=async path=>{
   const response=await fetch(base+path+'?permalink='+fresh,{cache:'no-store'});
   if(!response.ok)throw Error('Pubblicazione non disponibile');
   return response;
  };
  const catalog=await(await get('catalog.json')).json(),ref=catalog.current?.[id];
  if(!/^[a-z0-9][a-z0-9-]{0,79}\/v[1-9][0-9]{0,5}$/.test(ref)||!ref.startsWith(id+'/v')||!catalog.releases?.includes(ref))throw Error('Presentazione non pubblicata');
  const html=await(await get('reader/v1/'+ref+'/index.html')).text();
  const doc=new DOMParser().parseFromString(html,'text/html'),scripts=[...doc.querySelectorAll('script')];
  if(!doc.querySelector('body.standalone-reader')||scripts.length!==1||scripts[0].getAttribute('src')!==base+'reader/v1/player.js')throw Error('Lettore non disponibile');
  doc.body.dataset.slidePermalink='true';
  for(const slide of doc.querySelectorAll('section.slide'))slide.hidden=true;
  // Revalidate the shared reader too: an older cached player may not support
  // removed-slide handling. The permanent address, hash and query stay intact.
  scripts[0].setAttribute('src',base+'reader/v1/player.js?permalink='+fresh);
  document.open();document.write('<!doctype html>'+doc.documentElement.outerHTML);document.close();
 }catch{
  status.textContent='Presentazione non disponibile o non ancora pubblicata. Riprova più tardi.';
 }
})();
