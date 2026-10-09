'use strict';
// Geometry translated from Pulse's DockLayout and DetailCardLayout.
function panelLayout(settings,area){
  const scale={small:.82,standard:1,large:1.22}[settings.panelSize]||1;
  const vertical=['left','right'].includes(settings.edge);
  const labels=vertical?settings.showSidePercent:settings.showAcrossPercent;
  const ring=36*scale,gap=30*scale*({compact:.6,standard:1,roomy:1.4}[settings.railSpacing]||1);
  const stack=ring+(labels?(settings.showResetClock?11:6)*scale+16*scale:0);
  const item=vertical?stack:labels?Math.max(ring,38*scale):ring;
  const rail=vertical?64*scale:Math.max(64*scale,stack+20*scale);
  const roundEnds=settings.roundEnds,corner=(roundEnds?32:26)*scale;
  const flareHeight=(roundEnds?32:24)*scale,flareWidth=(roundEnds?32:38)*scale;
  const padding=(settings.floating?22:roundEnds?54:46)*scale;
  const capacity=Math.max(1,Math.floor(((vertical?area.height:area.width)-16-padding*2+gap)/(item+gap)));
  const count=Math.max(1,Math.min(capacity,settings.accounts.filter(a=>a.enabled).length));
  const railLength=padding*2+count*item+(count-1)*gap;
  const cardWidth=250*scale,pointer=20*scale,cardGap=8*scale;
  const reach=cardWidth+pointer+cardGap+rail;
  return {scale,vertical,labels,capacity,count,ring,rail,gap,item,padding,railLength,cardWidth,pointer,cardGap,roundEnds,corner,flareHeight,flareWidth,
    width:Math.ceil(vertical?reach+8*scale:Math.max(railLength,cardWidth+16)),
    height:Math.ceil(vertical?Math.min(area.height,Math.max(railLength+16,430*scale+8)):Math.min(area.height-16,rail+pointer+cardGap+430*scale+8))};
}
module.exports={panelLayout};
