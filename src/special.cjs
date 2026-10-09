'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {spawn,execFile}=require('node:child_process');
const crypto=require('node:crypto');
const {version}=require('../package.json');
const specialIds=new Set(['kiro','antigravity','ollamaCloud','volcengine','alibabaCodingPlan','alibabaTokenPlan','qwenCloud','notionAI','ibmBob','xaiAPI','windsurf','sakana','replicate','typeSafe','jetBrainsAI','devin','zoomMate']);
function fail(message){throw new Error(message);}
function required(text){if(!text?.trim())fail('Insira uma credencial para este serviço.');return text.trim().replace(/^Cookie:\s*/i,'');}
function cookieValue(cookie,name){return cookie.split(';').map(p=>p.trim()).find(p=>p.startsWith(name+'='))?.slice(name.length+1);}
function objects(root,predicate){const queue=[root],found=[];let count=0;while(queue.length&&count++<4000){const o=queue.shift();if(o&&typeof o==='object'){if(!Array.isArray(o)&&predicate(o))found.push(o);queue.push(...Object.values(o).filter(x=>x&&typeof x==='object'));}}return found;}
function protobufFields(data){
  let offset=0;const result=[];
  const number=()=>{let v=0,m=1;for(let i=0;i<8&&offset<data.length;i++){const b=data[offset++];v+=(b&127)*m;if(!(b&128)&&Number.isSafeInteger(v))return v;m*=128;}fail('Protobuf inválido.');};
  while(offset<data.length){const key=number(),field=Math.floor(key/8),wire=key%8;if(!field)fail('Protobuf inválido.');if(wire===0)result.push([field,number()]);else if(wire===2){const length=number();if(length>data.length-offset)fail('Protobuf truncado.');result.push([field,data.subarray(offset,offset+length)]);offset+=length;}else if(wire===1||wire===5){offset+=wire===1?8:4;if(offset>data.length)fail('Protobuf truncado.');}else fail('Tipo Protobuf inválido.');}return result;
}
function decodePlanStatus(data){
  const status=protobufFields(data).find(([f,v])=>f===1&&Buffer.isBuffer(v))?.[1];if(!status)fail('Plano não informado.');
  const out={};for(const[f,v]of protobufFields(status)){if(f===1&&Buffer.isBuffer(v)){const name=protobufFields(v).find(([f])=>f===2)?.[1];if(Buffer.isBuffer(name))out.planName=name.toString('utf8');}else if({14:'dailyRemaining',15:'weeklyRemaining',17:'dailyResetAt',18:'weeklyResetAt'}[f])out[{14:'dailyRemaining',15:'weeklyRemaining',17:'dailyResetAt',18:'weeklyResetAt'}[f]]=v;}return out;
}
function varint(v){const bytes=[];while(v>=128){bytes.push((v%128)|128);v=Math.floor(v/128);}bytes.push(v);return Buffer.from(bytes);}
function safeEnvironment(){const env={};for(const key of ['PATH','Path','SystemRoot','WINDIR','USERPROFILE','HOME','APPDATA','LOCALAPPDATA','TEMP','TMP','HTTP_PROXY','HTTPS_PROXY','NO_PROXY'])if(process.env[key])env[key]=process.env[key];return env;}
async function executable(name){
  // Relative or empty PATH entries would resolve the CLI from the current directory.
  const directories=(process.env.PATH||'').split(path.delimiter).filter(d=>d&&path.isAbsolute(d));
  directories.push(path.join(os.homedir(),'.local','bin'),path.join(os.homedir(),'.npm-global','bin'));
  for(const dir of directories)for(const extension of process.platform==='win32'?['.exe','.cmd','']:['']){const file=path.join(dir,name+extension);try{const stat=await fs.stat(file);if(stat.isFile())return file;}catch{}}
  fail(`Instale e autentique o CLI ${name}, ou use uma resposta JSON exportada.`);
}
function start(binary,args){
  const options={windowsHide:true,env:safeEnvironment(),stdio:['pipe','pipe','pipe']};
  if(binary.endsWith('.cmd')){if(/["&|<>^%\r\n]/.test(binary)||args.some(a=>/["&|<>^%\r\n]/.test(a)))fail('Caminho do CLI inválido.');return spawn(process.env.ComSpec||'cmd.exe',['/d','/s','/c',`""${binary}" ${args.map(a=>'"'+a+'"').join(' ')}"`],options);}
  return spawn(binary,args,options);
}
async function runCLI(name,args){
  const binary=await executable(name);
  return new Promise((resolve,reject)=>{const child=start(binary,args),chunks=[];let size=0,settled=false;const finish=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);child.kill();err?reject(err):resolve(value);};const timer=setTimeout(()=>finish(new Error('O CLI excedeu o prazo de consulta.')),20000);child.stdout.on('data',b=>{size+=b.length;if(size>1024*1024)finish(new Error('Resposta do CLI muito grande.'));else chunks.push(b);});child.stderr.on('data',()=>{});child.on('error',()=>finish(new Error('Não foi possível abrir o CLI.')));child.on('exit',code=>{if(code!==0)finish(new Error('O CLI não conseguiu consultar a conta.'));else{try{finish(null,JSON.parse(Buffer.concat(chunks).toString()));}catch{finish(new Error('Resposta JSON do CLI inválida.'));}}});});
}
async function kiroUsage(){
  const binary=await executable('kiro-cli');
  return new Promise((resolve,reject)=>{
    const child=start(binary,['acp','--agent-engine','v3','--auth-method','cli']);let buffer='',done=false;
    const finish=(err,data)=>{if(done)return;done=true;clearTimeout(timer);child.kill();err?reject(err):resolve(data);};
    const timer=setTimeout(()=>finish(new Error('A conexão com Kiro excedeu o prazo.')),30000);
    const send=(id,method,params={})=>child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
    child.stderr.on('data',()=>{});child.on('error',()=>finish(new Error('Kiro CLI indisponível.')));child.on('exit',()=>{if(!done)finish(new Error('A conexão com Kiro foi encerrada.'));});
    child.stdin.on('error',()=>finish(new Error('Kiro CLI encerrou a conexão.')));
    child.stdout.on('data',chunk=>{buffer+=chunk.toString();if(buffer.length>1024*1024){finish(new Error('Resposta de Kiro muito grande.'));return;}let at;while((at=buffer.indexOf('\n'))>=0){let message;try{message=JSON.parse(buffer.slice(0,at));}catch{}buffer=buffer.slice(at+1);if(message?.error)finish(new Error('Kiro recusou a consulta.'));else if(message?.id===1)send(2,'_kiro/account/getUsage');else if(message?.id===2)finish(null,message.result);}});
    send(1,'initialize',{protocolVersion:1,clientCapabilities:{},clientInfo:{name:'Neo',version}});
  });
}
async function jetbrainsQuota(){
  const candidates=[];
  for(const base of [path.join(process.env.APPDATA||'','JetBrains'),path.join(process.env.APPDATA||'','Google')]){
    let entries;try{entries=await fs.readdir(base,{withFileTypes:true});}catch{continue;}
    for(const d of entries.filter(d=>d.isDirectory())){const file=path.join(base,d.name,'options','AIAssistantQuotaManager2.xml');const stat=await fs.stat(file).catch(()=>null);if(stat?.isFile())candidates.push({file,mtime:stat.mtimeMs});}
  }
  candidates.sort((a,b)=>b.mtime-a.mtime);if(!candidates.length)fail('Abra uma IDE JetBrains com AI Assistant ativo.');
  const text=await fs.readFile(candidates[0].file,'utf8');
  const out={};for(const name of ['quotaInfo','nextRefill']){
    const element=[...text.matchAll(/<option\b[^>]*>/g)].find(m=>new RegExp(`name=["']${name}["']`).test(m[0]))?.[0];
    const value=element?.match(/value="([^"]*)"/)?.[1]?.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
    if(value)try{out[name]=JSON.parse(value);}catch{}
  }return out;
}
async function antigravityQuota(){
  const command="$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name; $out = @(); Get-CimInstance Win32_Process -Filter \"Name LIKE 'language_server%'\" | ForEach-Object { $proc = $_; $owner = Invoke-CimMethod -InputObject $proc -MethodName GetOwner -ErrorAction SilentlyContinue; if (($owner.Domain + '\\' + $owner.User) -eq $identity -and $proc.CommandLine -match 'antigravity') { $ports = @(Get-NetTCPConnection -OwningProcess $proc.ProcessId -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort -Unique); $out += @{command=$proc.CommandLine;ports=$ports} } }; ConvertTo-Json -InputObject $out -Compress -Depth 5";
  const servers=await new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{windowsHide:true,timeout:15000,maxBuffer:512*1024},(err,stdout)=>{if(err)reject(new Error('Não foi possível localizar Antigravity.'));else try{resolve(JSON.parse(stdout));}catch{reject(new Error('Antigravity não foi localizado.'));}}));
  const https=require('node:https');
  for(const server of servers){const token=server.command.match(/--csrf_token(?:=|\s+)["']?([^\s"']+)/)?.[1];if(!token)continue;for(const port of server.ports||[]){if(!Number.isInteger(port)||port<1||port>65535)continue;
    try{return await new Promise((resolve,reject)=>{const req=https.request({hostname:'127.0.0.1',port,path:'/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary',method:'POST',rejectUnauthorized:false,timeout:3000,headers:{'Content-Type':'application/json','x-codeium-csrf-token':token}},res=>{let text='';res.on('data',b=>{text+=b;if(text.length>1024*1024)req.destroy();});res.on('end',()=>{if(res.statusCode!==200)return reject(new Error('RPC indisponível.'));try{const data=JSON.parse(text);if(!data.response?.groups?.length)return reject(new Error('Sem cota neste processo.'));resolve(data);}catch{reject(new Error('RPC inválido.'));}});});req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('Tempo excedido.')));req.end('{}');});}catch{}
  }}fail('Abra o Antigravity para disponibilizar o servidor local de cotas.');
}
function volcHeaders(url,credential,now=new Date()){
  const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'),day=stamp.slice(0,8),region='cn-beijing';
  const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),hmac=(key,s)=>crypto.createHmac('sha256',key).update(s).digest();
  const u=new URL(url),payload=hash(''),signed='content-type;host;x-content-sha256;x-date';
  const query=[...u.searchParams].sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1])).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
  const canonical=['GET',u.pathname,query,'content-type:application/json',`host:${u.host}`,`x-content-sha256:${payload}`,`x-date:${stamp}`,'',signed,payload].join('\n');
  const scope=`${day}/${region}/ark/request`;let key=Buffer.from(credential.secretAccessKey);
  for(const step of [day,region,'ark','request'])key=hmac(key,step);
  const signature=hmac(key,['HMAC-SHA256',stamp,scope,hash(canonical)].join('\n')).toString('hex');
  return {'Content-Type':'application/json','X-Date':stamp,'X-Content-Sha256':payload,Authorization:`HMAC-SHA256 Credential=${credential.accessKeyID}/${scope}, SignedHeaders=${signed}, Signature=${signature}`};
}
async function fetchSpecial(account,credential,request){
  const id=account.provider;
  if(id==='kiro')return kiroUsage();
  if(id==='jetBrainsAI')return jetbrainsQuota();
  if(id==='antigravity')return antigravityQuota();
  if(id==='alibabaTokenPlan'){try{return await runCLI('bl',['usage','token-plan','--console-region','ap-southeast-1','--console-site','international','--output','json']);}catch{return runCLI('bl',['usage','token-plan','--console-region','cn-beijing','--console-site','domestic','--output','json']);}}
  if(id==='volcengine'){
    if(!credential)return runCLI('arkcli',['usage','plan','--format','json']);
    const c=JSON.parse(credential);if(!c.accessKeyID||!c.secretAccessKey)fail('Informe accessKeyID e secretAccessKey em JSON.');
    const url=action=>`https://open.volcengineapi.com/?Action=${action}&Version=2024-01-01`;
    const coding=await request(url('GetCodingPlanUsage'),{headers:volcHeaders(url('GetCodingPlanUsage'),c)});
    try{const agent=await request(url('GetAFPUsage'),{headers:volcHeaders(url('GetAFPUsage'),c)});coding.Result={...coding.Result,...agent.Result};}catch{}return coding;
  }
  const token=required(credential),cookie={Cookie:token},bearer={Authorization:`Bearer ${token}`};
  if(id==='ollamaCloud')return request('https://ollama.com/settings',{headers:cookie,replyFormat:'text'});
  if(id==='sakana'){const html=await request('https://console.sakana.ai/billing',{headers:cookie,replyFormat:'text'});let secondary;try{secondary=await request('https://console.sakana.ai/billing?tab=payAsYouGo',{headers:cookie,replyFormat:'text'});}catch{}return {html,secondary};}
  if(id==='xaiAPI'){const at=token.indexOf(':');if(at<1)fail('Informe TeamID:ManagementKey.');const team=token.slice(0,at),key=token.slice(at+1);if(!/^[a-zA-Z0-9_-]+$/.test(team)||!key)fail('ID de equipe inválido.');return request(`https://management-api.x.ai/v1/billing/teams/${team}/prepaid/balance`,{headers:{Authorization:`Bearer ${key}`}});}
  if(id==='windsurf'){
    let values;try{values=JSON.parse(token);}catch{values=Object.fromEntries(token.split(';').map(p=>{const at=p.indexOf('=');return [p.slice(0,at).trim(),p.slice(at+1).trim()];}));}
    const session=values.devin_session_token,auth1=values.devin_auth1_token,accountId=values.devin_account_id,org=values.devin_primary_org_id;
    if(!session||!auth1||!accountId||!org)fail('Informe os quatro valores devin_* da sessão do Windsurf em JSON.');
    const bytes=Buffer.from(session),body=Buffer.concat([Buffer.from([10]),varint(bytes.length),bytes,Buffer.from([16,1])]);
    return request('https://windsurf.com/_backend/exa.seat_management_pb.SeatManagementService/GetPlanStatus',{method:'POST',body,replyFormat:'buffer',headers:{'Content-Type':'application/proto','Connect-Protocol-Version':'1',Origin:'https://windsurf.com',Referer:'https://windsurf.com/profile','x-auth-token':session,'x-devin-session-token':session,'x-devin-auth1-token':auth1,'x-devin-account-id':accountId,'x-devin-primary-org-id':org}});
  }
  if(id==='ibmBob'){
    const headers={Authorization:(token.split('.').length===3?'Bearer ':'Apikey ')+token};const profile=await request('https://api.us-east.bob.ibm.com/admin/v1/profile',{headers});const teams=[];
    for(const instance of profile.instances||[]){if(!instance.user_id)continue;let host=instance.region_domain||'api.us-east.bob.ibm.com';if(!host.startsWith('api.'))host='api.'+host;if(!/^[a-z0-9.-]+\.bob\.ibm\.com$/i.test(host))fail('Região IBM inválida.');for(const team of instance.teams||[]){const d=await request(`https://${host}/admin/v1/teams/${encodeURIComponent(team.id)}/users/${encodeURIComponent(instance.user_id)}`,{headers:{...headers,'x-instance-id':instance.instance_id,'x-team-id':team.id}});teams.push({used:d.usage,budget:d.budget_limit??team.budget_limit,plan:instance.plan_name,resetsAt:instance.refresh_at});}}
    return {teams};
  }
  if(id==='notionAI'){
    const headers={...cookie,'Content-Type':'application/json',Origin:'https://app.notion.com'};
    const spaces=await request('https://app.notion.com/api/v3/getSpaces',{method:'POST',headers,body:'{}'});
    const users=Object.values(spaces);if(users.length!==1)fail('A sessão Notion não identifica uma conta única.');
    const entries=Object.entries(users[0].space||{}).map(([id,p])=>({id,...(p.value?.value||p.value||{})})).filter(p=>['business','enterprise'].includes(p.subscription_tier));
    if(!entries.length)fail('Esta conta Notion não informou um plano com cotas.');
    entries.sort((a,b)=>a.id.localeCompare(b.id));const selected=entries[0];
    const quota=await request('https://app.notion.com/api/v3/getCreditRateLimitStatus',{method:'POST',headers,body:JSON.stringify({spaceId:selected.id})});quota.plan=selected.subscription_tier;return quota;
  }
  if(id==='replicate'){
    const page=await request('https://replicate.com/account/billing',{headers:cookie,replyFormat:'text'});
    let owner;for(const m of page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){if(!/react-component-props/.test(m[1])||!/application\/json/.test(m[1]))continue;try{owner=objects(JSON.parse(m[2]),p=>p.account&&['user','organization'].includes(p.account.kind)&&typeof p.account.username==='string')[0]?.account;}catch{}if(owner)break;}
    if(!owner||!owner.username)fail('Não foi possível identificar a conta Replicate.');
    const kind=owner.kind==='organization'?'organizations':'users';return request(`https://replicate.com/api/${kind}/${encodeURIComponent(owner.username)}/unused-credit`,{headers:cookie});
  }
  if(id==='typeSafe'){
    const origin='https://console.typesafe.ai',url=origin+'/settings/billing';const html=await request(url,{headers:cookie,replyFormat:'text'});
    const scripts=[...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m=>new URL(m[1],origin)).filter(u=>u.origin===origin&&u.pathname.startsWith('/_next/static/')&&u.pathname.endsWith('.js')).slice(0,25);
    let action;
    for(const url of scripts){const text=await request(url.href,{replyFormat:'text'});action=text.match(/"([0-9a-f]{40,})"[^)]{0,150}"getBillingOverviewResult"/i)?.[1];if(action)break;}
    if(!action)fail('A página TypeSafe mudou. Não foi possível localizar a consulta de saldo.');
    const text=await request(url,{method:'POST',headers:{...cookie,Origin:origin,'Next-Action':action,Accept:'text/x-component','Content-Type':'application/json'},body:'[]',replyFormat:'text'});
    for(const line of text.split('\n')){const at=line.indexOf(':');try{const r=JSON.parse(line.slice(at+1));if(r.ok===true)return r;}catch{}}fail('TypeSafe não informou o saldo.');
  }
  if(id==='alibabaCodingPlan'){
    let last;
    for(const[origin,region]of [['https://modelstudio.console.alibabacloud.com','ap-southeast-1'],['https://bailian.console.aliyun.com','cn-beijing']]){
      const u=new URL('/data/api.json',origin);u.search=new URLSearchParams({action:'zeldaEasy.broadscope-bailian.codingPlan.queryCodingPlanInstanceInfoV2',product:'broadscope-bailian',api:'queryCodingPlanInstanceInfoV2',currentRegionId:region}).toString();
      try{const r=await request(u.href,{method:'POST',headers:{...bearer,'x-api-key':token,'X-DashScope-API-Key':token,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({queryCodingPlanInstanceInfoRequest:{commodityCode:region==='cn-beijing'?'sfm_codingplan_public_cn':'sfm_codingplan_public_intl'}})});if(r.data?.codingPlanInstanceInfos?.length)return r;last=r;}catch(e){last=e;}
    }if(last instanceof Error)throw last;return last||{};
  }
  if(id==='qwenCloud'){
    const origin='https://home.qwencloud.com',page=origin+'/billing/subscription/token-plan-individual';const html=await request(page,{headers:cookie,replyFormat:'text'});
    let security=html.match(/"sec_token"\s*:\s*"([^"]+)"/)?.[1]||html.match(/(?:sec_token|csrfToken)['"]?\s*[:=]\s*['"]([^'"]+)['"]/)?.[1]||cookieValue(token,'sec_token');
    if(!security){const info=await request(origin+'/tool/user/info.json',{headers:cookie});security=objects(info,p=>p.secToken||p.sec_token||p.csrfToken)[0];security=security?.secToken||security?.sec_token||security?.csrfToken;}
    if(!security)fail('A sessão Qwen Cloud não informou sec_token.');
    const api='zeldaHttp.apikeyMgr./tokenplan/personal/api/v2/usage';
    const params={Api:api,V:'1.0',Data:{cornerstoneParam:{feTraceId:crypto.randomUUID(),feURL:page,protocol:'V2',console:'ONE_CONSOLE',productCode:'p_efm',domain:'home.qwencloud.com',consoleSite:'QWENCLOUD',userNickName:'',userPrincipalName:'',xsp_lang:'en-US',...(cookieValue(token,'cna')?{'X-Anonymous-Id':cookieValue(token,'cna')}:{})}}};
    const csrf=cookieValue(token,'login_aliyunid_csrf')||cookieValue(token,'csrf');
    const query=new URLSearchParams({action:'IntlBroadScopeAspnGateway',product:'sfm_bailian',api,_v:'undefined'});
    return request(`https://cs-data.qwencloud.com/data/api.json?${query}`,{method:'POST',headers:{...cookie,'Content-Type':'application/x-www-form-urlencoded',Origin:origin,Referer:page,'X-Requested-With':'XMLHttpRequest',...(csrf?{'x-xsrf-token':csrf,'x-csrf-token':csrf}:{})},body:new URLSearchParams({product:'sfm_bailian',action:'IntlBroadScopeAspnGateway',sec_token:security,region:'ap-southeast-1',language:'en-US',params:JSON.stringify(params)}).toString()});
  }
  if(id==='devin'){
    let c;try{c=JSON.parse(token);}catch{fail('Informe token e organizationId do Devin em JSON.');}
    const org=c.organizationId||c.devin_primary_org_id,auth=c.token||c.devin_auth1_token;
    if(typeof org!=='string'||typeof auth!=='string'||!auth||! /^(?:(?:org|organizations)\/)?[-a-zA-Z0-9_]+$/.test(org))fail('Sessão e organização Devin inválidas.');
    const id=org.split('/').pop(),internal=/^org[-_]/.test(id);
    const paths=[...new Set([...(internal?[id]:[]),org.includes('/')?org:`${internal?'organizations':'org'}/${id}`,id])];
    for(let i=0;i<paths.length;i++){
      try{return await request(`https://app.devin.ai/api/${paths[i]}/billing/quota/usage`,{headers:{Authorization:`Bearer ${auth}`,...(internal?{'x-cog-org-id':id}:{})}});}
      catch(e){if(i===paths.length-1||! /HTTP 404/.test(e.message))throw e;}
    }
  }
  if(id==='zoomMate'){
    for(const host of ['ai.zoom.us','zoommate.zoom.us'])try{const login=await request(`https://${host}/ai-computer/api/v1/login/?continue=https%3A%2F%2Fzoommate.zoom.us%2F`,{headers:cookie});if(!login.data?.nak)continue;return await request(`https://${host}/ai-computer/api/v1/credits/status`,{headers:{...cookie,Authorization:`Bearer ${login.data.nak}`}});}catch{}fail('A sessão ZoomMate não informou créditos.');
  }
  fail('Conector indisponível.');
}
module.exports={specialIds,fetchSpecial,decodePlanStatus,protobufFields,volcHeaders,objects};
