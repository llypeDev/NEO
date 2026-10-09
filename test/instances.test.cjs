'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {newer,instanceFile,readHolder,acquireLock}=require('../src/instances.cjs');
const temporaryRoot=process.env.PULSE_TEST_TMP||os.tmpdir();
// The fake holder releases the lock after it has been asked a number of times.
function lock(quitsAfter=Infinity){const state={requests:0};state.request=()=>++state.requests>quitsAfter;return state;}
const wait=async()=>{};
test('versões são comparadas por número, e valores inválidos nunca são mais novos',()=>{
  assert.equal(newer('0.3.3','0.3.2'),true);assert.equal(newer('0.10.0','0.9.9'),true);assert.equal(newer('0.3.2.0','0.3.2'),false);
  assert.equal(newer('0.3.2','0.3.3'),false);assert.equal(newer(undefined,'0.3.2'),false);assert.equal(newer('Neo','0.3.2'),false);
});
test('o arquivo da instância só vale para um processo vivo com versão válida',()=>{
  const dir=fs.mkdtempSync(path.join(temporaryRoot,'neo-instance-'));
  assert.equal(readHolder(dir,()=>true),null);
  fs.writeFileSync(instanceFile(dir),JSON.stringify({version:'0.3.3',pid:42}));
  assert.deepEqual(readHolder(dir,()=>true),{version:'0.3.3',pid:42});assert.equal(readHolder(dir,()=>false),null);
  fs.writeFileSync(instanceFile(dir),'{"version":"x","pid":42}');assert.equal(readHolder(dir,()=>true),null);
  fs.writeFileSync(instanceFile(dir),'{');assert.equal(readHolder(dir,()=>true),null);
  fs.writeFileSync(instanceFile(dir),JSON.stringify({version:'0.3.3',pid:process.pid}));assert.equal(readHolder(dir).pid,process.pid);
});
test('sem outra instância, o lock é obtido na primeira tentativa',async()=>{
  const l=lock(0);assert.equal(await acquireLock({request:l.request,version:'0.3.3',holder:()=>null,wait}),'acquired');assert.equal(l.requests,1);
});
test('sem o arquivo, a instância aberta é anterior à entrega e a pessoa precisa fechá-la',async()=>{
  const l=lock();assert.equal(await acquireLock({request:l.request,version:'0.3.3',holder:()=>null,wait}),'legacy');assert.equal(l.requests,1);
});
test('uma versão igual ou mais nova continua aberta sem espera',async()=>{
  for(const v of ['0.3.3','0.3.4']){const l=lock();assert.equal(await acquireLock({request:l.request,version:'0.3.3',holder:()=>({pid:1,version:v}),wait}),'running');assert.equal(l.requests,1);}
});
test('uma versão anterior que conhece o pedido sai e a nova assume',async()=>{
  const l=lock(3);assert.equal(await acquireLock({request:l.request,version:'0.3.4',holder:()=>({pid:1,version:'0.3.3'}),wait}),'acquired');assert.equal(l.requests,4);
});
test('uma versão anterior que não sai em 6 segundos leva ao aviso',async()=>{
  const l=lock();assert.equal(await acquireLock({request:l.request,version:'0.3.4',holder:()=>({pid:1,version:'0.3.3'}),wait}),'timeout');assert.equal(l.requests,25);
});
test('o arquivo é lido antes do pedido, porque a anterior pode apagá-lo ao sair',async()=>{
  const order=[];await acquireLock({request:()=>{order.push('request');return false;},version:'0.3.3',holder:()=>{order.push('holder');return null;},wait});
  assert.deepEqual(order,['holder','request']);
});
