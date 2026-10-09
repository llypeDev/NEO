'use strict';
// Retain the same DOM and animate geometry, rather than replacing the panel on hover.
let neoPanel,neoRail,neoSurface,neoCard,neoContent,neoTail,neoFrame=0,neoSignature='',neoDragging=false,neoPointer=null;
let neoOpening={value:1,target:1,from:1,start:0},neoCardMotion=null,neoCardVisibility={value:0,target:0,from:0,start:0};
const neoReduced=matchMedia('(prefers-reduced-motion: reduce)');
const neoLerp=(a,b,p)=>a+(b-a)*p;
function neoMorph(el,html){
  const template=document.createElement('template');template.innerHTML=html;
  function patch(old,next){
    if(old.nodeType!==next.nodeType||old.nodeName!==next.nodeName){old.replaceWith(next.cloneNode(true));return;}
    if(old.nodeType===3){if(old.nodeValue!==next.nodeValue)old.nodeValue=next.nodeValue;return;}
    if(old.nodeType!==1)return;
    for(const attr of [...old.attributes])if(!next.hasAttribute(attr.name))old.removeAttribute(attr.name);
    for(const attr of [...next.attributes])if(old.getAttribute(attr.name)!==attr.value)old.setAttribute(attr.name,attr.value);
    const current=[...old.childNodes],desired=[...next.childNodes];
    desired.forEach((node,i)=>current[i]?patch(current[i],node):old.appendChild(node.cloneNode(true)));
    current.slice(desired.length).forEach(node=>node.remove());
  }
  const current=[...el.childNodes],desired=[...template.content.childNodes];
  desired.forEach((node,i)=>current[i]?patch(current[i],node):el.appendChild(node.cloneNode(true)));
  current.slice(desired.length).forEach(node=>node.remove());
}
function neoAnimate(){if(!neoFrame)neoFrame=requestAnimationFrame(neoTick);}
function neoSetExpanded(expanded){
  const target=expanded?1:0;collapsed=!expanded;
  if(neoOpening.target!==target)neoOpening={value:neoOpening.value,target,from:neoOpening.value,start:performance.now()};
  neoPanel.classList.toggle('collapsed',!expanded);neoAnimate();
}
function neoSetCardVisible(visible){
  const target=visible?1:0;
  if(neoCardVisibility.target!==target)neoCardVisibility={value:neoCardVisibility.value,target,from:neoCardVisibility.value,start:performance.now()};
  neoAnimate();
}
function neoInitPanel(){
  root.innerHTML='<div class="panel-root"><div class="rail-wrap"><svg class="dock-surface" aria-hidden="true"><g><path/></g></svg><div class="rail"></div></div><div class="sliver"></div><div class="hover-card"><svg class="card-tail" aria-hidden="true"><g><path d="M0 0 C0 12 10 18 20 20 C10 22 0 28 0 40 Z"/></g></svg><div class="card-scroll"></div></div></div>';
  neoPanel=root.querySelector('.panel-root');neoRail=root.querySelector('.rail');neoSurface=root.querySelector('.dock-surface');neoCard=root.querySelector('.hover-card');neoContent=root.querySelector('.card-scroll');neoTail=root.querySelector('.card-tail');
  const opened=!state.settings.autoCollapse||state.settings.floating;
  neoOpening={value:opened?1:0,target:opened?1:0,from:opened?1:0,start:0};collapsed=!opened;
  neoRail.addEventListener('pointerover',event=>{const item=event.target.closest('[data-rail]');if(item&&!neoDragging)neoSelect(item.dataset.rail);});
  // Mouse events also support accessibility tools and the packaged smoke checks.
  neoRail.addEventListener('mouseenter',event=>{const item=event.target.closest('[data-rail]');if(item&&!neoDragging)neoSelect(item.dataset.rail);},true);
  neoPanel.onmouseenter=()=>{clearTimeout(collapseTimer);neoSetExpanded(true);};
  neoPanel.onmouseleave=()=>{if(!neoDragging){hovered=null;neoSetCardVisible(false);}armCollapse();};
  root.querySelector('.sliver').onmouseenter=()=>{clearTimeout(collapseTimer);neoSetExpanded(true);};
  neoRail.oncontextmenu=event=>{event.preventDefault();window.pulse.openSettings();};
  neoPanel.querySelector('.rail-wrap').onpointerdown=event=>{
    if(event.button!==0)return;clearTimeout(collapseTimer);
    neoPointer={id:event.pointerId,x:event.screenX,y:event.screenY,target:event.target.closest('[data-rail]')};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  neoPanel.querySelector('.rail-wrap').onpointermove=event=>{
    if(!neoPointer||neoPointer.id!==event.pointerId)return;
    if(!neoDragging&&Math.hypot(event.screenX-neoPointer.x,event.screenY-neoPointer.y)>5){neoDragging=true;hovered=null;neoSetCardVisible(false);neoSetExpanded(true);window.pulse.startPanelDrag();}
  };
  const release=()=>{
    if(neoDragging){window.pulse.endPanelDrag();neoDragging=false;}
    else if(neoPointer?.target)window.pulse.openSettings();
    neoPointer=null;armCollapse();
  };
  neoPanel.querySelector('.rail-wrap').onpointerup=release;
  neoPanel.querySelector('.rail-wrap').onpointercancel=release;
  neoPanel.querySelector('.rail-wrap').onlostpointercapture=()=>{if(neoPointer)release();};
}
function renderPanel(){
  if(!neoPanel)neoInitPanel();
  const m=state.panelLayout,edge=state.settings.edge,accounts=state.settings.accounts.filter(a=>a.enabled).slice(0,m.capacity);
  neoPanel.className=`panel-root edge-${edge} ${collapsed?'collapsed':''} ${state.settings.floating?'floating':''} ${state.settings.panelColor==='light'?'light-panel':''} ${state.settings.labelAboveRing?'label-above':''}`;
  const values={scale:m.scale,rail:m.rail,ring:m.ring,gap:m.gap,padding:m.padding,card:m.cardWidth,pointer:m.pointer,'card-gap':m.cardGap,item:m.item,'rail-length':m.railLength};
  for(const [key,value]of Object.entries(values))neoPanel.style.setProperty('--'+key,value+(key==='scale'?'':'px'));
  neoRail.className='rail '+(m.vertical?'vertical':'horizontal');
  const signature=accounts.map(a=>a.id).join('|');
  if(signature!==neoSignature){neoSignature=signature;neoRail.innerHTML=accounts.map(a=>`<button class="rail-item" data-rail="${a.id}"></button>`).join('');}
  for(const a of accounts){const el=[...neoRail.children].find(e=>e.dataset.rail===a.id),w=head(a,state.readings[a.id]);
    el.setAttribute('aria-label',`${provider(a.provider).name}: ${w?Math.round(percent(w))+'%':'sem leitura'}`);
    neoMorph(el,ring(w,provider(a.provider),true,a)+(m.labels?`<span class="rail-percent ${w?.exhausted?'spent':''}">${w?Math.round(percent(w))+'%':'—'}</span>`:''));
    el.classList.toggle('refreshing',state.refreshing);
  }
  if(!state.settings.autoCollapse||state.settings.floating)neoSetExpanded(true);
  if(hovered&&!accounts.some(a=>a.id===hovered)){hovered=null;neoSetCardVisible(false);}
  neoUpdateCard();neoAnimate();
}
function neoSelect(id){
  clearTimeout(collapseTimer);neoSetExpanded(true);
  if(hovered===id)return;hovered=id;neoUpdateCard();neoSetCardVisible(true);
}
function neoUpdateCard(){
  if(!hovered)return;
  const a=state.settings.accounts.find(a=>a.id===hovered);if(!a)return;
  const p=provider(a.provider),r=state.readings[a.id];
  const html=`<div class="card-head">${mark(p)}<strong>Uso de ${esc(p.name)}</strong>${state.settings.detailedCard&&r?.plan?`<span class="card-plan">${esc(r.plan)}</span>`:''}</div>${state.settings.detailedCard?`<div class="card-updated">${esc(r?.source||'Sem leitura')} · ${age(r)}${r?.state==='stale'?' · Dados antigos':''}</div>`:''}${limits(r)||`<p class="card-message">${r?.balances?.length?'Saldo: '+fmt(r.balances[0].amount)+' '+esc(r.balances[0].currency):esc(r?.error||'Sem leitura')}</p>`}${r?.state==='stale'&&!state.settings.detailedCard?'<p class="card-updated">Dados antigos</p>':''}`;
  if(neoContent.dataset.html!==html){neoContent.dataset.html=html;neoMorph(neoContent,html);neoContent.classList.remove('content-enter');void neoContent.offsetWidth;neoContent.classList.add('content-enter');}
  positionCard();
}
function positionCard(){
  if(!neoPanel||!hovered)return;
  const item=[...neoRail.children].find(e=>e.dataset.rail===hovered),m=state.panelLayout,edge=state.settings.edge;if(!item)return;
  neoContent.style.height='auto';neoContent.style.maxHeight=(m.vertical?innerHeight-8:innerHeight-m.rail-m.pointer-m.cardGap-4)+'px';
  const height=Math.min(neoContent.scrollHeight,parseFloat(neoContent.style.maxHeight));neoContent.style.height='100%';
  // Lay out against the expanded rail, even while the silhouette is growing.
  const index=[...neoRail.children].indexOf(item),leading=state.settings.labelAboveRing&&m.labels?(state.settings.showResetClock?11:6)*m.scale+16*m.scale:0;
  const center=(m.vertical?innerHeight:innerWidth)/2-m.railLength/2+m.padding+index*(m.item+m.gap)+(m.vertical?leading+m.ring/2:m.item/2);
  const x=m.vertical?(edge==='left'?m.rail+m.pointer+m.cardGap:innerWidth-m.rail-m.pointer-m.cardGap-m.cardWidth):NEO_DOCK.clamp(center-m.cardWidth/2,4,innerWidth-m.cardWidth-4);
  const y=m.vertical?NEO_DOCK.clamp(center-height/2,4,innerHeight-height-4):(edge==='top'?m.rail+m.pointer+m.cardGap:innerHeight-m.rail-m.pointer-m.cardGap-height);
  const tip=NEO_DOCK.clamp(center-(m.vertical?y:x),20*m.scale,(m.vertical?height:m.cardWidth)-20*m.scale);
  const target={x,y,height,tip};
  if(!neoCardMotion){neoCardMotion={current:{...target},from:{...target},target,start:performance.now()};}
  else if(Object.keys(target).some(k=>Math.abs(target[k]-neoCardMotion.target[k])>.1)){neoCardMotion={current:neoCardMotion.current,from:{...neoCardMotion.current},target,start:performance.now()};}
  neoAnimate();
}
function neoTick(now){
  neoFrame=0;if(!neoPanel||!state)return;const m=state.panelLayout,edge=state.settings.edge;
  let active=false;
  function step(motion,response){
    const elapsed=(now-motion.start)/1000;
    const p=neoReduced.matches||elapsed>.6?1:NEO_DOCK.spring(elapsed,response,.86);
    motion.value=neoLerp(motion.from,motion.target,p);
    if(Math.abs(motion.value-motion.target)>.0005)active=true;else motion.value=motion.target;
    return NEO_DOCK.clamp(motion.value,0,1);
  }
  const opened=step(neoOpening,.32),visible=step(neoCardVisibility,neoCardVisibility.target?.28:.12);
  const thickness=neoLerp(6*m.scale,m.rail,opened),length=neoLerp(96*m.scale,m.railLength,opened);
  const wrap=neoPanel.querySelector('.rail-wrap'),w=m.vertical?thickness:length,h=m.vertical?length:thickness;
  wrap.style.width=w+'px';wrap.style.height=h+'px';
  neoRail.style.width=(m.vertical?m.rail:m.railLength)+'px';neoRail.style.height=(m.vertical?m.railLength:m.rail)+'px';
  neoSurface.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const group=neoSurface.querySelector('g');
  group.setAttribute('transform',edge==='left'?`matrix(-1 0 0 1 ${w} 0)`:edge==='top'?`matrix(0 -1 1 0 0 ${h})`:edge==='bottom'?`matrix(0 1 -1 0 ${w} 0)`:'');
  neoSurface.querySelector('path').setAttribute('d',NEO_DOCK.berthPath(thickness,length,m,opened,!state.settings.floating));
  neoCard.style.opacity=visible;neoCard.style.visibility=visible>.001?'visible':'hidden';neoCard.style.pointerEvents=visible>.1?'auto':'none';
  if(neoCardMotion){
    const elapsed=(now-neoCardMotion.start)/1000,p=neoReduced.matches||elapsed>.6?1:NEO_DOCK.spring(elapsed,.28,.84);
    for(const key of ['x','y','height','tip'])neoCardMotion.current[key]=neoLerp(neoCardMotion.from[key],neoCardMotion.target[key],p);
    if(Object.keys(neoCardMotion.target).some(k=>Math.abs(neoCardMotion.current[k]-neoCardMotion.target[k])>.05))active=true;
    const c=neoCardMotion.current;neoCard.style.left=c.x+'px';neoCard.style.top=c.y+'px';neoCard.style.height=c.height+'px';
    neoCard.style.transformOrigin=edge==='left'?'left center':edge==='right'?'right center':edge==='top'?'center top':'center bottom';
    const delta=12*m.scale*(1-visible),shiftX=m.vertical?(edge==='left'?-delta:delta):0,shiftY=m.vertical?0:edge==='top'?-delta:delta;
    neoCard.style.transform=`translate(${shiftX}px,${shiftY}px) scale(${.96+.04*visible})`;
    neoTail.setAttribute('viewBox',m.vertical?'0 0 20 40':'0 0 40 20');
    neoTail.style.width=(m.vertical?m.pointer:40*m.scale)+'px';neoTail.style.height=(m.vertical?40*m.scale:m.pointer)+'px';
    neoTail.style.left=(m.vertical?(edge==='left'?-m.pointer:m.cardWidth):c.tip-20*m.scale)+'px';neoTail.style.top=(m.vertical?c.tip-20*m.scale:edge==='top'?-m.pointer:c.height)+'px';
    neoTail.querySelector('g').setAttribute('transform',edge==='left'?'matrix(-1 0 0 -1 20 40)':edge==='top'?'matrix(0 -1 1 0 0 20)':edge==='bottom'?'matrix(0 1 -1 0 40 0)':'');
  }
  updateShape();if(active)neoAnimate();
}
function updateShape(){
  if(!neoPanel)return;
  const m=state.panelLayout,rects=[],wrap=neoPanel.querySelector('.rail-wrap'),rail=wrap.getBoundingClientRect();
  const add=r=>{const x=Math.max(0,Math.floor(r.left)),y=Math.max(0,Math.floor(r.top)),right=Math.min(innerWidth,Math.ceil(r.right)),bottom=Math.min(innerHeight,Math.ceil(r.bottom));if(right>x&&bottom>y)rects.push({x,y,width:right-x,height:bottom-y});};
  add(rail);
  if(neoOpening.value<.99)add(neoPanel.querySelector('.sliver').getBoundingClientRect());
  if(neoCardVisibility.value>.01){const card=neoCard.getBoundingClientRect(),tail=neoTail.getBoundingClientRect();add(card);add(tail);
    // Keep the short corridor traversable from the rail to the card.
    if(m.vertical)add({left:Math.min(tail.left,rail.left),right:Math.max(tail.right,rail.right),top:tail.top,bottom:tail.bottom});
    else add({left:tail.left,right:tail.right,top:Math.min(tail.top,rail.top),bottom:Math.max(tail.bottom,rail.bottom)});
  }
  window.pulse.panelShape(rects);
}
function armCollapse(){
  clearTimeout(collapseTimer);if(neoDragging)return;
  collapseTimer=setTimeout(()=>{hovered=null;neoSetCardVisible(false);neoSetExpanded(!state.settings.autoCollapse||state.settings.floating);},320);
}
