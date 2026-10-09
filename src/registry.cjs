'use strict';
const primary = [
  {id: 'codex', name: 'Codex', mark: '◎', color: '#86efac', url: 'https://chatgpt.com/codex/settings/usage', auth: 'local', help: 'Lê o login do Codex em %USERPROFILE%\\.codex\\auth.json (ou CODEX_HOME). Para contas extras, insira um token OAuth e o ID da conta. O Neo não renova esse login.'},
  {id: 'claude', name: 'Claude Code', mark: '✳', color: '#edb591', url: 'https://claude.ai/settings/usage', auth: 'local', help: 'Lê %USERPROFILE%\\.claude\\.credentials.json (ou CLAUDE_CONFIG_DIR). Para contas extras, insira um token OAuth. Abra o Claude Code para renovar o login.'},
  {id: 'cursor', name: 'Cursor', mark: '◈', color: '#e6e9ef', url: 'https://cursor.com/dashboard', auth: 'local', help: 'Lê apenas cursorAuth/accessToken no banco do Cursor em %APPDATA%\\Cursor\\User\\globalStorage. Também aceita um JWT ou Cookie WorkosCursorSessionToken inserido abaixo.'},
  {id: 'copilot', name: 'GitHub Copilot', mark: '⌘', color: '#c4b5fd', url: 'https://github.com/settings/copilot', auth: 'token', help: 'Insira um token OAuth do GitHub aceito pelo Copilot. Tokens de API pessoais podem não funcionar no endpoint interno de cotas. Nenhuma permissão é ampliada pelo Neo.'},
  {id: 'kimi', name: 'Kimi Code', mark: 'K', color: '#94b7ff', url: 'https://www.kimi.com/code', auth: 'token', help: 'Insira a chave de API do Kimi Code. A cota é consultada na API de uso do plano Coding.'},
  {id: 'deepseek', name: 'DeepSeek', mark: '≈', color: '#739cff', url: 'https://platform.deepseek.com/usage', auth: 'token', help: 'Insira sua chave DeepSeek. Esse serviço reporta saldo em dinheiro, sem percentual ou janela de renovação.'},
  {id: 'extension', name: 'Extensão local', mark: '+', color: '#f0cf7a', url: null, auth: 'file', help: 'Selecione um JSON local com windows, plan e balances. Seu script pode atualizar esse arquivo. O Neo lê o JSON; não executa programas nem entrega credenciais a extensões.'}
];
const {routes} = require('./profiles.cjs');
const {specialIds} = require('./special.cjs');
const special = new Set(['codex','claude','cursor','grokBot','copilot','kimi','deepseek','gemini','liteLLM']);
const catalog = require('./catalog.json').map(p => {
  const existing = primary.find(x => x.id === p.id);
  const live = !!routes[p.id] || special.has(p.id) || specialIds.has(p.id);
  const local = ['codex','claude','cursor','grokBot','gemini','huggingFace','kiloCode','nousPortal','openCodeGo','kiro','antigravity','jetBrainsAI','volcengine','alibabaTokenPlan'].includes(p.id);
  const help = {
    kiro:'Instale e autentique kiro-cli com suporte ACP. Habilite o login local para consultar esse CLI.',
    antigravity:'Abra o Antigravity e habilite o login local. A consulta usa somente o servidor de cotas no computador.',
    jetBrainsAI:'Abra uma IDE JetBrains com AI Assistant e habilite o login local. O arquivo de cotas mais recente será lido.',
    alibabaTokenPlan:'Instale e autentique o CLI bl e habilite o login local. O conector consulta usage token-plan.',
    volcengine:'Use arkcli autenticado com login local, ou JSON com accessKeyID e secretAccessKey.',
    windsurf:'Insira JSON com devin_session_token, devin_auth1_token, devin_account_id e devin_primary_org_id da sua própria sessão.',
    devin:'Insira JSON com token e organizationId da sua própria sessão Devin.',
    xaiAPI:'Insira TeamID:ManagementKey. É necessária uma chave de gerenciamento da equipe.'
  }[p.id];
  const auth = ['volcengine','windsurf','devin'].includes(p.id)?'json':existing?.auth || (['ollamaCloud','sakana','qwenCloud','notionAI','ibmBob','replicate','typeSafe','zoomMate'].includes(p.id)?'cookie':routes[p.id]?routes[p.id].auth==='cookie'?'cookie':'token':p.auth);
  return {...p, ...existing, live, auth, local, gateway: ['bifrost','liteLLM','llmProxy','sub2api','newAPI'].includes(p.id), help: help || existing?.help || (live ? auth === 'cookie' ? 'Insira o cabeçalho Cookie da sua sessão nesse serviço. Somente o domínio desse provedor recebe essa credencial. O endpoint segue o conector do Pulse original e pode mudar.' : 'Insira sua chave ou token do serviço. A consulta usa a rota do Pulse original. Alguns provedores exigem um token da sessão do cliente em vez de uma chave de API.' : 'Conector de importação: selecione a resposta exportada do provedor em JSON. A conexão automática desse serviço ainda precisa ser adaptada ao Windows.')};
});
module.exports = [...catalog, {...primary.find(p=>p.id==='extension'),live:false}];
