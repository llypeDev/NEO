'use strict';
// Lets a newer Neo take over the profile from an older one that is still running.
const fs=require('node:fs'),path=require('node:path');
function parseVersion(v){const m=/^(\d+)\.(\d+)\.(\d+)/.exec(String(v??''));return m?m.slice(1).map(Number):null;}
function newer(a,b){const x=parseVersion(a),y=parseVersion(b);if(!x||!y)return false;for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];return false;}
// The running Neo records its version here; releases up to 0.3.2 never write it and never quit on request.
function instanceFile(dir){return path.join(dir,'instance.json');}
function running(pid){try{process.kill(pid,0);return true;}catch(e){return e.code==='EPERM';}}
function readHolder(dir,alive=running){
  try{const h=JSON.parse(fs.readFileSync(instanceFile(dir),'utf8'));return Number.isInteger(h?.pid)&&parseVersion(h.version)&&alive(h.pid)?{pid:h.pid,version:h.version}:null;}catch{return null;}
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
// holder is read before the first request, because an older Neo may quit and remove its file as soon as it is asked.
async function acquireLock({request,version,holder,wait=delay}){
  const current=holder();
  if(request())return 'acquired';
  if(!current)return 'legacy';
  if(!newer(version,current.version))return 'running';
  for(let i=0;i<24;i++){await wait(250);if(request())return 'acquired';}
  return 'timeout';
}
module.exports={parseVersion,newer,instanceFile,readHolder,acquireLock};
