'use strict';
module.exports=function demo(registry){
  const observedAt=new Date().toISOString(), reset=h=>new Date(Date.now()+h*3600000).toISOString();
  const accounts=['codex','claude','cursor','copilot','deepseek'].map(provider=>({id:provider,provider,label:provider==='codex'?'Pessoal':'',enabled:true,localAuth:true}));
  const sample={codex:[24,62,'Plus'],claude:[76,41,'Max 5x'],cursor:[12,34,'Pro'],copilot:[33,8,'Individual']};
  const readings={};
  for(const a of accounts){const values=sample[a.id];readings[a.id]={accountId:a.id,state:'live',observedAt,attemptedAt:observedAt,source:'Demonstração · dados fictícios',plan:values?.[2]||'Pré-pago',windows:values?[{id:'primary',label:a.id==='copilot'?'Requisições premium':'5 horas',usedPercent:values[0],resetsAt:reset(3.2),windowSeconds:18000,exhausted:false},{id:'secondary',label:'Semanal',usedPercent:values[1],resetsAt:reset(92),windowSeconds:604800,exhausted:false}]:[],balances:a.id==='deepseek'?[{currency:'USD',amount:18.42}]:[]};}
  return{accounts,readings};
};
