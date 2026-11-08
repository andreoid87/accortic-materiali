// Resolve the active publication without replacing the browser document.
// Initial HTML already contains the approved slide text for native translation.
(async()=>{
 const id=document.body.dataset.materialId;
 const status=()=>document.getElementById('reader-status')??document.getElementById('permalink-status');
 try{
  const base='/accortic-materiali/',fresh=crypto.randomUUID();
  const get=async path=>{
   const response=await fetch(base+path+'?permalink='+fresh,{cache:'no-store'});
   if(!response.ok)throw Error('Pubblicazione non disponibile');
   return response;
  };
  const catalog=await(await get('catalog.json')).json(),ref=catalog.current?.[id];
  if(!/^[a-z0-9][a-z0-9-]{0,79}\/v[1-9][0-9]{0,5}$/.test(ref)||!ref.startsWith(id+'/v')||!catalog.releases?.includes(ref))throw Error('Presentazione non pubblicata');
  if(document.body.dataset.publishedRef!==ref){
   const html=await(await get('reader/v1/'+ref+'/index.html')).text();
   const doc=new DOMParser().parseFromString(html,'text/html'),scripts=[...doc.querySelectorAll('script')];
   if(!doc.querySelector('body.standalone-reader')||scripts.length!==1||scripts[0].getAttribute('src')!==base+'reader/v1/player.js')throw Error('Lettore non disponibile');
   scripts[0].remove();
   for(const meta of doc.querySelectorAll('meta[http-equiv]')){
    if(meta.httpEquiv.toLowerCase()==='content-security-policy')meta.content=meta.content.replace(/(^|;)\s*connect-src\s+'none'/,"$1 connect-src 'self'");
   }
   for(const slide of doc.querySelectorAll('section.slide'))slide.hidden=true;
   // Update a stale publication in the existing document. document.open/write
   // can reset Chrome's document lifecycle and disable native Translate.
   document.head.replaceChildren(...[...doc.head.childNodes].map(node=>document.importNode(node,true)));
   for(const attr of [...document.body.attributes])document.body.removeAttribute(attr.name);
   for(const attr of doc.body.attributes)document.body.setAttribute(attr.name,attr.value);
   document.body.replaceChildren(...[...doc.body.childNodes].map(node=>document.importNode(node,true)));
  }
  document.body.dataset.materialId=id;
  document.body.dataset.publishedRef=ref;
  document.body.dataset.slidePermalink='true';
  const player=document.createElement('script');player.src=base+'reader/v1/player.js?permalink='+fresh;
  player.onerror=()=>{status().textContent='Lettore non disponibile. Riprova più tardi.';};
  document.body.append(player);
 }catch{
  for(const slide of document.querySelectorAll('section.slide'))slide.hidden=true;
  status().textContent='Presentazione non disponibile o non ancora pubblicata. Riprova più tardi.';
 }
})();
