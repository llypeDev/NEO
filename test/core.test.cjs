'use strict';

require('node:test')('valores ausentes e estruturas não viram zero',()=>{const {finite}=require('../src/core.cjs'),assert=require('node:assert/strict');for(const v of [null,undefined,'', ' ',false,[],{},[1]])assert.equal(finite(v),null);assert.equal(finite(0),0);});
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {parsers,finite,activeWindows,reconcile,alerts,headline,forecast}=require('../src/core.cjs');
require('../src/providers.cjs');
const fixture=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',name),'utf8'));
test('números ausentes e booleanos não viram zero',()=>{for(const value of [null,undefined,'',true,false,'NaN','Infinity'])assert.equal(finite(value),null);assert.equal(finite('0'),0);});
test('Codex distingue a duração do slot e preserva limites por modelo',()=>{
  const p=parsers.codex({plan_type:'pro',rate_limit:{allowed:false,primary_window:{used_percent:98,limit_window_seconds:604800,reset_at:2000000000},secondary_window:{used_percent:20,limit_window_seconds:18000,reset_at:2000000000}},additional_rate_limits:[{limit_name:'Opus',rate_limit:{primary_window:{used_percent:42,limit_window_seconds:18000}}}]});
  assert.equal(p.windows.length,3);assert.equal(p.windows[0].label,'Semanal');assert.equal(p.windows[0].exhausted,true);assert.equal(p.windows[1].exhausted,false);assert.equal(p.windows[2].usedPercent,42);
});
test('Claude warning preserva a cota disponível; bloqueio pertence ao serviço',()=>{
  const p=parsers.claude({limits:[{kind:'weekly_scoped',percent:76,severity:'warning',scope:{model:{display_name:'Opus'}}},{kind:'session',percent:60,locked_reason:'spent'}]});
  assert.equal(p.windows[0].exhausted,false);assert.equal(p.windows[1].exhausted,true);assert.match(p.windows[0].label,/Opus/);
});
test('Copilot inverte percent_remaining, oculta unlimited e respeita overage',()=>{
  assert.equal(parsers.copilot(fixture('copilot-normal.json')).windows[0].usedPercent,30);
  const p=parsers.copilot({quota_snapshots:{premium_interactions:{percent_remaining:0,overage_permitted:true},chat:{percent_remaining:100,unlimited:true},completions:{}}});
  assert.equal(p.windows.length,1);assert.equal(p.windows[0].exhausted,false);
});
test('Cursor trata frações aparentes como percentuais e separa os dois pools',()=>{
  const p=parsers.cursor({individualUsage:{plan:{autoPercentUsed:0.0267,apiPercentUsed:1.2,remaining:20}}});
  assert.equal(p.windows[0].usedPercent,0.0267);assert.equal(p.windows.length,2);assert.equal(p.balances[0].amount,.2);
});
test('Kimi usa unidades do serviço e ignora as desconhecidas',()=>{
  const p=parsers.kimi(fixture('kimi-code-normal.json'));
  assert.deepEqual(p.windows.map(w=>w.usedPercent),[40,70,25]);assert.equal(p.windows[0].windowSeconds,18000);assert.equal(p.windows[2].windowSeconds,null);
});
test('DeepSeek preserva saldo sem inventar percentual',()=>{const p=parsers.deepseek({is_available:true,balance_infos:[{currency:'USD',total_balance:'18.42'}]});assert.equal(p.windows.length,0);assert.equal(p.balances[0].amount,18.42);});
test('cache remove janelas renovadas e nunca faz dado ausente parecer zero',()=>{
  const now=Date.now(),old={state:'live',observedAt:new Date(now-60000).toISOString(),windows:[{id:'expired',usedPercent:100,resetsAt:new Date(now-1).toISOString()},{id:'valid',usedPercent:20,resetsAt:new Date(now+5000).toISOString()}],balances:[]};
  const merged=reconcile({state:'unavailable',error:'offline'},old,now);assert.equal(merged.state,'stale');assert.equal(merged.windows.length,1);assert.equal(merged.windows[0].id,'valid');assert.equal(headline(old,'expired',now).id,'valid');
  assert.equal(reconcile({state:'unavailable'}, {...old,windows:[old.windows[0]]},now).state,'unavailable');
});
test('alertas disparam uma vez por nível e uma renovação depende de evidência',()=>{
  const sent={},current={state:'live',windows:[{id:'x',usedPercent:95,resetsAt:'2099-01-01T00:00:00Z',exhausted:false}]};
  assert.equal(alerts(null,current,90,sent).length,1);assert.equal(alerts(null,current,90,sent).length,0);
  const blocked={...current,windows:[{...current.windows[0],exhausted:true}]};assert.equal(alerts(current,blocked,90,sent)[0].type,'spent');
  assert.equal(alerts(current,{state:'stale',windows:current.windows},90,sent).length,0);
  const reset={...current,windows:[{...current.windows[0],usedPercent:1,resetsAt:'2099-01-02T00:00:00Z'}]};assert.equal(alerts(blocked,reset,90,sent)[0].type,'reset');
});
test('previsão exige duas leituras atuais da mesma janela',()=>{
  const now=Date.now(),previous={state:'live',observedAt:new Date(now-60000).toISOString(),windows:[{id:'x',usedPercent:10,resetsAt:new Date(now+3600000).toISOString()}]},current={state:'live',observedAt:new Date(now).toISOString(),windows:[{...previous.windows[0],usedPercent:20}]};
  assert.equal(forecast(previous,current,now).etaSeconds,480);assert.equal(forecast(previous,{...current,state:'stale'},now),null);
});
test('extensão rejeita percentuais ausentes e IDs duplicados',()=>{
  assert.throws(()=>parsers.extension({windows:[{id:'x',label:'Cota'}]}));assert.throws(()=>parsers.extension({windows:[{id:'x',label:'A',usedPercent:1},{id:'x',label:'B',usedPercent:2}]}));
});
