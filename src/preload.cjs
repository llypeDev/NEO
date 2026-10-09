'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const invoke=(channel,...args)=>ipcRenderer.invoke(channel,...args);
contextBridge.exposeInMainWorld('pulse',{
  snapshot:()=>invoke('snapshot'),
  saveSettings:s=>invoke('settings-save',s),
  saveCredential:(id,value)=>invoke('credential-save',id,value),
  removeAccount:id=>invoke('account-remove',id),
  refresh:id=>invoke('refresh',id),
  openSettings:()=>invoke('settings-open'),
  openUsage:id=>invoke('usage-open',id),
  chooseFile:id=>invoke('file-choose',id),
  scanHistory:()=>invoke('history-scan'),
  exportData:()=>invoke('data-export'),
  status:id=>invoke('service-status',id),
  panelShape:shape=>ipcRenderer.send('panel-shape',shape),
  startPanelDrag:()=>ipcRenderer.send('panel-drag-start'),
  endPanelDrag:()=>ipcRenderer.send('panel-drag-end'),
  quit:()=>invoke('quit'),
  onState:callback=>{const listener=(_,state)=>callback(state);ipcRenderer.on('state',listener);return()=>ipcRenderer.removeListener('state',listener);}
});
