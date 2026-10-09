'use strict';
// DockBerthShape translated from qunqin24/Pulse, Apache-2.0 (see NOTICE).
// Shared by the renderer and the Node geometry tests.
(function(scope){
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function spring(seconds,response=.32,damping=.86){
    if(seconds<=0)return 0;
    const w=2*Math.PI/response,wd=w*Math.sqrt(1-damping*damping);
    return 1-Math.exp(-damping*w*seconds)*(Math.cos(wd*seconds)+damping*w/wd*Math.sin(wd*seconds));
  }
  function berthPath(w,h,metrics,openness=1,docked=true){
    const n=v=>Number(v.toFixed(3)),s=metrics.scale,p=clamp(openness,0,1);
    if(!docked){const r=Math.min(w,h)/2;return `M${n(r)} 0 H${n(w-r)} A${n(r)} ${n(r)} 0 0 1 ${n(w)} ${n(r)} V${n(h-r)} A${n(r)} ${n(r)} 0 0 1 ${n(w-r)} ${n(h)} H${n(r)} A${n(r)} ${n(r)} 0 0 1 0 ${n(h-r)} V${n(r)} A${n(r)} ${n(r)} 0 0 1 ${n(r)} 0 Z`;}
    const f=Math.min(metrics.flareHeight*p,h/2),r=clamp(6*s+(metrics.corner-6*s)*p,0,Math.min(w,(h-2*f)/2)),fw=clamp(metrics.flareWidth*p,0,w-r),k=.55;
    let d=`M${n(r)} ${n(f)} H${n(w-fw)} C${n(w-fw*(1-k))} ${n(f)} ${n(w)} ${n(f*k)} ${n(w)} 0 V${n(h)} C${n(w)} ${n(h-f*k)} ${n(w-fw*(1-k))} ${n(h-f)} ${n(w-fw)} ${n(h-f)} H${n(r)}`;
    if(metrics.roundEnds){d+=` A${n(r)} ${n(r)} 0 0 1 0 ${n(h-f-r)} V${n(f+r)} A${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(f)}`;}
    else{
      const corner=(cx,cy,ax,ay,bx,by)=>{for(let i=1;i<=48;i++){const t=i/48*Math.PI/2,a=Math.sqrt(Math.max(0,Math.cos(t))),b=Math.sqrt(Math.max(0,Math.sin(t)));d+=` L${n(cx+r*(ax*a+bx*b))} ${n(cy+r*(ay*a+by*b))}`;}};
      corner(r,h-f-r,0,1,-1,0);d+=` V${n(f+r)}`;corner(r,f+r,-1,0,0,-1);
    }
    return d+' Z';
  }
  function panelBounds(settings,area,m){
    const pos=clamp(Number.isFinite(settings.dockPosition)?settings.dockPosition:.5,0,1),{width,height}=m;
    if(settings.floating)return {x:Math.round(clamp(settings.floatX??area.x,area.x,area.x+area.width-width)),y:Math.round(clamp(settings.floatY??area.y,area.y,area.y+area.height-height)),width,height};
    const along=m.vertical?clamp(area.y+pos*area.height-height/2,area.y,area.y+area.height-height):clamp(area.x+pos*area.width-width/2,area.x,area.x+area.width-width);
    return {x:Math.round(settings.edge==='left'?area.x:settings.edge==='right'?area.x+area.width-width:along),y:Math.round(settings.edge==='top'?area.y:settings.edge==='bottom'?area.y+area.height-height:along),width,height};
  }
  const api={clamp,spring,berthPath,panelBounds};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.NEO_DOCK=api;
})(typeof window==='undefined'?globalThis:window);
