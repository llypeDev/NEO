'use strict';
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {activeWindows}=require('./core.cjs');
const directory=process.env.PULSE_WINDOWS_DATA||path.join(process.env.APPDATA||path.join(os.homedir(),'AppData','Roaming'),'Pulse Windows');
try {
  const settings=JSON.parse(fs.readFileSync(path.join(directory,'settings.json'),'utf8'));
  const cache=JSON.parse(fs.readFileSync(path.join(directory,'cache.json'),'utf8'));
  console.log(JSON.stringify({version:1,generatedAt:new Date().toISOString(),accounts:settings.accounts.filter(a=>a.enabled).map(a=>({id:a.id,provider:a.provider,label:a.label,...cache[a.id],windows:activeWindows(cache[a.id]),ageSeconds:cache[a.id]?.observedAt?Math.max(0,Math.round((Date.now()-Date.parse(cache[a.id].observedAt))/1000)):null}))},null,2));
}catch{console.log(JSON.stringify({version:1,accounts:[],message:'Nenhuma leitura salva. Abra o Neo e habilite uma conta.'}));}
