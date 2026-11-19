// Trusted runtime, never replaced by editorial HTML or an editor export.
const width=Number(document.body.dataset.slideWidth),height=Number(document.body.dataset.slideHeight);
const selection=document.getElementById('selection');let zoom=false;
function resize(){document.querySelectorAll('.viewport').forEach(v=>{if(!v.clientWidth)return;const c=v.querySelector('.canvas'),surface=v.querySelector('.surface'),scale=zoom?1:Math.min(1,v.clientWidth/width);c.style.transform='scale('+scale+')';surface.style.width=(width*scale)+'px';surface.style.height=(height*scale)+'px';v.style.height=(zoom?Math.min(height,innerHeight*.8):height*scale)+'px';if(!zoom){v.scrollLeft=0;v.scrollTop=0;}});}
function show(){let id='';try{id=decodeURIComponent(location.hash.slice(1));}catch{}const found=[...selection.options].some(o=>o.value===id);selection.value=found?id:'';document.querySelectorAll('.slide').forEach(s=>s.hidden=found&&id!==''&&s.id!==id);resize();}
selection.addEventListener('change',()=>{location.hash=selection.value;});document.getElementById('zoom').addEventListener('click',()=>{zoom=!zoom;document.getElementById('zoom').textContent=zoom?'Adatta allo schermo':'Ingrandisci';resize();});addEventListener('hashchange',show);addEventListener('resize',resize);if(new URLSearchParams(location.search).has('single'))document.body.classList.add('single');show();


/* Miniapp v1: trusted player creates an isolated frame from an approved marker.
   Editorial HTML never supplies iframe, srcdoc or script content. */
const miniappRelease=/^https:\/\/(?:accortic-b69ab\.web\.app|accordino\.it)\/miniapp\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\/v[1-9][0-9]{0,5}\/$/;
let openMiniapp=null;
for(const host of document.querySelectorAll('div[data-accortic-miniapp="v1"]')){
  const url=host.getAttribute('data-accortic-miniapp-url')||'',
    title=host.getAttribute('data-accortic-miniapp-title')||'Miniapp';
  if(!miniappRelease.test(url)){
    host.textContent='Miniapp da configurare. Apri la slide nell’editor.';
    continue;
  }
  const bar=document.createElement('div');bar.className='miniapp-bar';
  const caption=document.createElement('strong');caption.textContent=title;
  const expand=document.createElement('button');expand.type='button';expand.textContent='Espandi per LIM';expand.setAttribute('aria-label','Espandi '+title+' per LIM');
  bar.append(caption,expand);
  const viewport=document.createElement('div');viewport.className='miniapp-viewport';
  const frame=document.createElement('iframe');
  frame.src=url;frame.title=title;frame.setAttribute('sandbox','allow-scripts');
  frame.setAttribute('referrerpolicy','no-referrer');
  frame.setAttribute('loading','lazy');
  viewport.append(frame);
  host.replaceChildren(bar,viewport);
  // NEVER move/recreate the frame on expand: its in-memory game state must survive.
  let previouslyFocused=null,previousScroll=0;
  const close=()=>{
    if(openMiniapp!==host)return;
    host.classList.remove('miniapp-expanded');
    host.removeAttribute('role');host.removeAttribute('aria-modal');
    document.body.classList.remove('miniapp-open');
    expand.textContent='Espandi per LIM';expand.setAttribute('aria-label','Espandi '+title+' per LIM');
    openMiniapp=null;resize();scrollTo({top:previousScroll,behavior:'instant'});
    (previouslyFocused||expand).focus({preventScroll:true});
  };
  const toggle=()=>{
    if(openMiniapp===host){close();return;}
    if(openMiniapp)return;
    previouslyFocused=document.activeElement;
    previousScroll=scrollY;
    openMiniapp=host;host.classList.add('miniapp-expanded');
    host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');
    document.body.classList.add('miniapp-open');
    expand.textContent='Torna alla slide';expand.setAttribute('aria-label','Torna alla slide da '+title);
    expand.focus({preventScroll:true});
  };
  expand.addEventListener('click',toggle);
  addEventListener('keydown',event=>{
    if(openMiniapp!==host)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}
    if(event.key==='Tab'&&document.activeElement===expand&&event.shiftKey){event.preventDefault();expand.focus();}
  },true);
}
