'use strict';
const {app,BrowserWindow,Tray,Menu,ipcMain,screen,nativeImage,safeStorage,Notification,shell,dialog,globalShortcut,nativeTheme,net,powerMonitor}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const registry=require('./registry.cjs');
const {Storage,write,validateSettings}=require('./storage.cjs');
const {fetchAccount,requestJSON}=require('./providers.cjs');
const {reconcile,forecast,alerts,headline,activeWindows}=require('./core.cjs');
const {scanHistory}=require('./ledger.cjs');
const {panelLayout}=require('./panel-layout.cjs');
const {panelBounds:geometryBounds,clamp}=require('./dock-geometry.cjs');
const {acquireLock,newer,instanceFile,readHolder}=require('./instances.cjs');
const demoMode=process.argv.includes('--demo')||process.argv.includes('--smoke');
const smoke=process.argv.includes('--smoke');
if(process.env.PULSE_WINDOWS_DATA)app.setPath('userData',path.resolve(process.env.PULSE_WINDOWS_DATA));
if(demoMode&&!process.env.PULSE_WINDOWS_DATA)app.setPath('userData',path.join(app.getPath('temp'),'pulse-windows-demo'));
// Keep the existing profile so renaming does not lose accounts or DPAPI secrets.
if(!process.env.PULSE_WINDOWS_DATA&&!demoMode)app.setPath('userData',path.join(app.getPath('appData'),'Pulse Windows'));
app.setName('Neo');
app.setAppUserModelId('io.pulse.windows');
let store,settings,readings={},settingsWindow,panelWindow,tray,timer,quitting=false,refreshing=false,queuedRefresh=false,ledger=null,dragging=null,dragTimer;
const alertsSeen={},errorCounts={};
const accountRevisions={};
const uiURL=pathToFileURL(path.join(__dirname,'ui','index.html')).href;
const registryView=registry.map(p=>({...p,sourceUrl:`https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/${p.source||''}`}));
const providerCount=registry.filter(p=>p.id!=='extension').length;
function snapshot(){
  const display=screen.getAllDisplays().find(d=>d.id===Number(settings.displayId))||screen.getPrimaryDisplay();
  return {version:app.getVersion(),settings,readings,panelLayout:panelLayout(settings,display.workArea),registry:registryView,refreshing,demo:demoMode,ledger,
    credentials:Object.fromEntries(settings.accounts.map(a=>[a.id,store.hasCredential(a.id)])),
    displays:screen.getAllDisplays().map(d=>({id:d.id,label:d.label||`Monitor ${d.id}`,width:d.workArea.width,height:d.workArea.height})),
    dark:settings.theme==='system'?nativeTheme.shouldUseDarkColors:settings.theme==='dark'};
}
function broadcast(){const windows=[settingsWindow,panelWindow].filter(win=>win&&!win.isDestroyed());if(windows.length){const state=snapshot();for(const win of windows)win.webContents.send('state',state);}updateTray();}
function harden(win){
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(e,url)=>{if(url.split('?')[0]!==uiURL)e.preventDefault();});
  win.webContents.session.setPermissionRequestHandler((_w,_p,callback)=>callback(false));
}
function createWindow(options,view){
  const win=new BrowserWindow({...options,show:false,icon:path.join(__dirname,'..','assets','icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,...(smoke?{offscreen:true}:{})}});
  harden(win);
  win.loadFile(path.join(__dirname,'ui','index.html'),{query:{view}});
  return win;
}
function openSettings(){
  if(settingsWindow&&!settingsWindow.isDestroyed()){settingsWindow.show();settingsWindow.focus();return;}
  settingsWindow=createWindow({width:1000,height:710,minWidth:800,minHeight:580,backgroundColor:nativeTheme.shouldUseDarkColors?'#202020':'#ffffff',title:'Configurações do Neo',autoHideMenuBar:true},'settings');
  settingsWindow.once('ready-to-show',()=>{if(!smoke)settingsWindow.show();});
  settingsWindow.on('closed',()=>{settingsWindow=null;});
}
function panelBounds(){
  const display=screen.getAllDisplays().find(d=>d.id===Number(settings.displayId))||screen.getPrimaryDisplay();
  const area=display.workArea;
  return geometryBounds(settings,area,panelLayout(settings,area));
}
function startPanelDrag(){
  if(dragging||!panelWindow)return;
  const point=screen.getCursorScreenPoint(),display=screen.getDisplayNearestPoint(point),area=display.workArea,bounds=panelWindow.getBounds();
  const before=panelLayout(settings,area),along=before.vertical?point.y-bounds.y:point.x-bounds.x;
  const withinContent=along-((before.vertical?bounds.height:bounds.width)-before.railLength)/2-before.padding;
  settings={...settings,floating:true,displayId:display.id};
  const after=panelLayout(settings,area),offsetAlong=((after.vertical?after.height:after.width)-after.railLength)/2+after.padding+withinContent;
  const offsetX=after.vertical?point.x-bounds.x:offsetAlong,offsetY=after.vertical?offsetAlong:point.y-bounds.y;
  dragging={offsetX,offsetY,area};
  settings.floatX=clamp(point.x-offsetX,area.x,area.x+area.width-after.width);settings.floatY=clamp(point.y-offsetY,area.y,area.y+area.height-after.height);
  updatePanel();
  dragTimer=setInterval(()=>{
    if(!dragging||!panelWindow)return;
    const cursor=screen.getCursorScreenPoint(),display=screen.getDisplayNearestPoint(cursor),a=display.workArea,b=panelWindow.getBounds();
    settings.floatX=Math.round(clamp(cursor.x-dragging.offsetX,a.x,a.x+a.width-b.width));settings.floatY=Math.round(clamp(cursor.y-dragging.offsetY,a.y,a.y+a.height-b.height));
    settings.displayId=display.id;panelWindow.setPosition(settings.floatX,settings.floatY);
  },16);
}
function endPanelDrag(){
  if(!dragging)return;
  clearInterval(dragTimer);dragging=null;
  const point=screen.getCursorScreenPoint(),display=screen.getDisplayNearestPoint(point),a=display.workArea;
  const distances=[['left',Math.abs(point.x-a.x)],['right',Math.abs(a.x+a.width-point.x)],['top',Math.abs(point.y-a.y)],['bottom',Math.abs(a.y+a.height-point.y)]];
  const [edge,distance]=distances.sort((a,b)=>a[1]-b[1])[0];
  if(distance<=48){settings.floating=false;settings.edge=edge;settings.dockPosition=['left','right'].includes(edge)?clamp((point.y-a.y)/a.height,0,1):clamp((point.x-a.x)/a.width,0,1);}
  if(!demoMode)settings=store.saveSettings(settings);
  updatePanel();
}
function updatePanel(){
  if(!settings.panelVisible||!settings.accounts.some(a=>a.enabled)){panelWindow?.hide();broadcast();return;}
  if(!panelWindow||panelWindow.isDestroyed()){
    panelWindow=createWindow({...panelBounds(),transparent:true,frame:false,resizable:false,skipTaskbar:true,alwaysOnTop:true,focusable:false,hasShadow:false,backgroundColor:'#00000000'},'panel');
    panelWindow.once('ready-to-show',()=>{if(!smoke)panelWindow.showInactive();});
    panelWindow.on('closed',()=>{panelWindow=null;});
  }else{panelWindow.setBounds(panelBounds());if(!smoke)panelWindow.showInactive();}
  broadcast();
}
function togglePanel(){settings=store.saveSettings({...settings,panelVisible:!settings.panelVisible});updatePanel();}
function updateTray(){
  if(!tray)return;
  const enabled=settings.accounts.filter(a=>a.enabled);
  const entries=enabled.map(a=>{const p=registry.find(p=>p.id===a.provider),r=readings[a.id],w=headline(r,a.pinned);return{label:`${a.label||p.name}: ${w?Math.round(settings.showRemaining?Math.max(0,100-w.usedPercent):w.usedPercent)+'% '+(settings.showRemaining?'restante':'usado'):r?.balances?.[0]?r.balances[0].amount+' '+r.balances[0].currency:'sem leitura'}`,click:()=>openSettings()};});
  tray.setToolTip(`Neo${demoMode?' · Demonstração':''}\n${entries.slice(0,8).map(e=>e.label).join('\n')}`);
  tray.setContextMenu(Menu.buildFromTemplate([...entries,{type:'separator'},{label:'Abrir painel',click:openSettings},{label:'Atualizar cotas',enabled:enabled.length>0&&!refreshing,click:()=>refresh()},{label:settings.panelVisible?'Ocultar faixa flutuante':'Mostrar faixa flutuante',click:togglePanel},{type:'separator'},{label:'Sair',click:()=>app.quit()}]));
}
function configureShortcuts(){
  globalShortcut.unregisterAll();
  for(const [key,action]of [['toggle',togglePanel],['settings',openSettings]])if(settings.shortcuts[key]){
    let ok=false;try{ok=globalShortcut.register(settings.shortcuts[key],action);}catch{}
    if(!ok)throw new Error(`Não foi possível registrar o atalho ${settings.shortcuts[key]}. Escolha outra combinação.`);
  }
}
function configureStartup(){
  if(demoMode)return;
  // Portable extraction directories disappear on exit; register the persistent launcher.
  app.setLoginItemSettings({openAtLogin:settings.startAtLogin,path:process.env.PORTABLE_EXECUTABLE_FILE||process.execPath,args:app.isPackaged?[]:[app.getAppPath()]});
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>refresh(),settings.refreshMinutes*60000);timer.unref();}
async function refresh(accountId){
  if(demoMode){broadcast();return;}
  if(refreshing){queuedRefresh=true;return;}
  const accounts=settings.accounts.filter(a=>a.enabled&&(!accountId||a.id===accountId));
  if(!accounts.length){schedule();return;}
  refreshing=true;broadcast();
  try{
    // Bounded parallel reads keep a slow provider from holding the whole dashboard.
    let index=0;
    await Promise.all(Array.from({length:Math.min(4,accounts.length)},async()=>{
      while(index<accounts.length){
        const a=accounts[index++],revision=accountRevisions[a.id]||0;
        // One account's failure must not stop the others or the cache write.
        try{
          const raw=await fetchAccount(a,store.credential(a.id),net.fetch.bind(net));
          if(!settings.accounts.some(x=>x.id===a.id&&x.enabled)||(accountRevisions[a.id]||0)!==revision)continue;
          const previous=readings[a.id];
          const current=reconcile(raw,previous);
          if(settings.forecast)current.forecast=forecast(previous,raw);
          readings[a.id]=current;
          if(settings.notifications&&Notification.isSupported()){
            const provider=registry.find(p=>p.id===a.provider);
            const notified=alertsSeen[a.id]||={};
            for(const alert of alerts(previous,raw,settings.threshold,notified)){
              new Notification({title:`${a.label||provider.name} · ${alert.window.label}`,body:alert.type==='spent'?'O serviço informou que este limite está esgotado.':alert.type==='reset'?'O serviço informou uma nova janela de uso.':`${Math.round(alert.window.usedPercent)}% da cota utilizado.`,icon:path.join(__dirname,'..','assets','icon.png')}).show();
            }
            errorCounts[a.id]=raw.state==='unavailable'?(errorCounts[a.id]||0)+1:0;
            if(errorCounts[a.id]===3)new Notification({title:`${a.label||provider.name} · Consulta indisponível`,body:'Três consultas seguidas falharam. Abra o Neo para verificar a conexão.'}).show();
          }
          broadcast();
        }catch(e){console.error(`Falha ao processar a conta ${a.id}:`,e);}
      }
    }));
    store.saveCache(readings);
  }finally{refreshing=false;broadcast();if(queuedRefresh){queuedRefresh=false;setTimeout(()=>refresh(),500);}else schedule();}
}
function trusted(event){return [settingsWindow,panelWindow].some(w=>w&&!w.isDestroyed()&&w.webContents.id===event.sender.id)&&event.senderFrame===event.sender.mainFrame;}
function handle(channel,callback){ipcMain.handle(channel,async(event,...args)=>{if(!trusted(event))throw new Error('Origem da solicitação inválida.');return callback(...args);});}
function setupIPC(){
  handle('snapshot',snapshot);
  handle('settings-open',openSettings);
  handle('settings-save',async next=>{
    const before=settings;
    settings=store.saveSettings(next);
    if(before.edge!==settings.edge){settings=store.saveSettings({...settings,floating:false,dockPosition:.5});}
    try{configureShortcuts();}catch(e){settings=store.saveSettings(before);configureShortcuts();throw e;}
    configureStartup();
    // Invalidate readings if the account's route or remote identity changes.
    for(const a of settings.accounts){const old=before.accounts.find(p=>p.id===a.id);if(old&&['provider','remoteAccountId','baseUrl','captureFile','file','localAuth','enabled'].some(k=>a[k]!==old[k])){accountRevisions[a.id]=(accountRevisions[a.id]||0)+1;delete readings[a.id];delete alertsSeen[a.id];}}
    if(!demoMode)store.saveCache(readings);
    updatePanel();broadcast();
    if(JSON.stringify(before.accounts)!==JSON.stringify(settings.accounts))refresh();else schedule();
    return snapshot();
  });
  handle('credential-save',(id,value)=>{
    if(!settings.accounts.some(a=>a.id===id)||typeof value!=='string'||value.length>20000)throw new Error('Credencial inválida.');
    store.saveCredential(id,value.trim());accountRevisions[id]=(accountRevisions[id]||0)+1;delete readings[id];delete alertsSeen[id];store.saveCache(readings);broadcast();refresh(id);return true;
  });
  handle('account-remove',id=>{store.deleteCredential(id);accountRevisions[id]=(accountRevisions[id]||0)+1;settings=store.saveSettings({...settings,accounts:settings.accounts.filter(a=>a.id!==id)});delete readings[id];delete alertsSeen[id];store.saveCache(readings);updatePanel();return snapshot();});
  handle('refresh',id=>refresh(id));
  handle('usage-open',id=>{
    const p=registry.find(p=>p.id===id);
    if(!p?.url||!p.url.startsWith('https://'))return;
    return shell.openExternal(p.url);
  });
  handle('file-choose',async()=>{
    const result=await dialog.showOpenDialog(settingsWindow,{title:'Selecionar resposta de uso',filters:[{name:'JSON',extensions:['json']}],properties:['openFile']});
    return result.canceled?null:result.filePaths[0];
  });
  handle('history-scan',async()=>{if(!settings.historyEnabled)throw new Error('Ative a leitura do histórico local primeiro.');ledger=await scanHistory();broadcast();return ledger;});
  handle('data-export',async()=>{
    const data={version:1,generatedAt:new Date().toISOString(),accounts:settings.accounts.filter(a=>a.enabled).map(a=>({id:a.id,provider:a.provider,label:a.label,...readings[a.id],windows:activeWindows(readings[a.id])}))};
    const chosen=await dialog.showSaveDialog(settingsWindow,{defaultPath:'neo-usage.json',filters:[{name:'JSON',extensions:['json']}]});
    if(!chosen.canceled&&chosen.filePath)write(chosen.filePath,data);return !chosen.canceled;
  });
  handle('service-status',async id=>{
    const url={codex:'https://status.openai.com/api/v2/summary.json',claude:'https://status.claude.com/api/v2/summary.json',deepseek:'https://status.deepseek.com/api/v2/summary.json'}[id];
    if(!url)return null;
    try{const data=await requestJSON(url,{},net.fetch.bind(net));return{indicator:data.status?.indicator,description:data.status?.description,components:(data.components||[]).filter(c=>!c.group).map(c=>({name:c.name,status:c.status}))};}catch{return{error:'Status do serviço indisponível.'};}
  });
  handle('quit',()=>app.quit());
  ipcMain.on('panel-drag-start',event=>{if(trusted(event)&&event.sender===panelWindow?.webContents)startPanelDrag();});
  ipcMain.on('panel-drag-end',event=>{if(trusted(event)&&event.sender===panelWindow?.webContents)endPanelDrag();});
  ipcMain.on('panel-shape',(event,rectangles)=>{
    if(!panelWindow||event.sender!==panelWindow.webContents||!Array.isArray(rectangles))return;
    const bounds=panelWindow.getBounds();
    const safe=rectangles.slice(0,8).filter(r=>r&&['x','y','width','height'].every(k=>Number.isInteger(r[k]))&&r.x>=0&&r.y>=0&&r.width>0&&r.height>0&&r.x+r.width<=bounds.width+1&&r.y+r.height<=bounds.height+1);
    if(safe.length&&process.platform==='win32')panelWindow.setShape(safe);
  });
}
async function smokeTest(){
  await new Promise(resolve=>settingsWindow.webContents.once('did-finish-load',resolve));
  await new Promise(r=>setTimeout(r,700));
  const output=process.env.PULSE_SMOKE_OUTPUT||path.join(app.getPath('userData'),'smoke');fs.mkdirSync(output,{recursive:true});
  const failures=[];
  const check=async(script,label)=>{const ok=await settingsWindow.webContents.executeJavaScript(script);if(!ok)failures.push(label);};
  await check("document.querySelector('h1').textContent==='Aparência'&&document.querySelectorAll('.segmented').length===3",'Pulse appearance controls');
  fs.writeFileSync(path.join(output,'settings.png'),(await settingsWindow.webContents.capturePage()).toPNG());
  await settingsWindow.webContents.executeJavaScript("document.querySelector('[data-view=about]').click()");
  await new Promise(r=>setTimeout(r,250));
  fs.writeFileSync(path.join(output,'about.png'),(await settingsWindow.webContents.capturePage()).toPNG());
  await settingsWindow.webContents.executeJavaScript("document.querySelector('[data-view=dashboard]').click()");
  await new Promise(r=>setTimeout(r,250));
  await check("document.querySelectorAll('.account-card').length === 5",'dashboard cards');
  await check("document.body.textContent.includes('Demonstração')",'demo label');
  fs.writeFileSync(path.join(output,'dashboard.png'),(await settingsWindow.webContents.capturePage()).toPNG());
  await settingsWindow.webContents.executeJavaScript("document.querySelector('[data-view=providers]').click()");
  await new Promise(r=>setTimeout(r,400));
  await check(`document.querySelectorAll('.provider-tile').length === ${providerCount}`,`${providerCount} provider tiles`);
  fs.writeFileSync(path.join(output,'providers.png'),(await settingsWindow.webContents.capturePage()).toPNG());
  await settingsWindow.webContents.executeJavaScript("document.querySelector('[data-provider=codex]').click()");
  await new Promise(r=>setTimeout(r,250));
  write(path.join(output,'account-check.json'),await settingsWindow.webContents.executeJavaScript("({title:document.querySelector('h1')?.textContent,values:[...document.querySelectorAll('.usage-number')].map(e=>e.textContent),pane:document.querySelector('#content')?.innerText.slice(0,200)})"));
  await check("document.querySelector('h1').textContent.startsWith('Codex')&&document.querySelectorAll('.usage-number').length===2",'native account pane');
  fs.writeFileSync(path.join(output,'account.png'),(await settingsWindow.webContents.capturePage()).toPNG());
  await settingsWindow.webContents.executeJavaScript("document.querySelector('[data-view=appearance]').click();document.querySelector('input[name=panelSize][value=large]').click()");
  await new Promise(r=>setTimeout(r,250));
  await check("(async()=> (await window.pulse.snapshot()).settings.panelSize==='large')()",'segmented control persistence');
  await check("(async()=>{const s=await window.pulse.snapshot();await window.pulse.saveSettings({...s.settings,panelSize:'standard',theme:'dark'});return (await window.pulse.snapshot()).dark;})()",'dark theme');
  await settingsWindow.webContents.executeJavaScript("document.querySelector('[data-view=appearance]').click()");
  await new Promise(r=>setTimeout(r,250));
  fs.writeFileSync(path.join(output,'settings-dark.png'),(await settingsWindow.webContents.capturePage()).toPNG());
  await check("(async()=>{const s=await window.pulse.snapshot();await window.pulse.saveSettings({...s.settings,edge:'left'});return (await window.pulse.snapshot()).settings.edge==='left';})()",'settings IPC round trip');
  await check("(async()=>{const s=await window.pulse.snapshot(),id=s.settings.accounts[0].id;await window.pulse.saveCredential(id,'smoke-dummy-secret');const after=await window.pulse.snapshot();return after.credentials[id]===true&&!JSON.stringify(after).includes('smoke-dummy-secret');})()",'renderer receives only credential presence');
  const id=settings.accounts[0].id;
  if(!safeStorage.isEncryptionAvailable()||store.credential(id)!=='smoke-dummy-secret'||fs.readFileSync(path.join(store.dir,'secrets.json'),'utf8').includes('smoke-dummy-secret'))failures.push('Windows credential encryption');
  store.deleteCredential(id);
  readings[id]=require('./demo.cjs')(registry).readings[id];broadcast();
  const priorBounds=JSON.stringify(panelWindow.getBounds());
  await panelWindow.webContents.executeJavaScript("document.querySelectorAll('[data-rail]')[1].dispatchEvent(new MouseEvent('mouseenter'))");
  await new Promise(r=>setTimeout(r,400));
  const panelOK=await panelWindow.webContents.executeJavaScript("document.querySelectorAll('.hover-card').length===1&&document.querySelectorAll('[data-rail]').length===5");
  if(!panelOK)failures.push('floating panel hover');
  if(priorBounds!==JSON.stringify(panelWindow.getBounds()))failures.push('hover must not resize panel');
  const marksOK=await panelWindow.webContents.executeJavaScript("document.querySelectorAll('.rail .provider-mark svg').length===5&&document.querySelectorAll('.rail-percent').length===5&&document.querySelectorAll('.ring-value .rail-percent').length===0");
  if(!marksOK)failures.push('original logos and figures outside rings');
  fs.writeFileSync(path.join(output,'panel-transparent.png'),(await panelWindow.webContents.capturePage()).toPNG());
  await panelWindow.webContents.executeJavaScript("document.body.style.setProperty('background','#f7f7f7','important')");
  fs.writeFileSync(path.join(output,'panel.png'),(await panelWindow.webContents.capturePage()).toPNG());
  for(const edge of ['right','top','bottom']){
    await settingsWindow.webContents.executeJavaScript(`(async()=>{const s=await window.pulse.snapshot();await window.pulse.saveSettings({...s.settings,edge:'${edge}'});})()`);
    await new Promise(r=>setTimeout(r,650));
    const geometryOK=await panelWindow.webContents.executeJavaScript("(()=>{const card=document.querySelector('.hover-card').getBoundingClientRect(),rail=document.querySelector('.rail').getBoundingClientRect();return card.left>=0&&card.top>=0&&card.right<=innerWidth&&card.bottom<=innerHeight&&!(card.left<rail.right&&card.right>rail.left&&card.top<rail.bottom&&card.bottom>rail.top);})()");
    if(!geometryOK)failures.push('panel geometry '+edge);
    const b=panelWindow.getBounds(),a=screen.getAllDisplays().find(d=>d.id===Number(settings.displayId))?.workArea||screen.getPrimaryDisplay().workArea;
    if((edge==='right'&&b.x+b.width!==a.x+a.width)||(edge==='top'&&b.y!==a.y)||(edge==='bottom'&&b.y+b.height!==a.y+a.height))failures.push('flush screen edge '+edge);
    fs.writeFileSync(path.join(output,'panel-'+edge+'.png'),(await panelWindow.webContents.capturePage()).toPNG());
  }
  await settingsWindow.webContents.executeJavaScript("(async()=>{const s=await window.pulse.snapshot();await window.pulse.saveSettings({...s.settings,edge:'left',autoCollapse:true,floating:false});})()");
  await panelWindow.webContents.executeJavaScript("document.querySelector('.panel-root').dispatchEvent(new MouseEvent('mouseleave'))");
  await new Promise(r=>setTimeout(r,850));
  const collapseOK=await panelWindow.webContents.executeJavaScript("Math.abs(document.querySelector('.rail-wrap').getBoundingClientRect().width-6)<.1&&document.querySelector('.dock-surface path').getAttribute('d').includes('6 0 V96')");
  if(!collapseOK)failures.push('same silhouette collapses into edge sliver');
  fs.writeFileSync(path.join(output,'panel-collapsed.png'),(await panelWindow.webContents.capturePage()).toPNG());
  let frame=0;
  const captureMotion=async()=>fs.writeFileSync(path.join(output,`motion-${String(frame++).padStart(3,'0')}.png`),(await panelWindow.webContents.capturePage()).toPNG());
  await captureMotion();
  await panelWindow.webContents.executeJavaScript("window.__neoRingBefore=document.querySelector('[data-rail] .ring-progress');window.__neoCardBefore=document.querySelector('.hover-card');document.querySelector('.sliver').dispatchEvent(new MouseEvent('mouseenter'))");
  await new Promise(r=>setTimeout(r,65));
  const tweenOK=await panelWindow.webContents.executeJavaScript("matchMedia('(prefers-reduced-motion: reduce)').matches||(()=>{const w=document.querySelector('.rail-wrap').getBoundingClientRect().width;return w>6&&w<64;})()");
  if(!tweenOK)failures.push('rail has intermediate animated geometry');
  for(let i=0;i<7;i++){await captureMotion();await new Promise(r=>setTimeout(r,55));}
  await panelWindow.webContents.executeJavaScript("document.querySelectorAll('[data-rail]')[0].dispatchEvent(new MouseEvent('mouseenter'))");
  for(let i=0;i<7;i++){await captureMotion();await new Promise(r=>setTimeout(r,55));}
  await panelWindow.webContents.executeJavaScript("document.querySelectorAll('[data-rail]')[4].dispatchEvent(new MouseEvent('mouseenter'))");
  for(let i=0;i<9;i++){await captureMotion();await new Promise(r=>setTimeout(r,55));}
  const stable=await panelWindow.webContents.executeJavaScript("window.__neoRingBefore===document.querySelector('[data-rail] .ring-progress')&&window.__neoCardBefore===document.querySelector('.hover-card')");
  if(!stable)failures.push('hover retains ring and card DOM for animations');
  await settingsWindow.webContents.executeJavaScript("(async()=>{const s=await window.pulse.snapshot();await window.pulse.saveSettings({...s.settings,floating:true,floatX:200,floatY:100});})()");
  await new Promise(r=>setTimeout(r,700));
  const floatOK=await panelWindow.webContents.executeJavaScript("document.querySelector('.panel-root').classList.contains('floating')&&!document.querySelector('.dock-surface path').getAttribute('d').includes(' C')");
  if(!floatOK)failures.push('floating panel changes to round capsule');
  fs.writeFileSync(path.join(output,'panel-floating.png'),(await panelWindow.webContents.capturePage()).toPNG());
  await settingsWindow.webContents.executeJavaScript("(async()=>{const s=await window.pulse.snapshot();await window.pulse.saveSettings({...s.settings,floating:false,autoCollapse:false});})()");
  await new Promise(r=>setTimeout(r,700));
  fs.writeFileSync(path.join(output,'panel.png'),(await panelWindow.webContents.capturePage()).toPNG());
  await panelWindow.webContents.executeJavaScript("document.body.style.removeProperty('background')");
  const windows=BrowserWindow.getAllWindows();
  if(windows.some(w=>{const p=w.webContents.getLastWebPreferences();return !p.sandbox||!p.contextIsolation||p.nodeIntegration;}))failures.push('renderer sandbox');
  write(path.join(output,'smoke-result.json'),{passed:failures.length===0,failures,providers:providerCount,checks:24,windows:windows.length,version:app.getVersion(),electron:process.versions.electron,credentialEncryption:safeStorage.isEncryptionAvailable()});
  app.exit(failures.length?1:0);
}
if(process.argv.includes('--json')){
  app.whenReady().then(()=>{store=new Storage(app.getPath('userData'),safeStorage);settings=store.settings();readings=store.cache();console.log(JSON.stringify({version:1,accounts:settings.accounts.filter(a=>a.enabled).map(a=>({...readings[a.id],accountId:a.id,provider:a.provider,windows:activeWindows(readings[a.id])}))}));app.exit(0);});
}else start();
async function start(){
  // Opening a newer Neo replaces an older one on the same profile instead of showing the old window.
  const version=app.getVersion(),userData=app.getPath('userData'),instance=instanceFile(userData);
  const take=()=>acquireLock({request:()=>app.requestSingleInstanceLock({neoVersion:version,pid:process.pid}),version,holder:()=>readHolder(userData)});
  let result=await take();
  // Releases up to 0.3.2 cannot be asked to quit, so the person closes them from the tray and retries here.
  while(result==='legacy'||result==='timeout'){
    await app.whenReady();
    const {response}=await dialog.showMessageBox({type:'info',title:'Neo',message:'Uma versão anterior do Neo continua aberta.',detail:`Para abrir a versão ${version}, clique com o botão direito no ícone do Neo na bandeja do Windows, escolha Sair e depois clique em Tentar de novo.`,buttons:['Tentar de novo','Cancelar'],defaultId:0,cancelId:1,noLink:true});
    if(response!==0)break;
    result=await take();
  }
  if(result!=='acquired'){app.quit();return;}
  try{write(instance,{version,pid:process.pid});}catch{/* Without it, a newer Neo asks the person to close this one. */}
  app.on('will-quit',()=>{if(readHolder(userData,()=>true)?.pid===process.pid)fs.rmSync(instance,{force:true});});
  let lastCaller=null;
  app.on('second-instance',(_event,_argv,_cwd,data)=>{
    if(newer(data?.neoVersion,version)){app.quit();return;}
    // A newer instance retries while it waits; only its first request opens the window.
    if(data?.pid&&data.pid===lastCaller)return;
    lastCaller=data?.pid??null;openSettings();
  });
  app.on('before-quit',()=>{quitting=true;clearTimeout(timer);clearInterval(dragTimer);globalShortcut.unregisterAll();});
  app.on('window-all-closed',()=>{/* Tray keeps the monitor alive. */});
  app.whenReady().then(()=>{
    store=new Storage(app.getPath('userData'),safeStorage);settings=store.settings();readings=store.cache();
    if(demoMode){const demo=require('./demo.cjs')(registry);settings=validateSettings({...settings,theme:'light',showRemaining:false,autoCollapse:false,accounts:demo.accounts});readings=demo.readings;}
    setupIPC();Menu.setApplicationMenu(null);
    configureStartup();
    if(!smoke){tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'..','assets','icon.png')));tray.on('click',openSettings);}
    try{configureShortcuts();}catch{settings.shortcuts={toggle:'',settings:''};}
    updatePanel();openSettings();
    screen.on('display-added',updatePanel);screen.on('display-removed',updatePanel);screen.on('display-metrics-changed',updatePanel);nativeTheme.on('updated',broadcast);
    // Give the network a moment to return after sleep before reading the services.
    powerMonitor.on('resume',()=>setTimeout(()=>refresh(),5000));
    if(smoke)smokeTest().catch(e=>{fs.writeFileSync(path.join(app.getPath('userData'),'smoke-error.txt'),e.stack);app.exit(1);});else refresh();
  });
}
