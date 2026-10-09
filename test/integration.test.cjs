'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {fetchAccount,requestJSON,gatewayURL,cursorCookie}=require('../src/providers.cjs');
const {Storage,validateSettings}=require('../src/storage.cjs');
const {scanHistory}=require('../src/ledger.cjs');
const temporaryRoot=process.env.PULSE_TEST_TMP||os.tmpdir();
test('consulta Codex usa só o endpoint autorizado e vincula a conta remota',async()=>{
  const requests=[];const fetcher=async(url,opts)=>{requests.push({url,opts});return new Response(JSON.stringify({rate_limit:{primary_window:{used_percent:24,limit_window_seconds:18000}}}),{status:200});};
  const r=await fetchAccount({id:'work',provider:'codex',remoteAccountId:'account-work'},'fake-secret',fetcher);
  assert.equal(r.state,'live');assert.equal(r.windows[0].usedPercent,24);assert.equal(requests[0].url,'https://chatgpt.com/backend-api/wham/usage');assert.equal(requests[0].opts.headers['ChatGPT-Account-Id'],'account-work');assert.equal(requests[0].opts.redirect,'error');assert.ok(!JSON.stringify(r).includes('fake-secret'));
});
test('credencial inválida não aparece em mensagens ou leituras',async()=>{const r=await fetchAccount({id:'x',provider:'copilot'},'private-token',async()=>new Response('{}',{status:401}));assert.equal(r.state,'unavailable');assert.ok(!JSON.stringify(r).includes('private-token'));assert.match(r.error,/recusou/);});

test('Devin usa organização normalizada e só tenta alternativa após 404',async()=>{
  const {fetchSpecial}=require('../src/special.cjs');const urls=[];
  await fetchSpecial({provider:'devin'},JSON.stringify({token:'dummy',organizationId:'acme'}),async(url,opts)=>{urls.push(url);assert.equal(opts.headers['x-cog-org-id'],undefined);return {};});
  assert.deepEqual(urls,['https://app.devin.ai/api/org/acme/billing/quota/usage']);
  let calls=0;await assert.rejects(()=>fetchSpecial({provider:'devin'},JSON.stringify({token:'dummy',organizationId:'org_a'}),async()=>{calls++;throw Error('HTTP 401');}));assert.equal(calls,1);
});
test('Warp inclui contexto Windows e consulta créditos de workspace',async()=>{
  const r=await fetchAccount({id:'w',provider:'warp'},'dummy',async(_,opts)=>{const body=JSON.parse(opts.body);assert.match(body.query,/user\(requestContext:/);assert.match(body.query,/workspaces/);assert.equal(body.variables.requestContext.osContext.category,'Windows');return new Response(JSON.stringify({data:{user:{user:{requestLimitInfo:{requestLimit:100,requestsUsedSinceLastRefresh:25},workspaces:[{bonusGrantsInfo:{grants:[{requestCreditsRemaining:40,requestCreditsGranted:50}]}}]}}}}));});
  assert.equal(r.state,'live');assert.deepEqual(r.windows.map(w=>w.usedPercent),[25,20]);
});
test('New API consulta unidade pública sem enviar chave',async()=>{
  const r=await fetchAccount({id:'n',provider:'newAPI',baseUrl:'https://gateway.example'},'dummy-key',async(url,opts)=>{
    if(url.endsWith('/api/status')){assert.equal(opts.headers.Authorization,undefined);return new Response(JSON.stringify({data:{quota_display_type:'CNY'}}));}
    assert.equal(opts.headers.Authorization,'Bearer dummy-key');return new Response(JSON.stringify(url.endsWith('/usage')?{total_usage:500}:{hard_limit_usd:25}));
  });assert.equal(r.balances[0].amount,20);assert.equal(r.balances[0].currency,'CNY');
});
test('sem credencial e login local desligado, nenhuma conexão é feita',async()=>{let calls=0;const r=await fetchAccount({id:'x',provider:'codex',localAuth:false},null,()=>{calls++;});assert.equal(calls,0);assert.equal(r.state,'unavailable');});
test('HTTP externo e redirects com cookies são recusados',async()=>{let calls=0;await assert.rejects(()=>requestJSON('http://example.com',{headers:{Cookie:'s=secret'}},()=>{calls++;}));assert.equal(calls,0);await requestJSON('https://example.com',{headers:{Cookie:'s=secret'}},async(_,options)=>{assert.equal(options.redirect,'error');return new Response('{}');});});
test('gateways preservam caminho-base e rejeitam credencial em URL',()=>{assert.equal(gatewayURL('https://example.com/relay/v1','/v1/usage'),'https://example.com/relay/v1/usage');assert.throws(()=>gatewayURL('https://user:password@example.com','/v1/usage'));});
test('armazenamento recebe somente a forma protegida da credencial',async()=>{
  const dir=await fs.mkdtemp(path.join(temporaryRoot,'pulse-store-'));
  const encryption={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s.split('').reverse().join('')),decryptString:b=>b.toString().split('').reverse().join('')};
  const store=new Storage(dir,encryption);store.saveCredential('account','private-key');assert.equal(store.credential('account'),'private-key');assert.ok(!(await fs.readFile(path.join(dir,'secrets.json'),'utf8')).includes('private-key'));store.deleteCredential('account');assert.equal(store.credential('account'),null);
});
test('cache de contas é isolado e configurações rejeitam IDs duplicados',()=>{assert.throws(()=>validateSettings({accounts:[{id:'same',provider:'codex'},{id:'same',provider:'claude'}]}));const settings=validateSettings({accounts:[{id:'a',provider:'codex',enabled:true},{id:'b',provider:'codex',enabled:false}]});assert.equal(settings.accounts[1].enabled,false);});
test('extensão local lê apenas seu JSON e usa a data real do arquivo',async()=>{
  const dir=await fs.mkdtemp(path.join(temporaryRoot,'pulse-extension-')),file=path.join(dir,'usage.json');await fs.writeFile(file,JSON.stringify({windows:[{id:'daily',label:'Diário',usedPercent:42}]}));
  const r=await fetchAccount({id:'extension',provider:'extension',file},null,()=>{throw Error('Não deve acessar rede.');});assert.equal(r.windows[0].usedPercent,42);assert.equal(r.source,'Arquivo local');assert.ok(r.observedAt);
});
test('histórico deduplica contadores e descarta texto das mensagens',async()=>{
  const home=await fs.mkdtemp(path.join(temporaryRoot,'pulse-ledger-')),codex=path.join(home,'.codex','sessions'),claude=path.join(home,'.claude','projects');await fs.mkdir(codex,{recursive:true});await fs.mkdir(claude,{recursive:true});const timestamp=new Date().toISOString();
  const record={timestamp,type:'event_msg',payload:{type:'token_count',info:{total_token_usage:{total_tokens:30},last_token_usage:{input_tokens:20,output_tokens:10,total_tokens:30}}}};
  await fs.writeFile(path.join(codex,'test.jsonl'),[{type:'turn_context',payload:{model:'example-model'}},record,record].map(JSON.stringify).join('\n'));
  await fs.writeFile(path.join(claude,'test.jsonl'),JSON.stringify({timestamp,type:'assistant',message:{id:'msg1',model:'example-model',content:'private prompt',usage:{input_tokens:20,output_tokens:10,cache_read_input_tokens:5}}}));
  const ledger=await scanHistory({home,env:{}});assert.equal(ledger.records,2);assert.equal(ledger.total,65);assert.ok(!JSON.stringify(ledger).includes('private prompt'));
});
test('conta de provedor desconhecido não apaga as demais e o original fica em cópia',async()=>{
  const dir=await fs.mkdtemp(path.join(temporaryRoot,'pulse-profile-')),file=path.join(dir,'settings.json');
  await fs.writeFile(file,JSON.stringify({version:3,theme:'light',accounts:[{id:'a',provider:'codex',enabled:true},{id:'b',provider:'removedProvider',enabled:true},{id:'a',provider:'claude'}]}));
  const settings=new Storage(dir,{}).settings();assert.deepEqual(settings.accounts.map(a=>a.id),['a']);assert.equal(settings.theme,'light');
  const copies=(await fs.readdir(dir)).filter(f=>f.startsWith('settings.invalid-'));assert.equal(copies.length,1);assert.match(await fs.readFile(path.join(dir,copies[0]),'utf8'),/removedProvider/);
  new Storage(dir,{}).settings();assert.equal((await fs.readdir(dir)).filter(f=>f.startsWith('settings.invalid-')).length,1);
  assert.throws(()=>validateSettings({accounts:[{id:'b',provider:'removedProvider'}]}));
});
test('perfil e credenciais corrompidos são copiados antes de voltar ao padrão',async()=>{
  const dir=await fs.mkdtemp(path.join(temporaryRoot,'pulse-damaged-'));await fs.writeFile(path.join(dir,'settings.json'),'{"accounts":[');await fs.writeFile(path.join(dir,'secrets.json'),'[1]');
  const store=new Storage(dir,{});assert.deepEqual(store.settings().accounts,[]);assert.equal(store.hasCredential('x'),false);
  const files=await fs.readdir(dir);assert.equal(files.filter(f=>f.startsWith('settings.invalid-')).length,1);assert.equal(files.filter(f=>f.startsWith('secrets.invalid-')).length,1);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir,'secrets.json'),'utf8')),{});
});
test('tema inválido volta ao tema do sistema',()=>{assert.equal(validateSettings({accounts:[],theme:'sepia'}).theme,'system');});
