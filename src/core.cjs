'use strict';
// Provider contracts adapted from Pulse (qunqin24), Apache-2.0.
const finite = v => (typeof v === 'number' || typeof v === 'string') && String(v).trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
const date = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = finite(v);
  const ms = n === null ? Date.parse(v) : n < 1e12 ? n * 1000 : n;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};
function windowOf(id, label, percent, reset, seconds = null, exhausted = false) {
  const usedPercent = finite(percent);
  return usedPercent === null || usedPercent < 0 ? null : { id, label, usedPercent, resetsAt: date(reset), windowSeconds: seconds, exhausted: !!exhausted };
}
function durationLabel(seconds) {
  return seconds === 604800 ? 'Semanal' : seconds === 18000 ? '5 horas' : seconds === 86400 ? 'Diário' : seconds ? `${seconds / 3600} horas` : 'Cota';
}
function parseCodex(root) {
  const windows = [];
  const groups = [{ key: 'account', label: '', rate: root.rate_limit, extraSpent: root.spend_control?.reached === true || root.rate_limit_reached_type != null },
    ...(root.additional_rate_limits || []).map((g, i) => ({key: g.metered_feature || `extra-${i}`, label: g.limit_name || '', rate: g.rate_limit}))];
  for (const group of groups) {
    const current = [];
    for (const slot of ['primary_window', 'secondary_window']) {
      const w = group.rate?.[slot];
      if (!w) continue;
      const seconds = finite(w.limit_window_seconds);
      const parsed = windowOf(`${group.key}.${slot}`, [durationLabel(seconds), group.label].filter(Boolean).join(' · '), w.used_percent, w.reset_at, seconds);
      if (parsed) current.push(parsed);
    }
    if (current.length && (group.extraSpent || group.rate?.limit_reached === true || group.rate?.allowed === false)) {
      const largest = Math.max(...current.map(w => w.usedPercent));
      current.filter(w => w.usedPercent === largest).forEach(w => { w.exhausted = true; });
    }
    windows.push(...current);
  }
  const balance = finite(root.credits?.balance);
  return { windows, plan: root.plan_type || null, balances: balance === null ? [] : [{currency: 'créditos', amount: balance}] };
}
function claudeSpent(w) {
  return w.locked_reason != null || (typeof w.severity === 'string' && !['normal', 'ok', 'none', 'healthy', 'warning', 'warn'].includes(w.severity.toLowerCase()));
}
function parseClaude(root) {
  let windows = (Array.isArray(root.limits) ? root.limits : []).map((w, i) => {
    const seconds = w.kind === 'session' ? 18000 : ['weekly_all', 'weekly_scoped'].includes(w.kind) ? 604800 : null;
    if (!seconds) return null;
    const scope = w.scope?.model?.display_name;
    return windowOf(`${w.kind}.${scope || 'all'}.${i}`, [durationLabel(seconds), scope].filter(Boolean).join(' · '), w.percent, w.resets_at, seconds, claudeSpent(w));
  }).filter(Boolean);
  if (!windows.length) windows = ['five_hour', 'seven_day', 'seven_day_sonnet', 'seven_day_opus'].map(key => {
    const w = root[key];
    return w && windowOf(key, key === 'five_hour' ? '5 horas' : `Semanal${key.includes('sonnet') ? ' · Sonnet' : key.includes('opus') ? ' · Opus' : ''}`, w.utilization ?? w.used_percentage, w.resets_at, key === 'five_hour' ? 18000 : 604800, claudeSpent(w));
  }).filter(Boolean);
  return {windows, plan: null, balances: []};
}
function parseCopilot(root) {
  const reset = root.quota_reset_date_utc ?? root.quota_reset_date;
  const windows = Object.entries({premium_interactions: 'Requisições premium', chat: 'Chat', completions: 'Completions'}).map(([key, label]) => {
    const w = root.quota_snapshots?.[key];
    const remaining = finite(w?.percent_remaining);
    if (!w || w.unlimited === true || w.has_quota === false || remaining === null) return null;
    return windowOf(key, label, Math.max(0, 100 - remaining), reset, null, remaining <= 0 && w.overage_permitted !== true);
  }).filter(Boolean);
  return {windows, plan: root.copilot_plan || null, balances: []};
}
function parseCursor(root) {
  const plan = root.individualUsage?.plan ?? root.teamUsage?.pooled;
  let windows = [['autoPercentUsed', 'Modelos Cursor'], ['apiPercentUsed', 'Outros modelos']].map(([key, label]) => windowOf(key, label, plan?.[key], root.billingCycleEnd)).filter(Boolean);
  const moneyWindow = (p, id, label) => p?.enabled === false || !(finite(p?.limit) > 0) || finite(p?.used) === null ? null : windowOf(id, label, p.used / p.limit * 100, root.billingCycleEnd);
  if (!windows.length) { const w = moneyWindow(plan, 'plan', 'Plano mensal'); if (w) windows.push(w); }
  const onDemand = moneyWindow(root.individualUsage?.onDemand ?? root.teamUsage?.onDemand, 'onDemand', 'Gasto adicional');
  if (onDemand) windows.push(onDemand);
  const amount = finite(plan?.remaining);
  return {windows, plan: root.membershipType || null, balances: amount === null ? [] : [{currency: 'USD', amount: amount / 100}]};
}
function parseKimi(root) {
  const windows = [];
  const add = (d, id, seconds, label) => {
    const limit = finite(d?.limit);
    const used = finite(d?.used) ?? (finite(d?.remaining) !== null && limit !== null ? limit - Number(d.remaining) : null);
    if (!(limit > 0) || used === null) return;
    const w = windowOf(id, label, Math.max(0, used / limit * 100), d.resetTime, seconds, used >= limit);
    if (w) windows.push(w);
  };
  for (const [i, w] of (root.limits || []).entries()) {
    const multiplier = {SECOND: 1, MINUTE: 60, HOUR: 3600, DAY: 86400, WEEK: 604800, SECONDS: 1, MINUTES: 60, HOURS: 3600, DAYS: 86400}[w.window?.timeUnit?.toUpperCase().replace(/^TIME_UNIT_/, '')];
    const seconds = multiplier && finite(w.window?.duration) > 0 ? w.window.duration * multiplier : null;
    if (seconds) add(w.detail, `limit.${i}`, seconds, durationLabel(seconds));
  }
  add(root.usage, 'weekly', null, 'Semanal');
  return {windows, plan: root.user?.membership?.level || null, balances: []};
}
function parseDeepSeek(root) {
  const balances = (root.balance_infos || []).map(b => ({currency: b.currency, amount: finite(b.total_balance)})).filter(b => typeof b.currency === 'string' && b.amount !== null);
  return { windows: [], balances, plan: 'Pré-pago', exhausted: root.is_available === false };
}
function validateExtension(root) {
  if (!root || !Array.isArray(root.windows) || root.windows.length > 30) throw new Error('Resposta da extensão inválida.');
  const ids = new Set();
  const windows = root.windows.map(w => {
    if (typeof w.id !== 'string' || !w.id || ids.has(w.id) || typeof w.label !== 'string') throw new Error('Limite da extensão inválido.');
    ids.add(w.id);
    const parsed = windowOf(w.id, w.label.slice(0, 120), w.usedPercent, w.resetsAt, finite(w.windowSeconds), w.exhausted === true);
    if (!parsed) throw new Error('Percentual da extensão inválido.');
    return parsed;
  });
  const balances = (root.balances || []).map(b => ({currency: String(b.currency).slice(0, 12), amount: finite(b.amount)})).filter(b => b.amount !== null);
  return {windows, balances, plan: typeof root.plan === 'string' ? root.plan.slice(0, 120) : null};
}
const parsers = {codex: parseCodex, claude: parseClaude, cursor: parseCursor, copilot: parseCopilot, kimi: parseKimi, deepseek: parseDeepSeek, extension: validateExtension};
function activeWindows(reading, now = Date.now()) {
  return (reading?.windows || []).filter(w => !w.resetsAt || Date.parse(w.resetsAt) > now);
}
function headline(reading, pinned, now = Date.now()) {
  const windows = activeWindows(reading, now);
  return windows.find(w => w.id === pinned) || windows.sort((a, b) => Number(b.exhausted) - Number(a.exhausted) || b.usedPercent - a.usedPercent)[0] || null;
}
function reconcile(reading, previous, now = Date.now()) {
  if (reading.state === 'live') return reading;
  if (previous && now - Date.parse(previous.observedAt) < 86400000) {
    const windows = activeWindows(previous, now);
    if (windows.length || previous.balances?.length) return {...previous, windows, state: 'stale', error: reading.error, attemptedAt: reading.attemptedAt};
  }
  return reading;
}
function forecast(previous, current, now = Date.now()) {
  if (!previous || current?.state !== 'live' || previous.state !== 'live') return null;
  const elapsed = (Date.parse(current.observedAt) - Date.parse(previous.observedAt)) / 1000;
  if (elapsed < 30) return null;
  for (const w of activeWindows(current, now)) {
    const old = previous.windows.find(p => p.id === w.id && p.resetsAt === w.resetsAt);
    if (!old || w.usedPercent <= old.usedPercent || w.usedPercent >= 100 || !w.resetsAt) continue;
    const etaSeconds = (100 - w.usedPercent) / ((w.usedPercent - old.usedPercent) / elapsed);
    if (etaSeconds * 1000 < Date.parse(w.resetsAt) - now) return {windowId: w.id, etaSeconds: Math.round(etaSeconds)};
  }
  return null;
}
function alerts(previous, current, threshold, notified = {}) {
  if (current.state !== 'live') return [];
  const result = [];
  for (const w of current.windows || []) {
    const key = `${w.id}|${w.resetsAt || 'unknown'}`;
    const previousLevel = notified[key] || 0;
    const level = w.exhausted ? 2 : w.usedPercent >= threshold ? 1 : 0;
    if (level > previousLevel) {result.push({type: level === 2 ? 'spent' : 'threshold', window: w}); notified[key] = level;}
    const old = previous?.windows?.find(p => p.id === w.id);
    if (old && (old.exhausted || old.usedPercent >= threshold) && old.resetsAt && w.resetsAt && Date.parse(w.resetsAt) - Date.parse(old.resetsAt) > 60000 && w.usedPercent < threshold) result.push({type: 'reset', window: w});
  }
  return result;
}
module.exports = {finite, date, windowOf, parsers, activeWindows, headline, reconcile, forecast, alerts};
