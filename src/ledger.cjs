'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const readline = require('node:readline');
const {createReadStream} = require('node:fs');
const {finite} = require('./core.cjs');
async function filesUnder(dir, limit = 1500) {
  const result = [], queue = [dir];
  while (queue.length && result.length < limit) {
    let items; const current = queue.shift();
    try {items = await fs.readdir(current,{withFileTypes:true});} catch {continue;}
    for (const f of items) {if(f.isDirectory())queue.push(path.join(current,f.name));else if(f.isFile()&&f.name.endsWith('.jsonl'))result.push(path.join(current,f.name));if(result.length>=limit)break;}
  }
  return {files:result,truncated:queue.length>0};
}
async function scanHistory({home = os.homedir(), env = process.env, now = Date.now(), days = 31} = {}) {
  const roots = [{provider:'codex',dir:path.join(env.CODEX_HOME||path.join(home,'.codex'),'sessions')},{provider:'claude',dir:path.join(env.CLAUDE_CONFIG_DIR||path.join(home,'.claude'),'projects')}];
  const models = new Map(), daily = new Map(), seen = new Set();
  let count=0, skipped=0, partial=false;
  for (const root of roots) {
    const inventory=await filesUnder(root.dir);partial ||= inventory.truncated;
    for (const file of inventory.files) {
      const stat=await fs.stat(file).catch(()=>null);
      if(!stat||stat.mtimeMs<now-days*86400000||stat.size>100*1024*1024){if(stat?.size>100*1024*1024)partial=true;continue;}
      let currentModel='Não informado';
      const stream=createReadStream(file,{encoding:'utf8'});
      try {
        for await (const line of readline.createInterface({input:stream,crlfDelay:Infinity})) {
          let r;try {r=JSON.parse(line);}catch{skipped++;continue;}
          if(r.type==='turn_context'&&r.payload?.model)currentModel=r.payload.model;
          const stamp=Date.parse(r.timestamp);
          if(!Number.isFinite(stamp)||stamp<now-days*86400000||stamp>now)continue;
          let usage,key,model;
          if(root.provider==='codex'&&r.type==='event_msg'&&r.payload?.type==='token_count'){
            usage=r.payload.info?.last_token_usage;
            // Repeated token_count signals with the same cumulative counters are one observation.
            key=`codex|${file}|${JSON.stringify(r.payload.info?.total_token_usage)}`;
            model=currentModel;
          }else if(root.provider==='claude'&&r.type==='assistant'&&r.message?.usage){
            usage=r.message.usage; key=`claude|${r.message.id||file+'|'+r.uuid}`;model=r.message.model||currentModel;
          }else continue;
          if(!usage||seen.has(key))continue;seen.add(key);
          const input=Math.max(0,finite(usage.input_tokens)||0), output=Math.max(0,finite(usage.output_tokens)||0);
          const cached=Math.max(0,finite(usage.cached_input_tokens??usage.cache_read_input_tokens)||0),creation=Math.max(0,finite(usage.cache_creation_input_tokens)||0);
          const total=root.provider==='codex'?(finite(usage.total_tokens)??input+output):input+output+cached+creation;
          const bucket=new Date(stamp).toLocaleDateString('en-CA');
          const day=daily.get(bucket)||{date:bucket,total:0};day.total+=total;daily.set(bucket,day);
          const mk=root.provider+'|'+model,m=models.get(mk)||{provider:root.provider,model,input:0,output:0,cached:0,creation:0,total:0};
          m.input+=input;m.output+=output;m.cached+=cached;m.creation+=creation;m.total+=total;models.set(mk,m);count++;
        }
      }catch{partial=true;}finally{stream.destroy();}
    }
  }
  return {days,scannedAt:new Date().toISOString(),records:count,skipped,partial,models:[...models.values()].sort((a,b)=>b.total-a.total),daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),total:[...models.values()].reduce((a,m)=>a+m.total,0), note:'Contadores locais de Codex e Claude Code. Não equivalem à cota da assinatura. Custos não são estimados sem uma tabela de preços validada.'};
}
module.exports={scanHistory,filesUnder};
