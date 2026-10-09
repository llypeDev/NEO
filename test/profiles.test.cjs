'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parsers}=require('../src/core.cjs');require('../src/providers.cjs');
const fixture=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',name),'utf8'));
const cases=[
 ['atlasCloud','atlas-cloud-balance.json','balance',42.5],
 ['hyper','hyper-credits.json','balance',null],
 ['poe','poe-current-balance.json','balance',null],
 ['elevenLabs','elevenlabs-subscription.json','window',null],
 ['vercelAIGateway','vercel-ai-gateway-credits.json','balance',null],
 ['deepInfra','deepinfra-checklist.json','balance',null],
 ['huggingFace','hugging-face-zero-gpu-quota.json','window',null],
 ['clinePass','clinepass-usage-limits.json','window',null],
 ['clawRouter','clawrouter-usage.json','window',0.024],
 ['synthetic','synthetic-quotas.json','window',null],
 ['openCodeGo','opencode-go-normal.json','window',42.5],
 ['grok','grok-billing-weekly.json','window',42.5],
 ['grokBot','grok-bot-normal.json','window',30],
 ['devPass','devpass-key.json','window',null],
 ['chutes','chutes-subscription-usage.json','window',40],
 ['abacus','abacus-compute-points.json','window',25],
 ['augment','augment-credits.json','window',130946/450000*100],
 ['raycastAI','raycast-ai-credits.json','window',25],
 ['gitKraken','gitkraken-usage.json','window',30],
 ['xKiro','xkiro-usage.json','window',25],
 ['zed','zed-billing-usage.json','window',25],
 ['perplexity','perplexity-credits.json','balance',3.2],
 ['replicate','replicate-unused-credit.json','balance',80],
 ['manus','manus-credits.json','window',75],
 ['mistral','mistral-credits.json','balance',13.25],
 ['typeSafe','typesafe-billing-result.json','balance',4.98],
 ['codebuff','codebuff-usage.json','window',25],
 ['neuralwatt','neuralwatt-quota.json','window',null],
 ['zenMux','zenmux-subscription-detail.json','window',7.15],
 ['v0','v0-billing-token.json','window',null],
 ['nousPortal','nous-portal-account.json','window',75],
 ['longCat','longcat-token-packs.json','window',2.425152],
 ['zoomMate','zoommate-credits-status.json','window',678/12345*100],
 ['devin','devin-quota-usage.json','window',2],
 ['v2ex','v2ex-quota.json','window',25],
 ['qoder','qoder-credits.json','window',25],
 ['stepFun','stepfun-coding-plan.json','window',25],
 ['commandCode','command-code-credits.json','window',25],
 ['kiro','kiro-pro-plus-usage.json','window',123.45/2000*100],
 ['gemini','gemini-retrieve-user-quota.json','window',25],
 ['antigravity','antigravity-quota.json','window',.50932],
 ['alibabaTokenPlan','alibaba-token-plan-cli-usage.json','window',25],
 ['alibabaCodingPlan','alibaba-coding-plan-instances.json','window',5.2],
 ['qwenCloud','qwen-cloud-usage.json','window',3],
 ['volcengine','volcengine-coding-plan.json','window',41.5],
 ['factory','factory-billing-limits.json','window',12],
 ['llmProxy','llm-proxy-quota-stats.json','window',58],
 ['liteLLM','litellm-team-info.json','window',25],
 ['aixy','aixy-usage.json','window',30],
 ['bifrost','bifrost-quota.json','window',25],
 ['kiloCode','kilo-code-trpc-batch.json','balance',null],
 ['amp','amp-balance-tier.json','window',39],
 ['zai','glm-coding-plan-quota.json','window',0],
 ['glmCoding','glm-coding-plan-quota.json','window',0],
 ['minimax','minimax-normal.json','window',4],
 ['minimaxCN','minimax-normal.json','window',4],
 ['xaiAPI','xai-api-prepaid-balance.json','balance',12.34],
 ['windsurf','windsurf-plan-status.json','window',32],
];
// Filenames are deliberately explicit; missing fixtures fail instead of silently skipping coverage.
for(const[id,name,kind,expected]of cases)test(`${id}: resposta original ${name}`,()=>{
  const reading=parsers[id](fixture(name));const values=kind==='window'?reading.windows:reading.balances;
  assert.ok(values.length>0,'Deve reportar pelo menos um valor.');
  if(expected!==null)assert.ok(Math.abs((kind==='window'?values[0].usedPercent:values[0].amount)-expected)<.00001,`Valor esperado ${expected}, recebido ${JSON.stringify(values[0])}`);
  for(const w of reading.windows)assert.ok(Number.isFinite(w.usedPercent)&&w.usedPercent>=0);
});
test('MiniMax antigo informa restante no campo usage_count',()=>assert.equal(parsers.minimax(fixture('minimax-old-endpoint-unwrapped.json')).windows[0].usedPercent,20));
test('Grok Bot sem plano não mostra 0%',()=>assert.equal(parsers.grokBot(fixture('grok-bot-not-included.json')).windows.length,0));
test('Qoder não junta créditos compartilhados aos pessoais',()=>assert.deepEqual(parsers.qoder(fixture('qoder-credits-team.json')).windows.map(w=>w.usedPercent),[100,20]));

test('New API calcula saldo com gasto em centavos e unidade confirmada',()=>{const r={...fixture('newapi-subscription.json'),_secondary:fixture('newapi-usage.json'),_status:fixture('newapi-status-cny.json')};assert.equal(parsers.newAPI(r).balances[0].amount,13.155);assert.equal(parsers.newAPI(r).balances[0].currency,'CNY');assert.equal(parsers.newAPI(r).windows.length,0);});
test('New API não inventa saldo sem gasto ou moeda conhecida',()=>{const r={...fixture('newapi-subscription.json'),_secondary:fixture('newapi-usage.json')};assert.equal(parsers.newAPI(r).balances.length,0);r._status=fixture('newapi-status-tokens.json');assert.equal(parsers.newAPI(r).balances.length,0);delete r._secondary;r._status=fixture('newapi-status-usd.json');assert.equal(parsers.newAPI(r).balances.length,0);});
test('ClawRouter sem orçamento não cria cota',()=>assert.equal(parsers.clawRouter(fixture('clawrouter-usage-unmetered.json')).windows.length,0));
test('JetBrains aceita contadores do arquivo local',()=>assert.equal(parsers.jetBrainsAI({quotaInfo:{current:10,maximum:40},nextRefill:{next:'2099-01-01'}}).windows[0].usedPercent,25));
test('IBM Bob agrega somente equipes com orçamento conhecido',()=>{assert.equal(parsers.ibmBob({teams:[{used:10,budget:40},{used:20,budget:60}]}).windows[0].usedPercent,30);assert.equal(parsers.ibmBob({teams:[{used:10}]}).windows.length,0);});
test('T3 Chat preserva percentuais JSONL',()=>{const r=fs.readFileSync(path.join(__dirname,'fixtures','t3-chat-customer-data.json'),'utf8').split('\n').filter(Boolean).map(JSON.parse);assert.deepEqual(parsers.t3Chat(r).windows.map(w=>w.usedPercent),[12.5,34.25]);});
test('Ollama exige ambas as janelas e rejeita porcentagem ausente',()=>{const html='<h3>Session usage</h3><p>12% used</p><h3>Weekly usage</h3><p>34.5% used</p>';assert.deepEqual(parsers.ollamaCloud(html).windows.map(w=>w.usedPercent),[12,34.5]);assert.equal(parsers.ollamaCloud('<h3>Session usage</h3><p>12% used</p>').windows.length,0);});
test('Sakana lê apenas valores da página e não executa scripts',()=>{const r=parsers.sakana({html:'<p>5-hour</p><p>37% used</p><p>Weekly</p><p>50% used</p><script>throw Error()</script>'});assert.deepEqual(r.windows.map(w=>w.usedPercent),[37,50]);});
test('Xiaomi exige resposta de plano válida',()=>{const r=fixture('xiaomi-plan-usage.json');r._secondary=fixture('xiaomi-plan-detail.json');assert.equal(parsers.xiaomiMiMo(r).windows[0].usedPercent,37.5);});
test('Sub2API identifica dinheiro, cotas e assinaturas',()=>{assert.equal(parsers.sub2api(fixture('sub2api-wallet.json')).windows.length,0);assert.equal(parsers.sub2api(fixture('sub2api-quota.json')).windows[0].usedPercent,25);assert.equal(parsers.sub2api(fixture('sub2api-subscription.json')).windows.length,2);});
test('77 provedores têm rota e parser, sem habilitar serviços por padrão',()=>{
  const registry=require('../src/registry.cjs'),{defaultSettings}=require('../src/storage.cjs');
  assert.equal(registry.filter(p=>p.live).length,77);for(const p of registry)assert.equal(typeof parsers[p.id],'function');assert.deepEqual(defaultSettings().accounts,[]);
});
