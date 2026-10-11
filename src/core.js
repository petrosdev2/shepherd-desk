'use strict';
/* ---------- Basics ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clone = o => JSON.parse(JSON.stringify(o ?? null));
const pad = n => String(n).padStart(2, '0');
const isoDate = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => isoDate(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
const monthOf = d => (d || '').slice(0, 7);
const thisMonth = () => monthOf(today());
const shiftMonth = (m, n) => { const d = new Date(m + '-01T00:00'); d.setMonth(d.getMonth() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const lastMonths = n => { const out = []; for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(thisMonth(), -i)); return out; };
const fmtDate = s => s ? new Date(s + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtShort = s => s ? new Date(s + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
const monthLabel = (m, withYear) => new Date(m + '-01T00:00').toLocaleDateString('en-GB', withYear ? { month: 'long', year: 'numeric' } : { month: 'short' });
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
const naira = n => '₦' + Math.round(+n || 0).toLocaleString('en-NG');
const num = n => Math.round(+n || 0).toLocaleString('en-NG');
const compact = v => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : v >= 1e3 ? (v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(Math.round(v));
const sum = (arr, f = x => x.amount) => arr.reduce((a, x) => a + (+f(x) || 0), 0);
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '');

/* ---------- Icons ---------- */
const IC = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8',
  check: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  cash: 'M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6.5 9.5v.01M17.5 14.5v.01',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  child: 'M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6M7 22v-6l-2-4 7 1 7-1-2 4v6M10 22v-4h4v4',
  chart: 'M4 20V11M10 20V4M16 20v-7M22 20H2',
  branch: 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6M18 9a9 9 0 0 1-9 9',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  plus: 'M12 5v14M5 12h14', menu: 'M3 6h18M3 12h18M3 18h18', x: 'M18 6L6 18M6 6l12 12',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', download: 'M12 3v12M7 10l5 5 5-5M5 21h14', upload: 'M12 16V4M7 9l5-5 5 5M5 21h14',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1', arrow: 'M5 12h14M13 6l6 6-6 6', alert: 'M12 9v4M12 17v.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  cake: 'M4 21h16v-8H4zM4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1.5 4 0M12 13V9M12 6a1.5 1.5 0 0 0 1.5-1.5C13.5 3.5 12 2 12 2s-1.5 1.5-1.5 2.5A1.5 1.5 0 0 0 12 6',
  crook: 'M9 22V9a5 5 0 0 1 10 0v1.5a2.5 2.5 0 0 1-5 0'
};
const icon = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[n]}"/></svg>`;

/* ---------- Domain constants ---------- */
const STATUSES = ['First-timer', 'Regular attender', 'Member', 'Worker', 'Minister', 'Inactive', 'Relocated', 'Deceased'];
const ACTIVE = ['Regular attender', 'Member', 'Worker', 'Minister'];
const GONE = ['Relocated', 'Deceased'];
const STAGES = ['First visit', 'Contacted', 'Second visit', 'Membership class', 'Member', 'Department'];
const METHODS = ['Cash', 'Bank transfer', 'POS', 'Online (Paystack)', 'USSD'];
const KID_CLASSES = ['Crèche (0–2)', 'Beginners (3–5)', 'Juniors (6–9)', 'Pre-teens (10–12)'];
const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5];
const COLS = ['settings', 'members', 'services', 'income', 'expenses', 'counts', 'messages', 'checkins', 'branches', 'remits', 'audit'];

const DEFAULT_SETTINGS = {
  name: 'Your church', mainBranch: 'Main church', address: '', pastor: '', plan: 'starter', multiBranch: false,
  serviceTypes: ['Sunday Service', 'Midweek Service', 'Prayer Meeting', 'Special Programme'],
  departments: ['Choir', 'Ushers', 'Media', 'Children', 'Protocol', 'Prayer', 'Sanctuary', 'Evangelism', 'Welfare'],
  incomeCats: ['Tithe', 'Offering', 'Thanksgiving', 'Seed', 'Building Fund', 'Pledge', 'Project Levy'],
  expenseCats: ['Utilities', 'Fuel & Generator', 'Welfare', 'Media & Equipment', 'Maintenance', 'Programmes', 'Honorarium', 'Remittance to HQ', 'Other'],
  remitRates: { Tithe: 10, Offering: 10 },
  team: [],
  templates: {
    birthday: 'Happy birthday, {first_name}! The whole {church} family celebrates you today. May this new year bring you favour, good health and great joy.',
    welcome: 'Hello {first_name}, thank you for worshipping with us at {church}. We were glad to have you, and we would love to see you again this Sunday. God bless you.',
    missed: 'Hello {first_name}, we have missed you at {church} these past weeks. We hope all is well with you and your family. Is there anything we can pray with you about?',
    announcement: 'Dear {first_name}, this is a reminder from {church}: '
  }
};
const TEMPLATE_NAMES = { birthday: 'Birthday wish', welcome: 'Welcome a first-timer', missed: 'We missed you', announcement: 'Announcement' };

const FEATS = {
  starter: [],
  basic: ['expenses', 'counts', 'reports', 'comms', 'import'],
  standard: ['expenses', 'counts', 'reports', 'comms', 'import', 'bulk', 'children', 'roles', 'online'],
  premium: ['expenses', 'counts', 'reports', 'comms', 'import', 'bulk', 'children', 'roles', 'online', 'audit', 'webpage'],
};
const PLANS = {
  starter: { name: 'Starter', fam: 'single', price: 'Free', limit: 100, admins: 1, feats: FEATS.starter, blurb: 'New churches and fellowships',
    points: ['Up to 100 members', 'Member records & attendance', 'First-timer follow-up', 'Basic giving records', '1 admin user'] },
  basic: { name: 'Basic', fam: 'single', price: 'Price TBD', limit: 300, admins: 3, feats: FEATS.basic, blurb: 'Small churches',
    points: ['Up to 300 members', 'Everything in Starter', 'Expenses & offering counts', 'Birthday messages & reports', 'Excel import', '3 admin users'] },
  standard: { name: 'Standard', fam: 'single', price: 'Price TBD', limit: 1000, admins: 10, feats: FEATS.standard, blurb: 'Growing churches',
    points: ['Up to 1,000 members', 'Everything in Basic', 'Bulk WhatsApp/SMS', "Children's check-in", 'Online giving', 'Custom roles, 10 admins'] },
  premium: { name: 'Premium', fam: 'single', price: 'Price TBD', limit: Infinity, admins: Infinity, feats: FEATS.premium, blurb: 'Large single churches',
    points: ['Unlimited members & admins', 'Everything in Standard', 'Audit log', 'Church webpage & member app', 'Priority support'] },
  network: { name: 'Branch Network', fam: 'multi', price: 'Base + per branch', limit: Infinity, admins: Infinity, feats: [...FEATS.premium, 'branches'], blurb: '2–10 branches',
    points: ['Everything in Premium, per branch', 'HQ dashboard', 'Branch remittance', 'Member & pastor transfers', 'Monthly branch returns'] },
  enterprise: { name: 'Enterprise', fam: 'multi', price: 'Custom quote', limit: Infinity, admins: Infinity, feats: [...FEATS.premium, 'branches', 'zones'], blurb: 'Denominations, 10+ branches',
    points: ['Everything in Branch Network', 'Zones & regions', 'Custom reports & branding', 'Dedicated onboarding'] }
};
const ROLES = {
  admin: { label: 'Church Admin', nav: '*' },
  pastor: { label: 'Pastor', nav: ['dashboard', 'members', 'attendance', 'followup', 'giving', 'comms', 'children', 'reports', 'branches'] },
  finance: { label: 'Finance Secretary', nav: ['dashboard', 'giving', 'reports'] },
  secretary: { label: 'Secretary', nav: ['dashboard', 'members', 'attendance', 'followup', 'comms', 'children', 'reports'] },
  followup: { label: 'Follow-up Coordinator', nav: ['followup', 'members'] },
  usher: { label: 'Usher / Check-in', nav: ['attendance', 'children'] }
};
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'members', label: 'Members', icon: 'users' },
  { id: 'attendance', label: 'Attendance', icon: 'check' },
  { id: 'followup', label: 'First-timers', icon: 'spark' },
  { id: 'giving', label: 'Giving & finance', icon: 'cash' },
  { id: 'comms', label: 'Messages', icon: 'chat', feat: 'comms' },
  { id: 'children', label: "Children's check-in", icon: 'child', feat: 'children' },
  { id: 'reports', label: 'Reports', icon: 'chart', feat: 'reports' },
  { id: 'branches', label: 'Branches', icon: 'branch', multiOnly: true },
  { id: 'settings', label: 'Settings', icon: 'gear', adminOnly: true }
];

/* ---------- UI state (per viewer) ---------- */
const S = { route: 'dashboard', branch: 'all', role: 'admin', navOpen: false, q: '', fStatus: '', fDept: '', gTab: 'overview', gMonth: thisMonth(), period: '3', cAud: 'all', cTpl: 'announcement', cText: '', ready: false, sel: new Set() };
const PREF_KEY = 'shepherd-desk-prefs';
try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); ['route', 'role', 'branch'].forEach(k => { if (p[k]) S[k] = p[k]; }); } catch (e) { /* storage unavailable */ }
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify({ route: S.route, role: S.role, branch: S.branch })); } catch (e) { /* ignore */ } }

/* ---------- Data store (shared db when available, else this browser) ---------- */
const D = {}; COLS.forEach(c => D[c] = {});
let MODE = 'loading', DB = null;
const LOCAL_KEY = 'shepherd-desk-local-v1';
function loadLocal() { try { const j = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); if (j) COLS.forEach(c => D[c] = j[c] || {}); } catch (e) { /* ignore */ } }
function saveLocal() { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(D)); } catch (e) { /* ignore */ } }
const writing = {};
async function put(col, obj) {
  if (!obj.id) obj.id = uid();
  if (!obj.createdAt) obj.createdAt = new Date().toISOString();
  const body = clone(obj);
  D[col][obj.id] = body; scheduleRender();
  if (DB) {
    const key = col + '/' + obj.id;
    const prev = writing[key] || Promise.resolve();
    const run = prev.then(() => DB.collection(col).doc(obj.id).set(body)).catch(e => { toast(dbError(e), 'bad'); });
    writing[key] = run; await run;
  } else saveLocal();
  return body;
}
async function del(col, id) {
  delete D[col][id]; scheduleRender();
  if (DB) { try { await DB.collection(col).doc(id).delete(); } catch (e) { toast(dbError(e), 'bad'); } } else saveLocal();
}
function dbError(e) {
  const c = e && e.code;
  if (c === 'quota_exceeded') return 'Storage is full for this prototype. Delete old records to add new ones.';
  if (c === 'invalid_argument') return 'You don’t have permission to change records here.';
  if (c === 'resource_exhausted') return 'Too many changes at once. Wait a moment and try again.';
  return 'Couldn’t save that change. Check your connection and try again.';
}
const all = c => Object.values(D[c] || {});
const ST = () => { const s = D.settings.church || {}; return { ...DEFAULT_SETTINGS, ...s, templates: { ...DEFAULT_SETTINGS.templates, ...(s.templates || {}) }, remitRates: { ...(s.remitRates || DEFAULT_SETTINGS.remitRates) } }; };
async function saveSettings(patch) { const cur = clone(D.settings.church || {}); await put('settings', { ...cur, ...patch, id: 'church' }); }
async function audit(action, detail) { if (!D.settings.church) return; put('audit', { at: new Date().toISOString(), role: S.role, action, detail }); }

/* ---------- Plan, role, branch helpers ---------- */
const plan = () => PLANS[ST().plan] || PLANS.starter;
const has = f => plan().feats.includes(f);
const planFor = f => Object.values(PLANS).find(p => p.feats.includes(f)) || PLANS.premium;
const roleAllows = id => { const r = ROLES[S.role] || ROLES.admin; const n = NAV.find(x => x.id === id); if (n && n.adminOnly && S.role !== 'admin') return false; return r.nav === '*' || r.nav.includes(id); };
const canFin = () => ['admin', 'finance'].includes(S.role);
const canApprove = () => ['admin', 'pastor'].includes(S.role);
const isMulti = () => !!ST().multiBranch && has('branches');
function branches() { const st = ST(); return [{ id: 'main', name: st.mainBranch || 'Main church', location: st.address || '', pastor: st.pastor || '', hq: true }, ...all('branches').sort((a, b) => (a.name || '').localeCompare(b.name || ''))]; }
const branchName = id => (branches().find(b => b.id === (id || 'main')) || { name: 'Unknown branch' }).name;
const inBranch = r => !isMulti() || S.branch === 'all' || (r.branchId || 'main') === S.branch;
const curBranchId = () => (isMulti() && S.branch !== 'all') ? S.branch : 'main';
const scopeLabel = () => isMulti() ? (S.branch === 'all' ? 'All branches' : branchName(S.branch)) : ST().name;

/* ---------- People helpers ---------- */
const fullName = m => m ? ([m.first, m.last].filter(Boolean).join(' ') || 'Unnamed') : 'Unknown';
const initials = m => (((m.first || '?')[0] || '') + ((m.last || '')[0] || '')).toUpperCase();
const members = () => all('members').filter(inBranch);
const statusTone = s => ({ 'First-timer': 'gold', Member: 'accent', Worker: 'accent', Minister: 'accent', Inactive: 'warn', Relocated: 'warn', Deceased: 'bad' }[s] || '');
const pill = (t, tone = '') => `<span class="pill ${tone}">${esc(t)}</span>`;
const who = (m, sub) => `<div class="who"><span class="avatar">${esc(initials(m))}</span><div style="min-width:0"><b>${esc(fullName(m))}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
function intlPhone(p) { let d = String(p || '').replace(/\D/g, ''); if (!d) return ''; if (d.startsWith('0') && d.length === 11) d = '234' + d.slice(1); else if (d.length === 10) d = '234' + d; return d; }
const waLink = (p, text) => { const n = intlPhone(p); return n ? `https://wa.me/${n}?text=${encodeURIComponent(text || '')}` : ''; };
const waBtn = (p, text, label = 'WhatsApp') => { const u = waLink(p, text); return u ? `<a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener">${icon('chat', 15)} ${esc(label)}</a>` : ''; };
function fillTpl(t, m) { const st = ST(); return String(t || '').replace(/\{first_name\}/g, (m && m.first) || 'friend').replace(/\{name\}/g, fullName(m)).replace(/\{church\}/g, st.name).replace(/\{pastor\}/g, st.pastor || 'our pastor'); }
function lastSeenMap() { const map = {}; all('services').forEach(s => (s.present || []).forEach(id => { if (!map[id] || map[id] < s.date) map[id] = s.date; })); return map; }
function absentees() {
  const svc = all('services').filter(s => s.mode === 'names').sort(byDateDesc);
  const out = []; const seen = lastSeenMap();
  members().forEach(m => {
    if (!ACTIVE.includes(m.status)) return;
    const mine = svc.filter(s => (s.branchId || 'main') === (m.branchId || 'main') && (!m.joined || s.date >= m.joined)).slice(0, 3);
    if (mine.length < 3) return;
    if (mine.every(s => !(s.present || []).includes(m.id))) out.push({ m, last: seen[m.id] || null });
  });
  return out.sort((a, b) => (a.last || '').localeCompare(b.last || ''));
}
function celebrations(days = 14) {
  const t = new Date(); t.setHours(0, 0, 0, 0); const out = [];
  members().forEach(m => {
    if (GONE.includes(m.status)) return;
    [['dob', 'Birthday'], ['anniversary', 'Wedding anniversary']].forEach(([k, label]) => {
      if (!m[k]) return; const [, mo, d] = m[k].split('-').map(Number); if (!mo || !d) return;
      let n = new Date(t.getFullYear(), mo - 1, d); if (n < t) n = new Date(t.getFullYear() + 1, mo - 1, d);
      const diff = Math.round((n - t) / 864e5); if (diff <= days) out.push({ m, label, diff, date: isoDate(n) });
    });
  });
  return out.sort((a, b) => a.diff - b.diff);
}
const followDue = () => members().filter(m => m.followUp && !['Member', 'Department'].includes(m.followUp.stage) && m.followUp.due && m.followUp.due <= today());

/* ---------- Toast, modal, copy, downloads ---------- */
function toast(msg, tone) { const el = document.createElement('div'); el.className = 'toast ' + (tone || ''); el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3600); }
function openModal(title, body, foot = '', opts = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="scrim" data-act="closeModal"></div><div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="btn ghost sm" data-act="closeModal" aria-label="Close">${icon('x', 16)}</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  root.hidden = false;
  const f = root.querySelector('.modal-body input:not([type=hidden]):not([type=checkbox]),.modal-body select,.modal-body textarea'); if (f && !opts.noFocus) f.focus();
}
function closeModal() { const r = $('#modal-root'); r.hidden = true; r.innerHTML = ''; }
function formModal(name, title, body, submitLabel, opts = {}) {
  openModal(title, `<form id="mf" data-form="${name}" novalidate class="stack">${body}<p class="err" id="mf-err"></p><button type="submit" hidden></button></form>`,
    `${opts.left || ''}<button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" data-act="submitModal">${esc(submitLabel)}</button>`, opts);
}
const formErr = msg => { const e = $('#mf-err'); if (e) e.textContent = msg; else toast(msg, 'bad'); };
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copied'); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ } ta.remove(); toast(ok ? 'Copied' : 'Select the text and copy it manually', ok ? '' : 'bad'); }
}
async function download(filename, text, mime = 'text/csv') {
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (!dl && typeof STORE !== 'undefined' && STORE) {
    try {
      const url = URL.createObjectURL(new Blob([text], { type: mime }));
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Downloaded ' + filename); return;
    } catch (e) { /* fall through to the copy box */ }
  }
  if (!dl) { openModal('Copy your export', `<p class="muted">Downloads aren’t available here, so copy the data below and paste it into Excel or a text file named <b>${esc(filename)}</b>.</p><textarea class="input" rows="12" readonly id="exp-text">${esc(text)}</textarea>`, `<button class="btn primary" data-act="copyExport">${icon('copy', 15)} Copy</button>`); return; }
  try { await dl.save({ filename, data: new Blob([text], { type: mime }) }); }
  catch (e) { if (e && e.code && !['cancelled', 'declined', 'user_cancelled'].includes(e.code)) toast('The file wasn’t saved.', 'bad'); }
}
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const toCSV = rows => rows.map(r => r.map(csvCell).join(',')).join('\n');
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}

/* ---------- Charts ---------- */
function niceMax(v) { if (!(v > 0)) return 10; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function lineChart(pts, { fmt = compact, label = 'Trend', h = 210 } = {}) {
  if (pts.length < 2) return `<div class="empty">Record at least two services to see the trend.</div>`;
  const W = 640, H = h, L = 40, R = 18, T = 22, B = 26;
  const max = niceMax(Math.max(...pts.map(p => p.v)) * 1.08);
  const x = i => L + i * (W - L - R) / (pts.length - 1); const y = v => T + (H - T - B) * (1 - v / max);
  let g = '';
  for (let k = 0; k <= 5; k++) { const v = max * k / 5; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
  const step = Math.ceil(pts.length / 7);
  pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(p.l)}</text>`; });
  const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
  const area = d + ` L${x(pts.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`;
  const lp = pts[pts.length - 1], li = pts.length - 1;
  const dots = pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="${i === li ? 4.5 : 2.5}" style="fill:${i === li ? 'var(--accent)' : 'var(--surface)'};stroke:var(--accent)" stroke-width="2"><title>${esc(p.l)}: ${esc(fmt(p.v))}</title></circle>`).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}<path d="${area}" style="fill:var(--accent);opacity:.1"/><path d="${d}" style="fill:none;stroke:var(--accent)" stroke-width="2.4" stroke-linejoin="round"/>${dots}<text class="val-label" x="${x(li)}" y="${y(lp.v) - 10}" text-anchor="end">${esc(fmt(lp.v))}</text></svg></div>`;
}
function barChart(groups, series, { fmt = compact, label = 'Comparison', h = 210 } = {}) {
  if (!groups.length) return `<div class="empty">No data yet.</div>`;
  const W = 640, H = h, L = 44, R = 10, T = 14, B = 26;
  const max = niceMax(Math.max(1, ...groups.flatMap(g => series.map(s => +g[s.key] || 0))) * 1.05);
  const y = v => T + (H - T - B) * (1 - v / max); const gw = (W - L - R) / groups.length; const bw = Math.min(26, (gw - 12) / series.length);
  let g = '';
  for (let k = 0; k <= 5; k++) { const v = max * k / 5; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
  groups.forEach((gr, i) => {
    const cx = L + gw * i + gw / 2; const start = cx - bw * series.length / 2;
    series.forEach((s, j) => { const v = +gr[s.key] || 0; const top = y(v); g += `<rect x="${start + j * bw + 1}" y="${top}" width="${bw - 2}" height="${Math.max(0, y(0) - top)}" rx="3" style="fill:${s.color}"><title>${esc(gr.l)} · ${esc(s.label)}: ${esc(fmt(v))}</title></rect>`; });
    g += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${esc(gr.l)}</text>`;
  });
  const legend = series.length > 1 ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</div>` : '';
  return `${legend}<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}</svg></div>`;
}
function hbars(items, fmt = num) {
  if (!items.length) return `<div class="empty">Nothing recorded for this period.</div>`;
  const max = Math.max(...items.map(i => i.v), 1);
  return items.map(i => `<div class="hbar"><span>${esc(i.l)}</span><div class="track"><div class="fill" style="width:${(i.v / max * 100).toFixed(1)}%"></div></div><span class="v">${esc(fmt(i.v))}</span></div>`).join('');
}
const kpi = (label, val, delta = '') => `<div class="panel kpi"><span class="label">${esc(label)}</span><span class="val">${val}</span><span class="delta">${delta}</span></div>`;
function deltaText(cur, prev, unit = '') { if (!prev) return '<span class="muted">No earlier figure to compare</span>'; const d = cur - prev; const pct = Math.round(d / prev * 100); if (d === 0) return 'Same as before'; return `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span> <span class="muted">vs ${unit}</span>`; }
const emptyBox = (msg, btn = '') => `<div class="empty">${esc(msg)}${btn ? `<div style="margin-top:10px">${btn}</div>` : ''}</div>`;
function gate(feat, title) {
  const p = planFor(feat);
  return `<div class="panel upsell"><span class="ic">${icon('lock', 22)}</span><h2 style="margin:0">${esc(title)} comes with the ${esc(p.name)} plan</h2>
  <p class="muted" style="margin:0">Your church is on the ${esc(plan().name)} plan. Upgrading keeps all your records and switches this on straight away.</p>
  ${S.role === 'admin' ? `<button class="btn primary" data-act="goto" data-route="settings">See plans</button>` : `<p class="small muted" style="margin:0">Ask your church admin to upgrade.</p>`}</div>`;
}
