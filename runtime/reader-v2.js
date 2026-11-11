// Standalone presentation controls. No application data, fetch or parent access.
const width=Number(document.body.dataset.slideWidth),height=Number(document.body.dataset.slideHeight);
const allSlides=[...document.querySelectorAll('section.slide')];
const requested=new URLSearchParams(location.search).get('slides')?.split(',');
const slides=requested&&requested.length>0&&requested.length<=6&&new Set(requested).size===requested.length&&requested.every(id=>allSlides.some(slide=>slide.id===id))?requested.map(id=>allSlides.find(slide=>slide.id===id)):allSlides;
const selection=document.getElementById('selection'),zoomButton=document.getElementById('zoom');
const previous=document.getElementById('reader-previous'),next=document.getElementById('reader-next');
const position=document.getElementById('reader-position'),fullscreen=document.getElementById('reader-fullscreen');
const status=document.getElementById('reader-status'),returnButton=document.getElementById('reader-return');
let index=0,zoom=false,missing=false;
document.body.classList.remove('single');
const options=[...selection.options];selection.replaceChildren(...slides.map(slide=>options.find(option=>option.value===slide.id)));

function resize(){
 if(missing)return;
 const slide=slides[index],viewport=slide.querySelector('.viewport'),surface=slide.querySelector('.surface'),canvas=slide.querySelector('.canvas');
 if(!viewport||!surface||!canvas)return;
 const full=Boolean(document.fullscreenElement);
 const availableHeight=full?innerHeight:Math.max(120,innerHeight-document.querySelector('header').offsetHeight-32);
 const availableWidth=full?document.documentElement.clientWidth:viewport.clientWidth;
 const scale=zoom?1:Math.min(availableWidth/width,availableHeight/height);
 canvas.style.transform='scale('+scale+')';canvas.style.transformOrigin='0 0';
 surface.style.width=width*scale+'px';surface.style.height=height*scale+'px';
 viewport.style.height=full?availableHeight+'px':height*scale+'px';
 if(!zoom){viewport.scrollLeft=0;viewport.scrollTop=0;}
}
function show(){
 let id='',invalid=false;try{id=decodeURIComponent(location.hash.slice(1));}catch{invalid=true;}
 const found=slides.findIndex(slide=>slide.id===id);index=found<0?0:found;
 missing=document.body.dataset.slidePermalink==='true'&&(invalid||id!==''&&found<0);
 if(missing){
  allSlides.forEach(slide=>slide.hidden=true);selection.value='';
  previous.disabled=true;next.disabled=true;position.textContent='';
  status.textContent='Slide non disponibile: è stata rimossa dalla versione pubblicata oppure il suo ID non esiste. Scegli una slide dal menu.';
  return;
 }
 status.textContent='';
 allSlides.forEach(slide=>slide.hidden=slide!==slides[index]);
 selection.value=slides[index].id;
 previous.disabled=index===0;next.disabled=index===slides.length-1;
 position.textContent=(index+1)+' / '+slides.length;
 resize();
}
function go(value){if(value>=0&&value<slides.length){zoom=false;zoomButton.textContent='Ingrandisci';location.hash=slides[value].id;}}
previous.addEventListener('click',()=>go(index-1));next.addEventListener('click',()=>go(index+1));
selection.addEventListener('change',()=>{zoom=false;zoomButton.textContent='Ingrandisci';location.hash=selection.value;});
zoomButton.addEventListener('click',()=>{zoom=!zoom;zoomButton.textContent=zoom?'Adatta allo schermo':'Ingrandisci';resize();});
addEventListener('hashchange',show);addEventListener('resize',resize);
addEventListener('keydown',event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest('input,textarea,select,[contenteditable]'))return;
 const keys={ArrowRight:index+1,ArrowDown:index+1,PageDown:index+1,ArrowLeft:index-1,ArrowUp:index-1,PageUp:index-1,Home:0,End:slides.length-1};
 if(Object.hasOwn(keys,event.key)){event.preventDefault();go(keys[event.key]);}
});
fullscreen.hidden=!document.fullscreenEnabled||typeof document.documentElement.requestFullscreen!=='function';
fullscreen.addEventListener('click',async()=>{
 try{status.textContent='';if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
 catch{status.textContent='Schermo intero non disponibile in questo browser. La presentazione resta utilizzabile.';}
});
document.addEventListener('fullscreenchange',()=>{const active=Boolean(document.fullscreenElement);document.body.classList.toggle('reader-fullscreen',active);document.body.classList.remove('reader-controls-visible');if(active){zoom=false;zoomButton.textContent='Ingrandisci';}fullscreen.textContent=active?'Esci da schermo intero':'Schermo intero';fullscreen.setAttribute('aria-pressed',String(active));resize();});
returnButton.hidden=!new URLSearchParams(location.search).has('help');
returnButton.addEventListener('click',()=>{window.close();status.textContent='Chiudi questa scheda per tornare alla domanda rimasta aperta.';});
document.querySelector('main').addEventListener('click',event=>{
 if(!document.fullscreenElement||event.target.closest('button,select,input,textarea,a,summary,[contenteditable]'))return;
 const viewport=event.target.closest('.viewport');if(!viewport)return;
 const rect=viewport.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width;
 if(x<0.28)go(index-1);
 else if(x>0.72)go(index+1);
 else document.body.classList.toggle('reader-controls-visible');
});
show();
