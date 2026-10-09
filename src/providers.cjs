'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {parsers, date} = require('./core.cjs');
const {profileParsers, routes} = require('./profiles.cjs');
Object.assign(parsers, profileParsers);
class ProviderError extends Error { constructor(code, message) {super(message); this.code = code;} }
const error = (code, message) => new ProviderError(code, message);
async function readJSON(file) {
  const stat = await fs.stat(file);
  if (stat.size > 5 * 1024 * 1024) throw error('invalid', 'O arquivo excede 5 MB.');
  return JSON.parse(await fs.readFile(file, 'utf8'));
}
function cursorCookie(token) {
  if (token.includes('WorkosCursorSessionToken=')) return token.replace(/^Cookie:\s*/i, '');
  let claims;
  try {claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());} catch {throw error('auth', 'Token do Cursor inválido.');}
  if (!claims.sub || !claims.exp || claims.exp * 1000 < Date.now() + 60000) throw error('auth', 'Abra o Cursor para renovar o login.');
  return `WorkosCursorSessionToken=${encodeURIComponent(claims.sub.split('|').pop())}%3A%3A${token}`;
}
async function localCredential(provider, env = process.env, home = os.homedir()) {
  if (provider === 'codex') {
    const root = await readJSON(path.join(env.CODEX_HOME || path.join(home, '.codex'), 'auth.json'));
    if (!root.tokens?.access_token) throw error('auth', 'Entre no Codex usando sua conta ChatGPT.');
    return {token: root.tokens.access_token, accountId: root.tokens.account_id || ''};
  }
  if (provider === 'claude') {
    const root = await readJSON(path.join(env.CLAUDE_CONFIG_DIR || path.join(home, '.claude'), '.credentials.json'));
    if (!root.claudeAiOauth?.accessToken) throw error('auth', 'Entre no Claude Code para disponibilizar o login local.');
    if (root.claudeAiOauth.expiresAt && root.claudeAiOauth.expiresAt < Date.now()) throw error('auth', 'Abra o Claude Code para renovar o login.');
    return {token: root.claudeAiOauth.accessToken};
  }
  if (provider === 'cursor' || provider === 'grokBot') {
    const {DatabaseSync} = require('node:sqlite');
    const file = path.join(env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    const db = new DatabaseSync(file, {readOnly: true});
    try {
      const token = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get('cursorAuth/accessToken')?.value;
      if (!token) throw error('auth', 'Entre no Cursor para disponibilizar o login local.');
      return {token: cursorCookie(token)};
    } finally {db.close();}
  }
  const known = {
    huggingFace: [path.join(home, '.cache', 'huggingface', 'token'), null],
    gemini: [path.join(home, '.gemini', 'oauth_creds.json'), r => r.access_token],
    kiloCode: [path.join(home, '.local', 'share', 'kilo', 'auth.json'), r => r.kilo?.access],
    nousPortal: [path.join(home, '.hermes', 'auth.json'), r => r.providers?.nous?.access_token],
    openCodeGo: [path.join(home, '.local', 'share', 'opencode', 'auth.json'), r => r['opencode-go']?.key || r.opencode?.key]
  };
  if (known[provider]) {
    const [file, extract] = known[provider];
    const token = extract ? extract(await readJSON(file)) : (await fs.readFile(file, 'utf8')).trim();
    if (token) return {token};
  }
  throw error('auth', 'Insira a credencial desse serviço nas configurações.');
}
async function requestJSON(url, options = {}, fetcher = globalThis.fetch) {
  const {replyFormat = 'json', ...requestOptions} = options;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname))) throw error('address', 'Use HTTPS; HTTP é permitido apenas no computador local.');
  let response;
  try {
    response = await fetcher(url, {...requestOptions, redirect: 'error', signal: AbortSignal.timeout(20000), headers: {Accept: 'application/json', 'User-Agent': 'Neo/0.3.1', ...requestOptions.headers}});
  } catch {throw error('network', 'Não foi possível consultar o serviço. Verifique a conexão e tente novamente.');}
  if ([401, 403].includes(response.status)) throw error('auth', 'O serviço recusou o login. Entre novamente ou atualize a credencial.');
  if (response.status === 429) throw error('rate', 'O serviço pediu uma pausa nas consultas.');
  if (!response.ok) throw error('server', `O serviço respondeu com HTTP ${response.status}.`);
  const reader = response.body.getReader();
  let chunks = [], total = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 5 * 1024 * 1024) {await reader.cancel(); throw error('invalid', 'Resposta do serviço muito grande.');}
    chunks.push(Buffer.from(value));
  }
  const data = Buffer.concat(chunks);
  if (replyFormat === 'buffer') return data;
  if (replyFormat === 'text') return data.toString('utf8');
  if (replyFormat === 'jsonl') return data.toString('utf8').split(/\r?\n/).map(l=>{try{return JSON.parse(l);}catch{return null;}}).filter(Boolean);
  try {return JSON.parse(data.toString('utf8'));} catch {throw error('invalid', 'O serviço enviou uma resposta em formato inesperado.');}
}
function gatewayURL(base, suffix) {
  if (!base) throw error('address', 'Informe o endereço HTTPS do seu gateway.');
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash) throw error('address', 'Informe um endereço sem credenciais, consulta ou fragmento.');
  url.pathname = url.pathname.replace(/\/(v1|api)\/?$/, '').replace(/\/$/, '') + suffix;
  return url.href;
}
async function fetchAccount(account, credential, fetcher, options = {}) {
  const attemptedAt = new Date().toISOString();
  try {
    let root, source = 'API do serviço';
    // A captured provider reply is an explicit alternative route for every provider.
    if (account.captureFile || account.provider === 'extension') {
      const file = account.captureFile || account.file;
      if (!file || !path.isAbsolute(file)) throw error('file', 'Selecione um arquivo JSON local.');
      root = await readJSON(file);
      const stat = await fs.stat(file);
      const observedAt = date(stat.mtimeMs);
      const parsed = parsers[account.provider](root, {account, now: stat.mtimeMs});
      return {...parsed, accountId: account.id, source: 'Arquivo local', observedAt, attemptedAt, state: Date.now() - stat.mtimeMs > 600000 ? 'stale' : 'live'};
    }
    const {specialIds, fetchSpecial} = require('./special.cjs');
    let auth = credential ? {token: credential, accountId: account.remoteAccountId} : null;
    if (specialIds.has(account.provider)) {
      if (!credential && account.localAuth === false) throw error('auth', 'Habilite o login local ou insira uma credencial.');
      try {root = await fetchSpecial(account, credential, (url,opts)=>requestJSON(url,opts,fetcher));}
      catch(e) {if(e instanceof ProviderError)throw e;throw error('special', e instanceof SyntaxError ? 'A credencial em JSON está em formato inválido.' : e.message);}
      const parsed = parsers[account.provider](root, {account,now:Date.now()});
      if(!parsed.windows.length&&!parsed.balances.length)throw error('empty','O serviço não informou uma cota ou saldo.');
      return {...parsed,accountId:account.id,source:'Conector do serviço',observedAt:attemptedAt,attemptedAt,state:'live'};
    }
    if (!auth) {
      if (account.localAuth === false) throw error('auth', 'Insira uma credencial para esta conta.');
      try {auth = await localCredential(account.provider); source = 'Login local → API';}
      catch (e) {if (e instanceof ProviderError) throw e; throw error('auth', 'Login local indisponível. Entre no aplicativo ou insira uma credencial.');}
    }
    const get = (url, extra = {}) => requestJSON(url, {headers: {Authorization: `Bearer ${auth.token}`}, ...extra}, fetcher);
    switch (account.provider) {
      case 'codex': root = await get('https://chatgpt.com/backend-api/wham/usage', {headers: {Authorization: `Bearer ${auth.token}`, ...(auth.accountId ? {'ChatGPT-Account-Id': auth.accountId} : {})}}); break;
      case 'claude': root = await get('https://api.anthropic.com/api/oauth/usage', {headers: {Authorization: `Bearer ${auth.token}`, 'anthropic-beta': 'oauth-2025-04-20'}}); break;
      case 'cursor': root = await get('https://cursor.com/api/usage-summary', {headers: {Cookie: cursorCookie(auth.token)}}); break;
      case 'grokBot': root = await get('https://cursor.com/api/dashboard/get-sand-usage-status', {method: 'POST', body: '{}', headers: {Cookie: cursorCookie(auth.token), 'Content-Type': 'application/json', Origin: 'https://cursor.com'}}); break;
      case 'copilot': root = await get('https://api.github.com/copilot_internal/user', {headers: {Authorization: `token ${auth.token}`, 'X-Github-Api-Version': '2025-04-01', 'Editor-Version': 'vscode/1.96.2', 'Editor-Plugin-Version': 'copilot-chat/0.26.7'}}); break;
      case 'kimi': root = await get('https://api.kimi.com/coding/v1/usages'); break;
      case 'deepseek': root = await get('https://api.deepseek.com/user/balance'); break;
      case 'gemini': {
        const bodyHeaders = {Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json'};
        const assist = await get('https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist', {method: 'POST', body: JSON.stringify({metadata: {ideType: 'GEMINI_CLI', platform: 'WINDOWS', pluginType: 'GEMINI'}}), headers: bodyHeaders});
        const project = typeof assist.cloudaicompanionProject === 'string' ? assist.cloudaicompanionProject : assist.cloudaicompanionProject?.id;
        root = await get('https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota', {method: 'POST', body: JSON.stringify(project ? {project} : {}), headers: bodyHeaders});
        root.plan = assist.paidTier?.name || assist.currentTier?.name; break;
      }
      case 'liteLLM': {
        const info = await get(gatewayURL(account.baseUrl, `/key/info?key=${encodeURIComponent(auth.token)}`));
        const identity = info.info || {};
        if (identity.user_id) root = await get(gatewayURL(account.baseUrl, `/user/info?user_id=${encodeURIComponent(identity.user_id)}`));
        else if (identity.team_id) root = await get(gatewayURL(account.baseUrl, `/team/info?team_id=${encodeURIComponent(identity.team_id)}`));
        else root = info;
        root.identity = {user: identity.user_id, team: identity.team_id}; break;
      }
      default: {
        const route = routes[account.provider];
        if (!route) throw error('route', 'Este conector aceita a resposta JSON exportada do serviço. Selecione o arquivo em Conexão.');
        const url = route.gateway ? gatewayURL(account.baseUrl, route.url) : route.url;
        const token = auth.token.replace(/^Cookie:\s*/i, '');
        const headers = route.auth === 'cookie' ? {Cookie: token} : route.auth === 'key' ? {[route.header]: token} : {Authorization: `Bearer ${token}`};
        if (route.origin) {headers.Origin = route.origin; headers.Referer = route.origin + '/';}
        if (route.body !== undefined) headers['Content-Type'] = 'application/json';
        const requestOptions={method: route.method || 'GET', headers: {...headers, ...route.headers}, ...(route.body !== undefined ? {body: JSON.stringify(route.body)} : {}), ...(route.replyFormat?{replyFormat:route.replyFormat}:{})};
        try{root=await get(url,requestOptions);}catch(e){if(!route.fallback||! /HTTP (404|410)/.test(e.message))throw e;root=await get(route.fallback,requestOptions);}
        if (route.secondary) {try {root._secondary = await get(route.secondary, {headers});} catch { /* Secondary failure must not hide a valid primary reading. */ }}
        if (route.secondaryPath) {try {root._secondary = await get(gatewayURL(account.baseUrl,route.secondaryPath));} catch {throw error('empty','Não foi possível ler o gasto desse gateway; o saldo não pode ser calculado.');}}
        if (route.publicStatusPath) {try {root._status=await requestJSON(gatewayURL(account.baseUrl,route.publicStatusPath),{},fetcher);}catch{/* Unknown currency must not be guessed. */}}
      }
    }
    const parsed = parsers[account.provider](root, {account, now: Date.now()});
    if (!parsed.windows.length && !parsed.balances.length) throw error('empty', 'O serviço não informou uma cota ou saldo.');
    return {...parsed, accountId: account.id, source, observedAt: attemptedAt, attemptedAt, state: 'live'};
  } catch (e) {
    return {accountId: account.id, windows: [], balances: [], plan: null, state: 'unavailable', source: 'Sem leitura', attemptedAt, observedAt: null, error: e instanceof ProviderError ? e.message : 'Não foi possível ler os dados. Verifique o formato e a conexão.'};
  }
}
module.exports = {ProviderError, readJSON, cursorCookie, localCredential, requestJSON, gatewayURL, fetchAccount};
