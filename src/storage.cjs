'use strict';
const fs = require('node:fs');
const path = require('node:path');
const registry = require('./registry.cjs');
const defaultSettings = () => ({version: 3, accounts: [], refreshMinutes: 5, theme: 'system', edge: 'right', displayId: null, autoCollapse: true, showRemaining: false, panelVisible: true, notifications: false, threshold: 90, forecast: false, historyEnabled: false, startAtLogin: false, panelSize:'standard',railSpacing:'standard',roundEnds:false,panelColor:'black',showSidePercent:true,showAcrossPercent:false,labelAboveRing:false,showSecondLimit:false,showResetClock:false,redAt:75,detailedCard:false,floating:false,floatX:null,floatY:null,dockPosition:.5,shortcuts: {toggle: '', settings: ''}});
function read(file, fallback) {try {return JSON.parse(fs.readFileSync(file, 'utf8'));} catch {return fallback;}}
function write(file, value) {fs.mkdirSync(path.dirname(file), {recursive: true}); const temp = file + '.tmp'; fs.writeFileSync(temp, JSON.stringify(value, null, 2), {mode: 0o600}); fs.renameSync(temp, file);}
function validateSettings(settings) {
  const next = {...defaultSettings(), ...settings};
  if(Number(settings?.version||0)<3){next.autoCollapse=true;next.roundEnds=false;}
  next.version=3;
  next.floating=next.floating===true;
  next.floatX=Number.isFinite(next.floatX)?Math.round(next.floatX):null;next.floatY=Number.isFinite(next.floatY)?Math.round(next.floatY):null;
  next.dockPosition=Math.max(0,Math.min(1,Number.isFinite(next.dockPosition)?next.dockPosition:.5));
  if (!Array.isArray(next.accounts) || next.accounts.length > 100) throw new Error('Lista de contas inválida.');
  const seen = new Set();
  next.accounts = next.accounts.map(a => {
    if (!a || typeof a.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(a.id) || seen.has(a.id) || !registry.some(p => p.id === a.provider)) throw new Error('Conta inválida.');
    seen.add(a.id);
    return {id: a.id, provider: a.provider, label: String(a.label || '').slice(0, 80), enabled: a.enabled === true, localAuth: a.localAuth !== false, remoteAccountId: String(a.remoteAccountId || '').slice(0, 200), pinned: String(a.pinned || '').slice(0, 150), baseUrl: String(a.baseUrl || '').slice(0, 500), file: String(a.file || '').slice(0, 1000), captureFile: String(a.captureFile || '').slice(0, 1000)};
  });
  next.refreshMinutes = Math.min(30, Math.max(2, Number(next.refreshMinutes) || 5));
  next.threshold = Math.min(99, Math.max(50, Number(next.threshold) || 90));
  if (!['dark','light','system'].includes(next.theme)) next.theme = 'dark';
  if (!['right','left','top','bottom'].includes(next.edge)) next.edge = 'right';
  if (!['small','standard','large'].includes(next.panelSize)) next.panelSize='standard';
  if (!['compact','standard','roomy'].includes(next.railSpacing)) next.railSpacing='standard';
  if (!['black','light'].includes(next.panelColor)) next.panelColor='black';
  if (![60,70,75,80,85,90].includes(Number(next.redAt))) next.redAt=75;
  else next.redAt=Number(next.redAt);
  for (const k of ['autoCollapse','showRemaining','panelVisible','notifications','forecast','historyEnabled','startAtLogin','roundEnds','showSidePercent','showAcrossPercent','labelAboveRing','showSecondLimit','showResetClock','detailedCard']) next[k] = next[k] === true;
  next.shortcuts = {toggle: String(next.shortcuts?.toggle || '').slice(0,80), settings: String(next.shortcuts?.settings || '').slice(0,80)};
  return next;
}
class Storage {
  constructor(dir, encryption) {this.dir = dir; this.encryption = encryption; this.secrets = read(path.join(dir,'secrets.json'), {});}
  settings() {try {return validateSettings(read(path.join(this.dir,'settings.json'), defaultSettings()));} catch {return defaultSettings();}}
  saveSettings(settings) {const validated = validateSettings(settings); write(path.join(this.dir,'settings.json'), validated); return validated;}
  cache() {return read(path.join(this.dir,'cache.json'), {});}
  saveCache(cache) {write(path.join(this.dir,'cache.json'), cache);}
  credential(id) {try {return this.secrets[id] ? this.encryption.decryptString(Buffer.from(this.secrets[id], 'base64')) : null;} catch {return null;}}
  saveCredential(id, value) {
    if (!this.encryption.isEncryptionAvailable()) throw new Error('A proteção de credenciais do Windows está indisponível.');
    if (!value) delete this.secrets[id];
    else this.secrets[id] = this.encryption.encryptString(value).toString('base64');
    write(path.join(this.dir, 'secrets.json'), this.secrets);
  }
  deleteCredential(id) {delete this.secrets[id]; write(path.join(this.dir,'secrets.json'), this.secrets);}
  hasCredential(id) {return !!this.secrets[id];}
}
module.exports = {Storage, read, write, defaultSettings, validateSettings};
