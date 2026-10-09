'use strict';
// Lets a newer Neo take over the profile from an older one that is still running.
const fs=require('node:fs'),path=require('node:path');
function parseVersion(v){const m=/^(\d+)\.(\d+)\.(\d+)/.exec(String(v??''));return m?m.slice(1).map(Number):null;}
function newer(a,b){const x=parseVersion(a),y=parseVersion(b);if(!x||!y)return false;for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];return false;}
// The running Neo records its version here; releases up to 0.3.2 never write it and never quit on request.
function instanceFile(dir){return path.join(dir,'instance.json');}
function running(pid){try{process.kill(pid,0);return true;}catch(e){return e.code==='EPERM';}}
function readHolder(dir){
  try{const h=JSON.parse(fs.readFileSync(instanceFile(dir),'utf8'));return Number.isInteger(h?.pid)&&parseVersion(h.version)?{pid:h.pid,version:h.version}:null;}catch{return null;}
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
// holder is read before the first request, because an older Neo may quit and remove its file as soon as it is asked.
// alive is checked only while another Neo holds the lock, so a file left by a Windows restart is never probed at login.
async function acquireLock({request,version,holder,alive=running,wait=delay}){
  const recorded=holder();
  if(request())return 'acquired';
  const current=recorded&&alive(recorded.pid)?recorded:null;
  if(current&&!newer(version,current.version))return 'running';
  // An older Neo that knows the request quits now; a release without the file keeps the lock for good.
  for(let i=0;i<(current?24:4);i++){
    await wait(250);
    if(request())return 'acquired';
    // Another copy of this version may have taken over meanwhile.
    const now=holder();
    if(now&&!newer(version,now.version)&&alive(now.pid))return 'running';
  }
  return current?'timeout':'legacy';
}
module.exports={parseVersion,newer,instanceFile,readHolder,acquireLock};
