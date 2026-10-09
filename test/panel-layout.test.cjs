'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {panelLayout}=require('../src/panel-layout.cjs');
const {defaultSettings,validateSettings}=require('../src/storage.cjs');
test('a faixa cabe na área útil para todos os tamanhos, bordas e percentuais',()=>{
  const accounts=Array.from({length:77},(_,i)=>({id:'a'+i,provider:'codex',enabled:true})),area={width:1280,height:680};
  for(const panelSize of ['small','standard','large'])for(const edge of ['left','right','top','bottom'])for(const railSpacing of ['compact','standard','roomy'])for(const labels of [false,true]){
    const s={...defaultSettings(),accounts,panelSize,edge,railSpacing,showSidePercent:labels,showAcrossPercent:labels},m=panelLayout(s,area);
    assert.ok(m.width<=area.width&&m.height<=area.height);assert.ok(m.railLength<=(m.vertical?area.height:area.width)-16);
    assert.ok(m.count>=1&&m.count<=77);assert.ok(m.cardWidth+m.pointer+m.cardGap<=m.width||!m.vertical);
  }
});
test('adicionar um detalhe não muda o orçamento da janela',()=>{const s={...defaultSettings(),accounts:[{enabled:true},{enabled:true}]},area={width:1280,height:680};assert.deepEqual(panelLayout(s,area),panelLayout({...s,detailedCard:true},area));});
test('preferências novas preservam conta, credencial remota e escolhas anteriores',()=>{
  const old={version:1,theme:'dark',showRemaining:true,accounts:[{id:'work',provider:'codex',enabled:true,remoteAccountId:'organization-a',captureFile:'C:\\usage.json'}]};
  const s=validateSettings(old);assert.equal(s.theme,'dark');assert.equal(s.showRemaining,true);assert.equal(s.accounts[0].remoteAccountId,'organization-a');assert.equal(s.accounts[0].captureFile,'C:\\usage.json');assert.equal(s.panelSize,'standard');assert.equal(s.panelColor,'black');
});
