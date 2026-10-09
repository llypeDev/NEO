'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {berthPath,panelBounds,spring}=require('../src/dock-geometry.cjs');
const {panelLayout}=require('../src/panel-layout.cjs');
const {defaultSettings}=require('../src/storage.cjs');
test('o painel encosta exatamente nas quatro bordas, inclusive em monitor deslocado',()=>{
  const area={x:-1920,y:40,width:1920,height:1040};
  for(const edge of ['left','right','top','bottom']){const settings={...defaultSettings(),edge,accounts:[{enabled:true}]},m=panelLayout(settings,area),b=panelBounds(settings,area,m);
    assert.ok(b.x>=area.x&&b.y>=area.y);assert.ok(b.x+b.width<=area.x+area.width&&b.y+b.height<=area.y+area.height);
    if(edge==='left')assert.equal(b.x,area.x);if(edge==='right')assert.equal(b.x+b.width,area.x+area.width);
    if(edge==='top')assert.equal(b.y,area.y);if(edge==='bottom')assert.equal(b.y+b.height,area.y+area.height);
  }
});
test('a forma possui parede reta na borda e duas curvas côncavas, não uma cápsula',()=>{
  const m=panelLayout({...defaultSettings(),accounts:[{enabled:true}]},{width:1280,height:720}),path=berthPath(64,m.railLength,m);
  assert.ok(path.startsWith('M26 24 H26 C46.9 24 64 13.2 64 0 V'));assert.equal((path.match(/ C/g)||[]).length,2);assert.ok(!path.includes('NaN'));
  const closed=berthPath(6,96,m,0);assert.ok(closed.includes('6 0 V96'));assert.ok(!closed.includes('NaN'));
  const free=berthPath(64,300,m,1,false);assert.equal((free.match(/ A/g)||[]).length,4);assert.equal((free.match(/ C/g)||[]).length,0);
});
test('a mola começa em zero, tem leve ultrapassagem e converge sem salto',()=>{
  assert.equal(spring(0),0);assert.ok(spring(.08)>0&&spring(.08)<1);assert.ok(spring(.32)>1&&spring(.32)<1.02);assert.ok(Math.abs(spring(1)-1)<1e-6);
});
test('o painel solto mantém o corpo visível e a posição é limitada ao monitor',()=>{
  const area={x:1280,y:0,width:1920,height:1080},settings={...defaultSettings(),floating:true,floatX:99999,floatY:-99999,accounts:[{enabled:true}]},m=panelLayout(settings,area),b=panelBounds(settings,area,m);
  assert.equal(b.x+b.width,area.x+area.width);assert.equal(b.y,area.y);assert.equal(m.padding,22);assert.equal(panelLayout({...settings,floating:false},area).padding,46);
});
