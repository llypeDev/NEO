'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {powershellJSON}=require('../src/special.cjs');
// A fake child process that answers like PowerShell after reading its script from stdin.
function fakeSpawn(reply,code=0){
  const calls=[];
  const spawnProcess=(file,args,options)=>{
    const child=new EventEmitter();child.stdout=new EventEmitter();child.kill=()=>{};
    child.stdin={on(){},end(text){calls.push({file,args,options,text});setImmediate(()=>{child.stdout.emit('data',Buffer.from(reply));child.emit('close',code);});}};
    return child;
  };
  return {calls,spawnProcess};
}
test('o script do PowerShell vai pela entrada padrão, sem comando codificado',async()=>{
  const f=fakeSpawn('[{"command":"language_server --csrf_token abc","ports":[42]}]');
  assert.deepEqual(await powershellJSON('Get-Date',{spawnProcess:f.spawnProcess}),[{command:'language_server --csrf_token abc',ports:[42]}]);
  const [call]=f.calls;assert.equal(call.file,'powershell.exe');assert.deepEqual(call.args,['-NoProfile','-NonInteractive','-Command','-']);
  assert.ok(!call.args.some(a=>/encoded/i.test(a)));assert.equal(call.text,'Get-Date\n');assert.equal(call.options.windowsHide,true);
});
test('saída inválida ou código de erro do PowerShell viram erro',async()=>{
  await assert.rejects(()=>powershellJSON('x',{spawnProcess:fakeSpawn('não é JSON').spawnProcess}),/inválida/);
  await assert.rejects(()=>powershellJSON('x',{spawnProcess:fakeSpawn('[]',1).spawnProcess}),/não concluiu/);
});
test('o PowerShell do Windows executa o script recebido pela entrada padrão',{skip:process.platform!=='win32'&&'Requer o PowerShell do Windows.'},async()=>{
  assert.deepEqual(await powershellJSON("ConvertTo-Json -InputObject @(@{name = 'neo'; value = 2}) -Compress"),[{name:'neo',value:2}]);
});
