'use strict';
// Translated from the provider services at upstream commit 73e210f.
const {finite: n, date, windowOf: w} = require('./core.cjs');
const result = (windows = [], balances = [], plan = null) => ({windows: windows.filter(Boolean), balances: balances.filter(Boolean), plan});
const balance = (amount, currency = 'USD') => n(amount) === null ? null : {amount: n(amount), currency};
const ratio = (id, label, used, limit, reset = null, seconds = null, blocked) => n(used) !== null && n(used) >= 0 && n(limit) > 0 ? w(id, label, n(used) / n(limit) * 100, reset, seconds, blocked ?? n(used) >= n(limit)) : null;
const left = (id, label, remaining, limit, reset, seconds) => n(remaining) !== null && n(limit) > 0 ? ratio(id, label, Math.max(0, n(limit) - n(remaining)), limit, reset, seconds) : null;
const percentLeft = (id, label, remaining, reset, seconds, fraction = false) => n(remaining) === null ? null : w(id, label, Math.max(0, 100 - n(remaining) * (fraction ? 100 : 1)), reset, seconds, n(remaining) <= 0);
const unwrap = r => r?.data ?? r;
const windowList = (r, slots) => result(slots.map(([key, label, seconds]) => {
  const p = r?.[key]; return p && w(key, label, p.percent ?? p.percentUsed ?? p.usedPercent, p.resetsAt ?? p.resets_at, seconds, p.status === 'rate_limited');
}));
const profileParsers = {
  atlasCloud: r => r.object === 'balance' && r.scope === 'account' ? result([], [balance(r.available?.value, r.available?.currency)]) : result(),
  moonshot: r => r.code === 0 && r.status === true ? result([], [balance(r.data?.available_balance)]) : result(),
  hyper: r => result([], [balance(r.balance, 'HC')]),
  poe: r => result([], [balance(r.current_point_balance, 'pontos')]),
  venice: r => result([], [r.consumptionCurrency?.toUpperCase() === 'DIEM' ? balance(r.balances?.diem, 'DIEM') : balance(r.balances?.usd) ?? balance(r.balances?.diem, 'DIEM')]),
  openAIPlatform: r => result([], [balance(r.total_available)]),
  elevenLabs: r => result([ratio('characters','Caracteres',r.character_count,r.character_limit,r.next_character_count_reset_unix)], [], r.tier),
  vercelAIGateway: r => result([], [balance(r.balance)]),
  deepInfra: r => n(r.stripe_balance) !== null && n(r.recent) !== null ? result([ratio('spend','Orçamento',Math.max(0,r.recent),r.limit)], [balance(-r.stripe_balance - Math.max(0,r.recent))]) : result(),
  huggingFace: r => result([left('zeroGPU','ZeroGPU',r.current,r.base,r.resetsAt)]),
  clinePass: r => r.success === true ? result((r.data?.limits || []).map((l,i) => w(`limit.${i}`, l.type, l.percentUsed, l.resetsAt, {five_hour:18000,weekly:604800}[l.type], n(l.percentUsed)>=100))) : result(),
  clawRouter: r => r.budget?.configured === true ? result([ratio('budget','Orçamento mensal',r.budget.spentMicros,r.budget.limitMicros)]) : result(),
  synthetic: r => {
    const s = r.rollingFiveHourLimit || r.weeklyTokenLimit ? r : r.data || {};
    const clean = v => typeof v === 'string' ? n(v.replace(/[$,]/g,'')) : n(v);
    const weekly = s.weeklyTokenLimit;
    const weeklyWindow = weekly?.percentRemaining != null ? percentLeft('weekly','Semanal',weekly.percentRemaining) : left('weekly','Semanal',clean(weekly?.remainingCredits),clean(weekly?.maxCredits));
    const parsed=result([left('fiveHour','5 horas',s.rollingFiveHourLimit?.remaining,s.rollingFiveHourLimit?.max,null,18000), weeklyWindow, n(s.search?.hourly?.requests) !== null ? ratio('search','Busca · 1 hora',s.search.hourly.requests,s.search.hourly.limit,s.search.hourly.renewsAt,3600) : left('search','Busca · 1 hora',s.search?.hourly?.remaining,s.search?.hourly?.limit,s.search?.hourly?.renewsAt,3600)], [], s.plan);
    if(s.rollingFiveHourLimit?.limited===true)parsed.windows.find(w=>w.id==='fiveHour')&&(parsed.windows.find(w=>w.id==='fiveHour').exhausted=true);
    if(weekly?.limited===true)parsed.windows.find(w=>w.id==='weekly')&&(parsed.windows.find(w=>w.id==='weekly').exhausted=true);
    return parsed;
  },
  openCodeGo: r => windowList(r.usage, [['rolling','5 horas',18000],['weekly','Semanal',604800],['monthly','Mensal',null]]),
  grok: r => result([w('credits','Cota',r.config?.creditUsagePercent,r.config?.currentPeriod?.end,null,n(r.config?.creditUsagePercent)>=100)]),
  grokBot: r => r.hasNonZeroIncludedLimit === false || r.includedLimitZero === true ? result() : result([w('weekly','Semanal',r.usagePercent,r.nextResetTimestampUtc,604800,n(r.usagePercent)>=100)],[],r.grokPlanLabel),
  devPass: r => {const d=r.data||{}; return result([ratio('weekly','Premium semanal',d.devPlanPremiumCreditsUsed,d.devPlanPremiumWeeklyLimit,d.devPlanPremiumWeekResetsAt,604800),ratio('cycle','Créditos do plano',d.devPlanCreditsUsed,d.devPlanCreditsLimit),ratio('key','Limite da chave',d.usage,d.limit)],[],d.devPlan);},
  chutes: r => result([ratio('rolling','Janela móvel',r.rolling_window?.requests,r.rolling_window?.limit,r.rolling_window?.reset_at,n(r.rolling_window?.window_minutes)>0?r.rolling_window.window_minutes*60:null),ratio('monthly','Mensal',r.monthly?.used,r.monthly?.limit,r.monthly?.resets_at)],[],r.subscription?.plan_name),
  abacus: r => {const d=r.result||{}; return result([left('points','Pontos de computação',d.computePointsLeft,d.totalComputePoints,r._secondary?.result?.nextBillingDate)],[],r._secondary?.result?.currentTier);},
  augment: r => result([ratio('credits','Créditos',r.usageUnitsConsumedThisBillingCycle,r.usageUnitsAvailable,r._secondary?.billingPeriodEnd)],[],r._secondary?.planName),
  raycastAI: r => result([left('credits','Créditos',r.remaining_balance_credits,r.total_balance_credits,r.next_credits_at)],[],r.funding_subscription?.tier),
  gitKraken: r => {const d=r.data||r;return result([ratio('personal','Créditos pessoais',d.used,d.limit,d.resetsOn),ratio('organization','Créditos da equipe',d.organization?.used,d.organization?.limit,d.resetsOn)]);},
  xKiro: (r,{now=Date.now()}={}) => result([...(r.windows||[]).map((p,i)=>ratio(`window.${i}`,p.kind,p.spent_usd,p.cap_usd,n(p.resets_in_sec)>0?now+n(p.resets_in_sec)*1000:null,p.window_sec)),ratio('free','Tokens gratuitos diários',r.free_tokens?.used_today,r.free_tokens?.limit_per_day)], [balance(r.wallet?.balance_usd)],r.plan),
  zed: r => result([ratio('tokens','Gasto com tokens',r.current_usage?.token_spend?.spend_in_cents,r.current_usage?.token_spend?.limit_in_cents),ratio('edits','Previsões de edição',r.current_usage?.edit_predictions?.used,r.current_usage?.edit_predictions?.limit)],[],r.plan),
  perplexity: r => result([], [balance(n(r.balance_cents)!==null?r.balance_cents/100:null)]),
  replicate: r => result([], [balance(r.unused_credit)]),
  manus: r => result([left('daily','Créditos diários',r.refreshCredits,r.maxRefreshCredits,r.nextRefreshTime,r.refreshInterval==='daily'?86400:null),left('monthly','Créditos mensais',r.periodicCredits,r.proMonthlyCredits)], [balance(r.totalCredits,'créditos')]),
  mistral: r => {const secondary=r._secondary;const d=secondary?.[0]?.result?.data?.json; return result([w('vibe','Vibe mensal',d?.usage_percentage,d?.reset_at,null,n(d?.usage_percentage)>=100)],[balance(n(r.wallet_amount)!==null ? n(r.wallet_amount)+(n(r.credit_notes_amount)||0)-(n(r.ongoing_usage_balance)||0):null,r.currency||'USD')]);},
  typeSafe: r => {const d=r.data?.billing||{};return result([], [balance(d.balance)],d.plan);},
  codebuff: r => result([ratio('credits','Créditos',r.usage,r.quota,r.next_quota_reset),ratio('weekly','Semanal',r._secondary?.rateLimit?.weeklyUsed,r._secondary?.rateLimit?.weeklyLimit,r._secondary?.rateLimit?.weeklyResetsAt,604800)],[balance(r.remainingBalance,'créditos')],r._secondary?.subscription?.tier),
  neuralwatt: r => {const d=r.subscription||{},k=r.key?.allowance||{},b=r.balance||{}; return result([ratio('subscription','Assinatura · kWh',d.kwh_used,d.kwh_included??(n(d.kwh_used)!==null&&n(d.kwh_remaining)!==null?n(d.kwh_used)+n(d.kwh_remaining):null),d.current_period_end),ratio('allowance','Orçamento da chave',k.spent_usd,k.limit_usd)],[balance(b.credits_remaining_usd??(n(b.total_credits_usd)!==null&&n(b.credits_used_usd)!==null?b.total_credits_usd-b.credits_used_usd:null))],d.plan);},
  zenMux: r => {const d=r.data||{};return result([w('fiveHour','5 horas',n(d.quota_5_hour?.usage_percentage)!==null?d.quota_5_hour.usage_percentage*100:null,d.quota_5_hour?.resets_at,18000,n(d.quota_5_hour?.usage_percentage)>=1),w('weekly','Semanal',n(d.quota_7_day?.usage_percentage)!==null?d.quota_7_day.usage_percentage*100:null,d.quota_7_day?.resets_at,604800,n(d.quota_7_day?.usage_percentage)>=1)],[balance(r._secondary?.data?.total_credits,r._secondary?.data?.currency)],d.plan?.tier);},
  v0: r => {const d=r.data||{};return result([r.billingType==='token'?left('billing','Créditos',d.balance?.remaining,d.balance?.total,d.billingCycle?.end):r.billingType==='legacy'?left('billing','Créditos',d.remaining,d.limit,d.reset):null,left('requests','Requisições',r._secondary?.remaining,r._secondary?.limit,r._secondary?.reset)]);},
  nousPortal: r => result([left('monthly','Créditos mensais',r.subscription?.credits_remaining,r.subscription?.monthly_credits,r.subscription?.current_period_end)],[balance(r.purchased_credits_remaining,'créditos')],r.subscription?.plan),
  longCat: r => {const d=r.data||{}; const lot=d.currentLot;return result([lot?ratio('tokenPack','Pacote de tokens',lot.consumedToken,lot.totalToken):ratio('tokens','Tokens',d.usage?.usedToken,d.usage?.totalToken)]);},
  zoomMate: r => {const d=r.data?.credit_status||{};return d.is_unlimited?result():result([ratio('credits','Créditos',d.used_credit,d.budget_cap,d.cycle_end_date,null,d.is_quota_available===false&&!d.allow_overage)]);},
  devin: r => {
    const daily=r.hideDailyQuota===true||r.hide_daily_quota===true?null:r.dailyRemainingPercent!=null?percentLeft('daily','Diário',r.dailyRemainingPercent,r.dailyResetAtUnix,86400):w('daily','Diário',r.daily_percentage,r.daily_reset_at,86400);
    const weekly=r.hideWeeklyQuota===true||r.hide_weekly_quota===true?null:r.weeklyRemainingPercent!=null?percentLeft('weekly','Semanal',r.weeklyRemainingPercent,r.weeklyResetAtUnix,604800):w('weekly','Semanal',r.weekly_percentage,r.weekly_reset_at,604800);
    return result(r.has_quota_allocation===false?[]:n(r.totalMessages)>0?[left('messages','Mensagens',r.remainingMessages,r.totalMessages)]:[daily,weekly],[balance(n(r.overageBalanceMicros)!==null?r.overageBalanceMicros/1e6:n(r.overage_balance_cents)!==null?r.overage_balance_cents/100:r.overage_balance)],r.planName||r.plan_name);
  },
  v2ex: r => {const d=r.result||{};return r.success===true?result([w('fiveHour','5 horas',d.used_percent,d.active&&d.period_end>0?d.period_end:null,18000,n(d.remaining_tokens)===0),ratio('extra','Pacote adicional',d.extra_usage?.used_tokens,d.extra_usage?.total_tokens)]):result();},
  newAPI: r => {
    const status=r._status?.data,type=status?.quota_display_type?.trim().toUpperCase();
    const currency=type?(['USD','CNY'].includes(type)?type:null):status?.display_in_currency===true?'USD':null;
    const limit=n(r.hard_limit_usd),used=n(r._secondary?.total_usage);
    return limit!==null&&limit<1e8&&used!==null&&currency?result([],[balance(limit-used/100,currency)],status?.system_name):result();
  },
  qoder: (r,options={}) => {const d=r.data||r;const windows=[];for(const [key,label] of [['totalQuota','Créditos pessoais'],['sharedQuota','Créditos compartilhados']]) {const snake=key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());const p=d[key]?.quotaSummary||d[snake]?.quota_summary; if(!p||!(n(p.limitValue??p.limit_value)>0))continue;windows.push(w(key,label,p.usagePercentage??p.usage_percentage??(n(p.usedValue??p.used_value)!==null?n(p.usedValue??p.used_value)/n(p.limitValue??p.limit_value)*100:null),date(d.nextResetAt||d.next_reset_at)&&Date.parse(date(d.nextResetAt||d.next_reset_at))>(options.now??Date.now())?d.nextResetAt||d.next_reset_at:null,null,n(p.remainingValue??p.remaining_value)===0));}return result(windows);},
  stepFun: r => {
    const d=r.plan_credit_rate_limit;
    if(r.status!==1)return result();
    if(r.plan_family===2) {const buckets=(d?.credit_buckets||[]).filter(b=>n(b.credit_total)>0);return result([left('credits','Créditos do plano e pacotes',buckets.reduce((a,b)=>a+(n(b.credit_residual)||0),0),buckets.reduce((a,b)=>a+n(b.credit_total),0))]);}
    return result([percentLeft('fiveHour','5 horas',r.five_hour_usage_left_rate,r.five_hour_usage_reset_time>0?r.five_hour_usage_reset_time:null,18000,true),percentLeft('weekly','Semanal',r.weekly_usage_left_rate,r.weekly_usage_reset_time>0?r.weekly_usage_reset_time:null,604800,true)]);
  },
  commandCode: r => {const d=r.windowLimits||{},c=r.credits||{};return result(d.limited===false?[]:[ratio('fiveHour','5 horas',d.fiveHour?.used,d.fiveHour?.cap,d.fiveHour?.resetAt,18000),ratio('weekly','Semanal',d.weekly?.used,d.weekly?.cap,d.weekly?.resetAt,604800)],[balance(n(c.monthlyCredits)!==null?n(c.monthlyCredits)+(n(c.purchasedCredits)||0)+(n(c.freeCredits)||0):null)],c.planId);},
  kiro: r => {const d=r.data||r;return result((d.usageBreakdowns||[]).filter(p=>p.hasLimit!==false).map((p,i)=>ratio(`credits.${i}`,p.displayName||p.resourceType,p.used,p.limit,d.billingCycleReset,null,n(p.used)>=n(p.limit)&&d.overagesEnabled!==true)),[],d.planName);},
  gemini: r => result((r.buckets||[]).map((p,i)=>percentLeft(`bucket.${i}`,`${p.modelId} · ${p.tokenType}`,p.remainingFraction,p.resetTime,null,true)),[],r.plan),
  antigravity: r => result((r.response?.groups||[]).flatMap((g,i)=>(g.buckets||[]).map((p,j)=>percentLeft(`${i}.${j}`,`${g.displayName} · ${p.window}`,p.remainingFraction,p.resetTime,p.window==='weekly'?604800:p.window==='5h'?18000:null,true)))),
  alibabaTokenPlan: r => result([w('fiveHour','5 horas',n(r.per5HourPercentage)!==null?r.per5HourPercentage*100:null,r.per5HourResetTime,18000),w('weekly','Semanal',n(r.per1WeekPercentage)!==null?r.per1WeekPercentage*100:null,r.per1WeekResetTime,604800),w('monthly','Mensal',n(r.per1MonthPercentage)!==null?r.per1MonthPercentage*100:null,r.per1MonthResetTime)]),
  alibabaCodingPlan: r => {const plans=r.data?.codingPlanInstanceInfos||[];const d=plans.find(p=>['VALID','ACTIVE'].includes(p.status));const q=d?.codingPlanQuotaInfo||{};return result([ratio('fiveHour','5 horas',q.per5HourUsedQuota,q.per5HourTotalQuota,q.per5HourQuotaNextRefreshTime,18000),ratio('weekly','Semanal',q.perWeekUsedQuota,q.perWeekTotalQuota,q.perWeekQuotaNextRefreshTime,604800),ratio('monthly','Mensal',q.perBillMonthUsedQuota,q.perBillMonthTotalQuota,q.perBillMonthQuotaNextRefreshTime)],[],d?.planName);},
  qwenCloud: r => {let d=r.data?.DataV2?.data;try{if(typeof d==='string')d=JSON.parse(d);}catch{return result();}return profileParsers.alibabaTokenPlan(d?.data||d||{});},
  volcengine: r => {
    let windows=(r.Result?.QuotaUsage||[]).map((p,i)=>w(`coding.${i}`,p.Level,p.Percent,p.ResetTimestamp,{weekly:604800,'5h':18000}[p.Level]));
    for(const [k,label,seconds] of [['AFPFiveHour','Agent · 5 horas',18000],['AFPWeekly','Agent · Semanal',604800],['AFPDaily','Agent · Diário',86400],['AFPMonthly','Agent · Mensal',null]]){const p=r.Result?.[k];if(p)windows.push(ratio(k,label,p.Used,p.Quota,p.ResetTime>0?p.ResetTime:null,seconds));}
    for(const [i,p]of(r.items||[]).entries())for(const[j,q]of(p.periods||[]).entries())windows.push(w(`${i}.${j}`,`${p.product} · ${q.label}`,q.percent,q.reset_at,{weekly:604800,'5h':18000}[q.label]));
    return result(windows);
  },
  factory: (r,{now=Date.now()}={}) => {
    const windows=[];
    for(const[scope,periods]of Object.entries(r.limits||{}))for(const[key,p]of Object.entries(periods))windows.push(w(`${scope}.${key}`,`${scope} · ${key}`,p.usedPercent,p.windowEnd??(n(p.secondsRemaining)>0?now+p.secondsRemaining*1000:null),{fiveHour:18000,weekly:604800}[key],n(p.usedPercent)>=100));
    if(!windows.length)for(const key of ['standard','premium']){const p=r.usage?.[key];if(p)windows.push(ratio(key,key,p.orgTotalTokensUsed??p.userTokens,p.totalAllowance,r.usage.endDate));}
    return result(windows,[balance(n(r.extraUsageBalanceCents)!==null?r.extraUsageBalanceCents/100:null)]);
  },
  llmProxy: r => result(Object.entries(r.providers||{}).flatMap(([provider,d])=>Object.entries(d.quota_groups||{}).map(([key,p])=>percentLeft(`${provider}.${key}`,`${provider} · ${key}`,p.remaining_percent,p.reset_time)))),
  liteLLM: r => {const id=r.identity||{};let budgets=[];if(r.user_info){if(id.user&&r.user_info.user_id&&id.user!==r.user_info.user_id)return result();budgets.push(['user','Orçamento pessoal',r.user_info]);if(id.team){const team=r.teams?.find(t=>t.team_id===id.team);if(team)budgets.push(['team','Orçamento da equipe',team]);}}else if(r.team_info){if(id.team&&r.team_info.team_id&&id.team!==r.team_info.team_id)return result();budgets.push(['team','Orçamento da equipe',r.team_info]);}else if(r.info)budgets.push(['key','Chave',r.info]);return result(budgets.map(([key,label,p])=>ratio(key,label,p.spend,p.max_budget,p.budget_reset_at)));},
  aixy: r => result((r.budgets||[]).filter(p=>p.applies_to?.some(a=>a.api_key_id===r.key?.id)).map((p,i)=>ratio(`budget.${i}`,`${p.scope} · ${p.interval}`,p.availability?.status==='available'?n(p.availability.spent_usd)+(n(p.availability.reserved_usd)||0):p.spend_usd,p.limit_usd,p.resets_at,null,p.enforcement==='hard'&&p.availability?.status==='exhausted'))),
  bifrost: r => {const budgets=[...(r.budgets||[]).map(p=>({p,scope:'Chave'})),...(r.provider_configs||[]).flatMap(c=>(c.budgets||[]).map(p=>({p,scope:c.provider}))),...(r.model_configs||[]).flatMap(c=>(c.budgets||[]).map(p=>({p,scope:c.model_name})))];return result(budgets.map(({p,scope},i)=>ratio(`budget.${i}`,scope,p.current_usage,n(p.max_limit)!==null?p.max_limit+((p.override_mode==='permanent'||p.override_cycles_remaining>0)?(n(p.override_amount)||0):0):null)));},
  kiloCode: r => {const payload=i=>r?.[i]?.result?.data?.json??r?.[i]?.result?.data;const b=payload(0),p=payload(1)?.subscription;const total=n(b?.totalBalance_mUsd)??(Array.isArray(b?.creditBlocks)?b.creditBlocks.reduce((a,b)=>a+(n(b.balance_mUsd)||0),0):null);return result([ratio('pass','Kilo Pass',p?.currentPeriodUsageUsd,n(p?.currentPeriodBaseCreditsUsd)!==null?n(p.currentPeriodBaseCreditsUsd)+(n(p.currentPeriodBonusCreditsUsd)||0):null,p?.nextBillingAt)],[balance(total!==null?total/1e6:null)],p?.tier);},
  amp: r => {
    const text=r.result?.displayText||'',windows=[];
    const daily=text.match(/(?:Amp Free[^\n]*?)([\d.]+)% remaining today/i);if(daily)windows.push(percentLeft('daily','Amp Free diário',daily[1],null,86400));
    const agent=text.match(/agent usage[^\n]*?remaining \(([\d.]+)%\)/i),orb=text.match(/orb usage[^\n]*?remaining \(([\d.]+)%\)/i);
    if(agent)windows.push(percentLeft('agent','Agent',agent[1]));if(orb)windows.push(percentLeft('orb','Orb',orb[1]));
    const credits=text.match(/Individual credits:\s*\$([\d,.]+)/i);
    return result(windows,[balance(credits?credits[1].replace(/,/g,''):null)]);
  },
  warp: r => {const d=r.data?.user?.user||{},q=d.requestLimitInfo;return result([q?.isUnlimited?null:ratio('requests','Requisições',q?.requestsUsedSinceLastRefresh,q?.requestLimit,q?.nextRefreshTime),...[...(d.bonusGrants||[]),...(d.workspaces||[]).flatMap(p=>p.bonusGrantsInfo?.grants||[])].map((p,i)=>left(`bonus.${i}`,'Créditos adicionais',p.requestCreditsRemaining,p.requestCreditsGranted,p.expiration))]);},
  notionAI: (r,{now=Date.now()}={}) => result([ratio('rolling','Janela móvel',r.window?.used,r.window?.limit,n(r.resetsInSeconds)>0?now+r.resetsInSeconds*1000:null),ratio('billing','Período de cobrança',r.billingPeriodWindow?.used,r.billingPeriodWindow?.limit,r.billingPeriodWindow?.periodEndMs)]),
};
function parseGLM(r) {
  if(r.code!==undefined&&![0,200,'0','200'].includes(r.code))return result();
  const d=r.data||r;
  const limits=d.limits||[];
  return result(limits.map((p,i)=>{
    const unit={1:86400,3:3600,5:60,6:604800}[p.unit];const seconds=unit&&n(p.number)>0?unit*n(p.number):null;
    const percentage=n(p.usage)>0&&n(p.currentValue)!==null?n(p.currentValue)/n(p.usage)*100:n(p.usage)>0&&n(p.remaining)!==null?(n(p.usage)-n(p.remaining))/n(p.usage)*100:p.percentage;
    return w(`${p.type}.${i}`,`${p.type==='TIME_LIMIT'?'MCP · ':''}${seconds?seconds/3600+' horas':'Cota'}`,percentage,p.nextResetTime,seconds);
  }));
}
profileParsers.zai=profileParsers.glmCoding=parseGLM;
function parseMinimax(r) {
  if(r.base_resp?.status_code && r.base_resp.status_code!==0)return result();
  const d=r.data||r;
  return result((d.model_remains||[]).flatMap((p,i)=>{
    const windows=[];
    for(const[prefix,label,reset,seconds]of [['current_interval','Cota',p.end_time,n(p.end_time)>0&&n(p.start_time)>0?(p.end_time-p.start_time)/1000:null],['current_weekly','Semanal',p.weekly_end_time,604800]]){
      const remaining=n(p[prefix+'_remaining_percent']); const percent=remaining!==null?100-remaining:n(p[prefix+'_total_count'])>0&&n(p[prefix+'_usage_count'])!==null?(p[prefix+'_total_count']-p[prefix+'_usage_count'])/p[prefix+'_total_count']*100:null;
      windows.push(w(`${i}.${prefix}`,`${label} · ${p.model_name||'geral'}`,percent,reset,seconds,n(percent)>=100));
    }return windows;
  }),[balance(d.points_balance,'pontos')],d.current_subscribe_title);
}
profileParsers.minimax=profileParsers.minimaxCN=parseMinimax;
const route = (url, extra = {}) => ({url,...extra});
const cookie = (url, extra={}) => route(url,{auth:'cookie',...extra});
const routes = {
  atlasCloud:route('https://api.atlascloud.ai/public/v1/balance'), moonshot:route('https://api.moonshot.ai/v1/users/me/balance'),
  hyper:route('https://hyper.charm.land/v1/credits'), poe:route('https://api.poe.com/usage/current_balance'), venice:route('https://api.venice.ai/api/v1/billing/balance'),
  openAIPlatform:route('https://api.openai.com/v1/dashboard/billing/credit_grants'), elevenLabs:route('https://api.elevenlabs.io/v1/user/subscription',{auth:'key',header:'xi-api-key'}),
  vercelAIGateway:route('https://ai-gateway.vercel.sh/v1/credits'), deepInfra:route('https://api.deepinfra.com/payment/checklist?compute_owed=true'), huggingFace:route('https://huggingface.co/api/spaces/zero-gpu/quota'),
  clinePass:route('https://api.cline.bot/api/v1/users/me/plan/usage-limits'), clawRouter:route('https://clawrouter.openclaw.ai/v1/usage'), synthetic:route('https://api.synthetic.new/v2/quotas'),
  openCodeGo:route('https://opencode.ai/zen/go/v1/usage'), grok:route('https://cli-chat-proxy.grok.com/v1/billing?format=credits',{headers:{'x-xai-token-auth':'xai-grok-cli'}}),
  devPass:route('https://api.llmgateway.io/v1/key'), chutes:route('https://api.chutes.ai/users/me/subscription_usage'),
  abacus:cookie('https://apps.abacus.ai/api/_getOrganizationComputePoints',{method:'POST',body:{},secondary:'https://apps.abacus.ai/api/_getBillingInfo'}),
  raycastAI:cookie('https://www.raycast.com/frontend_api/current_user/ai_credits',{origin:'https://www.raycast.com'}),
  gitKraken:route('https://api.gitkraken.dev/v1/ai-tasks/usage',{headers:{'Client-Name':'PulseWindows'}}), xKiro:route('https://api.xkiro.com/v1/usage'),
  zed:cookie('https://cloud.zed.dev/frontend/billing/usage'), perplexity:cookie('https://www.perplexity.ai/rest/billing/credits?version=2.18&source=default',{origin:'https://www.perplexity.ai'}),
  manus:route('https://api.manus.im/user.v1.UserService/GetAvailableCredits',{method:'POST',body:{},origin:'https://manus.im',headers:{'Connect-Protocol-Version':'1'}}),
  mistral:cookie('https://admin.mistral.ai/api/billing/credits',{origin:'https://admin.mistral.ai',secondary:'https://console.mistral.ai/api-ui/trpc/billing.vibeUsage?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D'}),
  codebuff:route('https://www.codebuff.com/api/v1/usage',{method:'POST',body:{fingerprintId:'pulse-usage'},secondary:'https://www.codebuff.com/api/user/subscription'}),
  neuralwatt:route('https://api.neuralwatt.com/v1/quota'), zenMux:route('https://zenmux.ai/api/v1/management/subscription/detail',{secondary:'https://zenmux.ai/api/v1/management/payg/balance'}),
  v0:route('https://api.v0.dev/v1/user/billing',{secondary:'https://api.v0.dev/v1/rate-limits'}), nousPortal:route('https://portal.nousresearch.com/api/account'),
  longCat:cookie('https://longcat.chat/api/pay/quota/metering/token-packs/summary',{origin:'https://longcat.chat'}),
  v2ex:route('https://edge.v2ex.com/api/v2/chat/quota'), newAPI:route('/v1/dashboard/billing/subscription',{gateway:true}),
  llmProxy:route('/quota_stats',{gateway:true}), aixy:route('https://api.aixy-gateway.com/v1/usage'), bifrost:route('/api/governance/virtual-keys/quota',{gateway:true,auth:'key',header:'x-bf-vk'}),
  kiloCode:route('https://app.kilo.ai/api/trpc/user.getCreditBlocks,kiloPass.getState?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%2C%221%22%3A%7B%22json%22%3Anull%7D%7D'),
  amp:route('https://ampcode.com/api/internal?userDisplayBalanceInfo',{method:'POST',body:{method:'userDisplayBalanceInfo',params:{}}}),
  zai:route('https://api.z.ai/api/monitor/usage/quota/limit'), glmCoding:route('https://open.bigmodel.cn/api/monitor/usage/quota/limit'),
  minimax:route('https://api.minimax.io/v1/token_plan/remains'), minimaxCN:route('https://api.minimaxi.com/v1/token_plan/remains')
};
routes.llmProxy.url='/v1/quota-stats';
routes.nousPortal.url='https://portal.nousresearch.com/api/oauth/account';
routes.newAPI.secondaryPath='/v1/dashboard/billing/usage';
routes.newAPI.publicStatusPath='/api/status';
routes.minimax.fallback='https://api.minimax.io/v1/api/openplatform/coding_plan/remains';
routes.minimaxCN.fallback='https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains';
routes.augment=cookie('https://app.augmentcode.com/api/credits',{secondary:'https://app.augmentcode.com/api/subscription'});
routes.commandCode=route('https://api.commandcode.ai/alpha/billing/credits');
routes.xiaomiMiMo=cookie('https://platform.xiaomimimo.com/api/v1/tokenPlan/usage',{secondary:'https://platform.xiaomimimo.com/api/v1/tokenPlan/detail'});
routes.sub2api=route('/v1/usage',{gateway:true});
routes.qoder=cookie('https://qoder.com/api/v2/me/usages/big_model_credits',{origin:'https://qoder.com',headers:{'X-Requested-With':'XMLHttpRequest','Bx-V':'2.5.35'}});
routes.stepFun=cookie('https://platform.stepfun.com/api/step.openapi.devcenter.Dashboard/QueryStepPlanRateLimit',{origin:'https://platform.stepfun.com',method:'POST',body:{},headers:{'oasis-appid':'10300','oasis-platform':'web'}});
routes.factory=route('https://api.factory.ai/api/billing/limits',{headers:{'x-factory-client':'web-app',Origin:'https://app.factory.ai',Referer:'https://app.factory.ai/'}});
routes.t3Chat=cookie('https://t3.chat/api/trpc/getCustomerData?batch=1&input='+encodeURIComponent(JSON.stringify({'0':{json:{sessionId:null},meta:{values:{sessionId:['undefined']}}}})),{origin:'https://t3.chat',replyFormat:'jsonl',headers:{'trpc-accept':'application/jsonl','x-trpc-source':'web-client','x-trpc-batch':'true'}});
routes.warp=route('https://app.warp.dev/graphql/v2?op=GetRequestLimitInfo',{method:'POST',body:{operationName:'GetRequestLimitInfo',query:"query GetRequestLimitInfo($requestContext: RequestContext!) { user(requestContext: $requestContext) { __typename ... on UserOutput { user { requestLimitInfo { isUnlimited nextRefreshTime requestLimit requestsUsedSinceLastRefresh } bonusGrants { requestCreditsGranted requestCreditsRemaining expiration } workspaces { bonusGrantsInfo { grants { requestCreditsGranted requestCreditsRemaining expiration } } } } } } }",variables:{requestContext:{clientContext:{},osContext:{category:'Windows',name:'Windows',version:require('node:os').release()}}}},headers:{'x-warp-client-id':'warp-app','x-warp-os-category':'Windows','x-warp-os-name':'Windows','x-warp-os-version':require('node:os').release(),'User-Agent':'Warp/1.0'}});
function findObject(root, predicate) {
  const queue=[root];let visited=0;
  while(queue.length&&visited++<4000){const o=queue.shift();if(o&&typeof o==='object'){if(!Array.isArray(o)&&predicate(o))return o;queue.push(...Object.values(o).filter(v=>v&&typeof v==='object'));}}
  return null;
}
profileParsers.t3Chat=r=>{const d=findObject(r,p=>p.usageFourHourPercentage!==undefined||p.usageMonthPercentage!==undefined)||{};return result([w('fourHour','4 horas',d.usageFourHourPercentage,d.usageFourHourNextResetAt??d.usageWindowNextResetAt,14400,n(d.usageFourHourPercentage)>=100),w('monthly','Mensal',d.usageMonthPercentage,d.subscription?.currentPeriodEnd,null,n(d.usageMonthPercentage)>=100)],[],d.subscription?.productName||d.subTier);};
profileParsers.xiaomiMiMo=r=>{const d=r.data?.monthUsage,p=r._secondary?.data;return r.code===0&&p?.expired!==true?result([w('monthly','Coding Plan mensal',d?.percent??d?.items?.[0]?.percent,p?.currentPeriodEnd)],[],p?.planCode):result();};
profileParsers.sub2api=r=>{if(r.isValid!==true)return result();return result([ratio('quota','Cota',r.quota?.used,r.quota?.limit),...(r.rate_limits||[]).map((p,i)=>ratio(`rate.${i}`,p.window,p.used,p.limit,p.reset_at,{'5h':18000,'7d':604800}[p.window])),...['daily','weekly','monthly'].map(k=>ratio(k,k,r.subscription?.[k+'_usage_usd'],r.subscription?.[k+'_limit_usd']))],[balance(r.balance,r.unit||'USD')],r.planName);};
profileParsers.xaiAPI=r=>result([],[balance(n(r.total?.val)!==null?-r.total.val/100:null)]);
profileParsers.jetBrainsAI=r=>result([ratio('quota','AI Assistant',r.quotaInfo?.current,r.quotaInfo?.maximum,r.nextRefill?.next)]);
profileParsers.ibmBob=r=>{const teams=r.teams||[];return teams.length&&teams.every(t=>n(t.used)!==null&&n(t.budget)!==null)?result([ratio('bobcoins','Bobcoins',teams.reduce((a,t)=>a+n(t.used),0),teams.reduce((a,t)=>a+n(t.budget),0),teams.map(t=>date(t.resetsAt)).filter(Boolean).sort()[0])],[],[...new Set(teams.map(t=>t.plan).filter(Boolean))].join(', ')):result();};
function visibleHTML(html){return String(html).replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');}
profileParsers.ollamaCloud=r=>{
  if(typeof r!=='string')return result([w('session','5 horas',r.session?.usedPercent,r.session?.resetsAt,18000),w('weekly','Semanal',r.weekly?.usedPercent,r.weekly?.resetsAt,604800)]);
  const html=visibleHTML(r);if(/<!ENTITY|<form[^>]*action=["'][^"']*(login|signin)/i.test(html))return result();
  const windows=[];
  for(const [id,label,seconds]of [['session','Session usage',18000],['weekly','Weekly usage',604800]]){
    const matches=[...html.matchAll(new RegExp('<h[1-6][^>]*>\\s*'+label+'\\s*</h[1-6]>','gi'))];if(matches.length!==1)return result();
    const start=matches[0].index+matches[0][0].length,body=html.slice(start).split(/<h[1-6]\b/i)[0];
    const p=[...body.matchAll(/([\d.]+)%\s*used/gi)];if(p.length!==1||!(n(p[0][1])>=0&&n(p[0][1])<=100))return result();
    const times=[...body.matchAll(/data-time=["']([^"']+)["']/gi)];if(times.length>1)return result();
    windows.push(w(id,id==='session'?'5 horas':'Semanal',p[0][1],times[0]?.[1],seconds,n(p[0][1])>=100));
  }return result(windows);
};
profileParsers.sakana=r=>{const html=visibleHTML(r.html||r);const windows=[];for(const[label,id,seconds]of [['5-hour','fiveHour',18000],['Weekly','weekly',604800]]){const pattern=new RegExp('<p[^>]*>\\s*'+label+'\\s*</p>([\\s\\S]*?)(?=<p[^>]*>\\s*(?:5-hour|Weekly)\\s*</p>|$)','i'),body=html.match(pattern)?.[1],pct=body?.match(/<p[^>]*>\s*([\d.]+)% used\s*<\/p>/i)?.[1];if(pct!==undefined)windows.push(w(id,label,pct,null,seconds,n(pct)>=100));}const amount=visibleHTML(r.secondary||'').match(/Credit balance[\s\S]{0,900}?\$([\d,.]+)/i)?.[1];return result(windows,[balance(amount?.replace(/,/g,''))]);};
profileParsers.windsurf=r=>{const {decodePlanStatus}=require('./special.cjs');const d=Buffer.isBuffer(r)?decodePlanStatus(r):r.base64?decodePlanStatus(Buffer.from(r.base64,'base64')):r;return result([percentLeft('daily','Diário',d.dailyRemaining,d.dailyResetAt,86400),percentLeft('weekly','Semanal',d.weeklyRemaining,d.weeklyResetAt,604800)],[],d.planName);};
module.exports={profileParsers,routes,result,balance,ratio,left,percentLeft};
