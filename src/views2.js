/* ---------- Giving & finance ---------- */
V.giving = () => {
  const tabs = [['overview', 'Overview'], ['income', 'Income'], ['expenses', 'Expenses', 'expenses'], ['counts', 'Offering counts', 'counts']];
  if (!tabs.some(t => t[0] === S.gTab)) S.gTab = 'overview';
  const tabBar = `<div class="tabs" role="tablist">${tabs.map(([k, l, f]) => `<button class="tab ${S.gTab === k ? 'on' : ''}" data-act="gTab" data-tab="${k}" role="tab" aria-selected="${S.gTab === k}">${esc(l)}${f && !has(f) ? icon('lock', 13) : ''}</button>`).join('')}</div>`;
  const ro = !canFin() ? `<p class="muted small" style="margin:0 0 12px">You’re viewing finance as ${esc(ROLES[S.role].label)}: read-only.</p>` : '';
  let body = '';
  if (S.gTab === 'overview') body = givingOverview();
  else if (S.gTab === 'income') body = givingIncome();
  else if (S.gTab === 'expenses') body = has('expenses') ? givingExpenses() : gate('expenses', 'Expense tracking');
  else body = has('counts') ? givingCounts() : gate('counts', 'Offering count sheets');
  return `<div class="page-head"><div><h1 class="page">Giving & finance</h1><p class="sub">Tithes, offerings and expenses, with a record of who counted and who approved.</p></div>
    <div class="actions">${canFin() ? `<button class="btn primary" data-act="newIncome">${icon('plus', 16)} Record giving</button>${has('expenses') ? `<button class="btn" data-act="newExpense">${icon('plus', 16)} Expense</button>` : ''}` : ''}</div></div>${tabBar}${ro}${body}`;
};
const monthPicker = () => `<label class="inline-field">Month <input class="input" type="month" data-ui="gMonth" value="${esc(S.gMonth)}" style="width:auto"></label>`;
function givingOverview() {
  const m = S.gMonth; const inc = all('income').filter(inBranch).filter(i => monthOf(i.date) === m);
  const exp = all('expenses').filter(inBranch).filter(e => monthOf(e.date) === m && e.status === 'Approved');
  const cats = {}; inc.forEach(i => cats[i.category] = (cats[i.category] || 0) + (+i.amount || 0));
  const months = lastMonths(6);
  const groups = months.map(x => ({ l: monthLabel(x), a: sum(all('income').filter(inBranch).filter(i => monthOf(i.date) === x)), b: sum(all('expenses').filter(inBranch).filter(e => monthOf(e.date) === x && e.status === 'Approved')) }));
  const online = inc.filter(i => /Online|USSD/.test(i.method || ''));
  return `<div class="toolbar">${monthPicker()}</div>
  <div class="grid kpis">${kpi('Income', naira(sum(inc)), monthLabel(m, true))}${has('expenses') ? kpi('Approved expenses', naira(sum(exp)), '') + kpi('Balance', naira(sum(inc) - sum(exp)), sum(inc) - sum(exp) >= 0 ? '<span class="up">Surplus</span>' : '<span class="down">Deficit</span>') : ''}${kpi('Given online', naira(sum(online)), `${online.length} gifts`)}</div>
  <div class="grid cols-2 gap">
    <section class="panel"><h2>By category</h2>${hbars(Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v })), naira)}</section>
    <section class="panel"><h2>Last 6 months</h2>${barChart(groups, has('expenses') ? [{ key: 'a', label: 'Income', color: 'var(--accent)' }, { key: 'b', label: 'Approved expenses', color: 'var(--gold)' }] : [{ key: 'a', label: 'Income', color: 'var(--accent)' }], { fmt: v => '₦' + compact(v), label: 'Monthly income and expenses' })}</section>
  </div>
  <section class="panel gap"><h2>Online giving</h2><p class="muted" style="margin:0">${has('online') ? 'In the production app, members give through a Paystack or Flutterwave link. Each payment is matched to the member automatically, and a receipt goes out on WhatsApp. In this prototype, record online gifts with the method “Online (Paystack)”.' : 'Online giving through Paystack or Flutterwave comes with the Standard plan.'}</p></section>`;
}
function givingIncome() {
  const list = all('income').filter(inBranch).filter(i => monthOf(i.date) === S.gMonth).sort(byDateDesc);
  return `<div class="toolbar">${monthPicker()}<span class="muted small">${list.length} records · ${naira(sum(list))}</span></div>
  <section class="panel">${list.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Given by</th><th class="hide-sm">Method</th><th class="num">Amount</th><th></th></tr></thead><tbody>
    ${list.map(i => { const m = i.memberId && D.members[i.memberId]; return `<tr ${canFin() ? `class="click" data-act="editIncome" data-id="${esc(i.id)}"` : ''}><td>${fmtShort(i.date)}</td><td>${esc(i.category)}${i.source === 'count' ? ' ' + pill('From count', 'accent') : ''}</td><td>${m ? esc(fullName(m)) : `<span class="muted">${esc(i.note || 'General collection')}</span>`}</td><td class="hide-sm">${esc(i.method || '')}</td><td class="num"><b>${naira(i.amount)}</b></td><td class="num">${m ? `<button class="btn sm" data-act="receipt" data-id="${esc(i.id)}">Receipt</button>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div>` : emptyBox('No giving recorded for this month.', canFin() ? `<button class="btn primary" data-act="newIncome">Record giving</button>` : '')}</section>`;
}
function givingExpenses() {
  const list = all('expenses').filter(inBranch).filter(e => monthOf(e.date) === S.gMonth).sort(byDateDesc);
  const pending = all('expenses').filter(inBranch).filter(e => e.status === 'Pending');
  return `<div class="toolbar">${monthPicker()}<span class="muted small">${pending.length} waiting for approval overall</span></div>
  <section class="panel">${list.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(e => `<tr><td>${fmtShort(e.date)}</td><td>${esc(e.category)}</td><td>${esc(e.desc || '')}<br><span class="muted small">Requested by ${esc(e.requestedBy || '—')}${e.decidedBy ? ' · ' + esc(e.status.toLowerCase()) + ' by ' + esc(e.decidedBy) : ''}</span></td><td class="num"><b>${naira(e.amount)}</b></td><td>${pill(e.status, e.status === 'Approved' ? 'ok' : e.status === 'Rejected' ? 'bad' : 'warn')}</td>
    <td class="num">${e.status === 'Pending' && canApprove() ? `<button class="btn sm" data-act="decideExp" data-id="${esc(e.id)}" data-d="Approved">Approve</button> <button class="btn sm danger" data-act="decideExp" data-id="${esc(e.id)}" data-d="Rejected">Reject</button>` : ''}</td></tr>`).join('')}
  </tbody></table></div>` : emptyBox('No expenses for this month.', canFin() ? `<button class="btn primary" data-act="newExpense">Add expense</button>` : '')}
  <p class="muted small" style="margin:12px 0 0">Finance records requests. The church admin or pastor approves them. Every decision goes into the activity log.</p></section>`;
}
function givingCounts() {
  const list = all('counts').filter(inBranch).sort(byDateDesc).slice(0, 30);
  return `<div class="toolbar">${canFin() ? `<button class="btn primary" data-act="newCount">${icon('plus', 16)} New count sheet</button>` : ''}<span class="muted small">At least 2 counters must sign before a count can go into the books.</span></div>
  <section class="panel">${list.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Service</th><th>Category</th><th class="num">Total</th><th>Signed</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(c => { const signed = (c.counters || []).filter(x => x.signed && x.name).length; return `<tr ${!c.posted && canFin() ? `class="click" data-act="editCount" data-id="${esc(c.id)}"` : ''}><td>${fmtShort(c.date)}</td><td>${esc(c.service)}</td><td>${esc(c.category)}</td><td class="num"><b>${naira(c.total)}</b></td><td>${signed} of ${(c.counters || []).filter(x => x.name).length || 3}</td><td>${c.posted ? pill('Posted to income', 'ok') : c.status === 'Verified' ? pill('Verified', 'accent') : pill('Awaiting sign-off', 'warn')}</td>
  <td class="num">${c.status === 'Verified' && !c.posted && canFin() ? `<button class="btn sm primary" data-act="postCount" data-id="${esc(c.id)}">Post to income</button>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div>` : emptyBox('No count sheets yet.', canFin() ? `<button class="btn primary" data-act="newCount">Start a count</button>` : '')}</section>`;
}
function incomeForm(id) {
  const st = ST(); const i = id ? D.income[id] : { date: today(), category: st.incomeCats[0], method: 'Cash' };
  const m = i.memberId && D.members[i.memberId];
  const body = `<input type="hidden" name="id" value="${esc(id || '')}"><div class="form-grid">
    <div class="field"><label for="i-date">Date</label><input class="input" type="date" id="i-date" name="date" value="${esc(i.date)}"></div>
    <div class="field"><label for="i-cat">Category</label><select class="input" id="i-cat" name="category">${st.incomeCats.map(c => `<option ${c === i.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <div class="field"><label for="i-amt">Amount (₦)</label><input class="input" id="i-amt" name="amount" inputmode="numeric" value="${esc(i.amount || '')}" placeholder="e.g. 25000"></div>
    <div class="field"><label for="i-method">Method</label><select class="input" id="i-method" name="method">${METHODS.map(x => `<option ${x === i.method ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="i-member">Member (leave blank for a general collection)</label><input class="input" id="i-member" name="member" list="mem-list" value="${esc(m ? fullName(m) : '')}" autocomplete="off"><datalist id="mem-list">${members().map(x => `<option value="${esc(fullName(x))}">`).join('')}</datalist></div>
    <div class="field"><label for="i-note">Note</label><input class="input" id="i-note" name="note" value="${esc(i.note || '')}" placeholder="e.g. Sunday first service"></div>
  </div>`;
  formModal('income', id ? 'Edit giving record' : 'Record giving', body, 'Save', { left: id ? `<button class="btn danger left" data-act="deleteIncome" data-id="${esc(id)}">Delete</button>` : '' });
}
function expenseForm() {
  const st = ST();
  const body = `<div class="form-grid">
    <div class="field"><label for="e-date">Date</label><input class="input" type="date" id="e-date" name="date" value="${today()}"></div>
    <div class="field"><label for="e-cat">Category</label><select class="input" id="e-cat" name="category">${st.expenseCats.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
    <div class="field"><label for="e-amt">Amount (₦)</label><input class="input" id="e-amt" name="amount" inputmode="numeric"></div>
  </div><div class="field"><label for="e-desc">What is it for?</label><input class="input" id="e-desc" name="desc" placeholder="e.g. Diesel for Sunday service generator"></div>`;
  formModal('expense', 'Request an expense', body, 'Submit for approval');
}
function countForm(id) {
  const st = ST(); const c = id ? D.counts[id] : { date: today(), service: st.serviceTypes[0], category: 'Offering', denoms: {}, counters: [{}, {}, {}] };
  const counters = [0, 1, 2].map(k => (c.counters || [])[k] || {});
  const body = `<input type="hidden" name="id" value="${esc(id || '')}"><div class="form-grid">
    <div class="field"><label for="k-date">Date</label><input class="input" type="date" id="k-date" name="date" value="${esc(c.date)}"></div>
    <div class="field"><label for="k-svc">Service</label><select class="input" id="k-svc" name="service">${st.serviceTypes.map(t => `<option ${t === c.service ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
    <div class="field"><label for="k-cat">Category</label><select class="input" id="k-cat" name="category">${st.incomeCats.map(t => `<option ${t === c.category ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
  </div>
  <div class="field"><span class="lbl">Notes counted (number of each note)</span><div class="denoms">${DENOMS.map(d => `<label class="denom"><b>₦${num(d)} notes</b><input class="input" type="number" min="0" inputmode="numeric" name="d${d}" data-denom="${d}" value="${esc((c.denoms || {})[d] || '')}"><small id="dl-${d}">${naira(d * ((c.denoms || {})[d] || 0))}</small></label>`).join('')}</div></div>
  <div class="field"><label for="k-coins">Coins and other (₦)</label><input class="input" id="k-coins" name="coins" inputmode="numeric" value="${esc(c.coins || '')}" data-denom="1"></div>
  <div class="total-line"><span>Total</span><span id="cnt-total">${naira(c.total || 0)}</span></div>
  <div class="field"><span class="lbl">Counters sign off (at least 2)</span>${counters.map((x, k) => `<div class="toolbar" style="margin:0"><input class="input" name="cn${k}" placeholder="Counter ${k + 1} name" value="${esc(x.name || '')}" style="flex:1 1 180px"><label class="checks"><label><input type="checkbox" name="cs${k}" value="1" ${x.signed ? 'checked' : ''}>I confirm this count</label></label></div>`).join('')}</div>`;
  formModal('count', id ? 'Edit count sheet' : 'Offering count sheet', body, 'Save count', { wide: true, left: id ? `<button class="btn danger left" data-act="deleteCount" data-id="${esc(id)}">Delete</button>` : '' });
}

/* ---------- Messages ---------- */
function audienceOptions() {
  const st = ST();
  return [['all', 'All active members'], ['workers', 'Workers & ministers'], ['firsttimers', 'First-timers'], ['absentees', 'Absentees (missed 3 services)'], ['birthdays', 'Birthdays in the next 7 days'],
    ...st.departments.map(d => ['dept:' + d, 'Department: ' + d]), ...['Member', 'Regular attender', 'Inactive'].map(s => ['status:' + s, 'Status: ' + s])];
}
function audience(key) {
  const ms = members().filter(m => !GONE.includes(m.status) && (m.phone || m.guardianPhone));
  if (key === 'all') return ms.filter(m => m.status !== 'Inactive' && !m.isChild);
  if (key === 'workers') return ms.filter(m => ['Worker', 'Minister'].includes(m.status));
  if (key === 'firsttimers') return ms.filter(m => m.status === 'First-timer');
  if (key === 'absentees') { const ids = new Set(absentees().map(a => a.m.id)); return ms.filter(m => ids.has(m.id)); }
  if (key === 'birthdays') { const ids = new Set(celebrations(7).filter(c => c.label === 'Birthday').map(c => c.m.id)); return ms.filter(m => ids.has(m.id)); }
  if (key.startsWith('dept:')) return ms.filter(m => (m.depts || []).includes(key.slice(5)));
  if (key.startsWith('status:')) return ms.filter(m => m.status === key.slice(7));
  return [];
}
V.comms = () => {
  if (!has('comms')) return `<div class="page-head"><div><h1 class="page">Messages</h1></div></div>` + gate('comms', 'Messaging');
  const st = ST(); if (!S.cText) S.cText = st.templates[S.cTpl] || '';
  const aud = audience(S.cAud);
  const log = all('messages').filter(inBranch).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 8);
  const bdays = celebrations(7).filter(c => c.label === 'Birthday');
  return `<div class="page-head"><div><h1 class="page">Messages</h1><p class="sub">Reach people on WhatsApp, where they already are.</p></div></div>
  <div class="grid cols-2">
    <section class="panel"><h2>New message</h2><div class="stack">
      <div class="form-grid"><div class="field"><label for="c-aud">Send to</label><select class="input" id="c-aud" data-ui="cAud">${audienceOptions().map(([k, l]) => `<option value="${esc(k)}" ${S.cAud === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="field"><label for="c-tpl">Start from</label><select class="input" id="c-tpl" data-act-change="pickTpl">${Object.entries(TEMPLATE_NAMES).map(([k, l]) => `<option value="${k}" ${S.cTpl === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
      <div class="field"><label for="c-text">Message</label><textarea class="input" id="c-text" data-ui="cText" data-no-render rows="6">${esc(S.cText)}</textarea><span class="muted small">Use {first_name}, {name}, {church} or {pastor} and each person gets their own version.</span></div>
      <div class="split"><span><b>${num(aud.length)}</b> recipients with a phone number</span><button class="btn primary" data-act="prepareMsgs" ${aud.length ? '' : 'disabled'}>${icon('chat', 16)} Prepare messages</button></div>
      <p class="muted small" style="margin:0">${has('bulk') ? 'In the production app, this sends automatically through the WhatsApp Business API or SMS. The prototype opens each chat for you.' : 'On Basic you send messages one by one. Bulk sending through the WhatsApp API or SMS comes with the Standard plan.'}</p>
    </div></section>
    <section class="panel"><h2>Birthdays this week</h2>${bdays.length ? `<div class="list">${bdays.map(c => `<div class="row"><span class="grow">${who(c.m, c.diff === 0 ? '<b>Today</b>' : fmtShort(c.date))}</span>${waBtn(c.m.phone, fillTpl(st.templates.birthday, c.m), 'Send wish')}</div>`).join('')}</div>` : emptyBox('No birthdays in the next 7 days.')}
      <h2 style="margin-top:20px">Recently sent</h2>${log.length ? `<div class="list">${log.map(l => `<div class="row"><span class="grow"><b>${esc(l.audience)}</b><br><span class="muted small">${esc((l.text || '').slice(0, 90))}${(l.text || '').length > 90 ? '…' : ''}</span></span><span class="small muted">${num(l.count)} people · ${fmtShort(l.date)}</span></div>`).join('')}</div>` : emptyBox('Messages you send are logged here.')}
    </section>
  </div>
  <section class="panel gap"><h2>Message templates <span class="muted">used for birthdays, follow-up and absentees across the app</span></h2>
    <form data-form="templates" class="grid cols-2">${Object.entries(TEMPLATE_NAMES).map(([k, l]) => `<div class="field"><label for="t-${k}">${esc(l)}</label><textarea class="input" id="t-${k}" name="${k}" rows="3" ${S.role === 'admin' ? '' : 'readonly'}>${esc(st.templates[k])}</textarea></div>`).join('')}
    ${S.role === 'admin' ? `<div><button class="btn" type="submit">Save templates</button></div>` : ''}</form></section>`;
};

/* ---------- Children's check-in ---------- */
V.children = () => {
  const head = `<div class="page-head"><div><h1 class="page">Children’s check-in</h1><p class="sub">Each child goes home only with the person holding the matching pickup code.</p></div>${has('children') ? `<div class="actions"><button class="btn primary" data-act="checkInChild">${icon('plus', 16)} Check in a child</button></div>` : ''}</div>`;
  if (!has('children')) return head + gate('children', 'Children’s check-in');
  const todays = all('checkins').filter(inBranch).filter(c => c.date === today());
  const inNow = todays.filter(c => !c.outAt).sort((a, b) => (a.inAt || '').localeCompare(b.inAt || ''));
  const out = todays.filter(c => c.outAt).sort((a, b) => (b.outAt || '').localeCompare(a.outAt || ''));
  const kidCard = c => { const k = D.members[c.childId] || { first: c.childName }; return `<div class="kid"><div class="split"><b>${esc(fullName(k))}</b>${pill(c.cls || 'Class', 'accent')}</div>${k.allergy ? `<span class="pill warn">${icon('alert', 13)} ${esc(k.allergy)}</span>` : ''}<span class="small muted">Dropped by ${esc(c.guardian || '—')} at ${fmtTime(c.inAt)}</span><div class="split"><span class="code">•••${esc(String(c.code).slice(-1))}</span><button class="btn sm primary" data-act="releaseChild" data-id="${esc(c.id)}">Release</button></div></div>`; };
  return head + `<div class="grid kpis">${kpi('In class now', num(inNow.length), '')}${kpi('Picked up today', num(out.length), '')}${kpi('With allergy notes', num(inNow.filter(c => (D.members[c.childId] || {}).allergy).length), 'Shown to teachers')}${kpi('Children on record', num(members().filter(m => m.isChild).length), '')}</div>
  <section class="panel gap"><h2>In class now <span class="muted">${fmtDate(today())}</span></h2>${inNow.length ? `<div class="kids">${inNow.map(kidCard).join('')}</div>` : emptyBox('No children checked in right now.', `<button class="btn primary" data-act="checkInChild">Check in a child</button>`)}</section>
  <section class="panel gap"><h2>Picked up today</h2>${out.length ? `<div class="table-wrap"><table><thead><tr><th>Child</th><th>Class</th><th>Dropped by</th><th>Collected by</th><th class="num">Time out</th></tr></thead><tbody>${out.map(c => `<tr><td>${esc(fullName(D.members[c.childId] || { first: c.childName }))}</td><td>${esc(c.cls || '')}</td><td>${esc(c.guardian || '')}</td><td>${esc(c.outBy || '')}</td><td class="num">${fmtTime(c.outAt)}</td></tr>`).join('')}</tbody></table></div>` : emptyBox('No pickups yet today.')}</section>`;
};
function checkInForm() {
  const inIds = new Set(all('checkins').filter(c => c.date === today() && !c.outAt).map(c => c.childId));
  const kids = members().filter(m => m.isChild && !inIds.has(m.id)).sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const body = `<div class="field"><label for="ch-child">Child</label><select class="input" id="ch-child" name="childId"><option value="">— New child (fill in below) —</option>${kids.map(k => `<option value="${esc(k.id)}">${esc(fullName(k))}${k.allergy ? ' ⚠ ' + esc(k.allergy) : ''}</option>`).join('')}</select></div>
  <div class="form-grid" id="ch-new">
    <div class="field"><label for="ch-name">New child’s name</label><input class="input" id="ch-name" name="childName"></div>
    <div class="field"><label for="ch-allergy">Allergy / special care</label><input class="input" id="ch-allergy" name="allergy"></div>
  </div>
  <div class="form-grid">
    <div class="field"><label for="ch-class">Class</label><select class="input" id="ch-class" name="cls">${KID_CLASSES.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
    <div class="field"><label for="ch-guard">Dropped off by</label><input class="input" id="ch-guard" name="guardian" placeholder="Parent or guardian name"></div>
    <div class="field"><label for="ch-gphone">Guardian phone</label><input class="input" id="ch-gphone" name="guardianPhone" inputmode="tel"></div>
  </div>`;
  formModal('checkin', 'Check in a child', body, 'Check in and get code');
}

/* ---------- Reports ---------- */
V.reports = () => {
  const head = `<div class="page-head"><div><h1 class="page">Reports</h1><p class="sub">${esc(scopeLabel())} · for board meetings, HQ returns and planning.</p></div>
    <div class="actions">${has('reports') ? `<div class="seg">${[['1', 'This month'], ['3', '3 months'], ['12', '12 months']].map(([k, l]) => `<button class="${S.period === k ? 'on' : ''}" data-act="period" data-p="${k}">${l}</button>`).join('')}</div>` : ''}</div></div>`;
  if (!has('reports')) return head + gate('reports', 'Reports and exports');
  const st = ST(); const n = +S.period; const start = shiftMonth(thisMonth(), -(n - 1)) + '-01';
  const inP = d => d && d >= start;
  const newM = members().filter(m => inP(m.joined) && m.status !== 'First-timer');
  const svcs = all('services').filter(inBranch).filter(s => inP(s.date));
  const sundays = svcs.filter(s => s.type === st.serviceTypes[0]);
  const inc = all('income').filter(inBranch).filter(i => inP(i.date)); const exp = all('expenses').filter(inBranch).filter(e => inP(e.date) && e.status === 'Approved');
  const ft = members().filter(m => m.followUp && inP(m.followUp.visited)); const conv = ft.filter(m => ['Member', 'Department'].includes(m.followUp.stage));
  const cats = {}; inc.forEach(i => cats[i.category] = (cats[i.category] || 0) + (+i.amount || 0));
  const depts = st.departments.map(d => ({ l: d, v: members().filter(m => (m.depts || []).includes(d) && !GONE.includes(m.status)).length })).sort((a, b) => b.v - a.v);
  const statuses = STATUSES.map(s => ({ l: s, v: members().filter(m => m.status === s).length })).filter(x => x.v);
  const growth = lastMonths(12).map(m => ({ l: monthLabel(m), a: members().filter(x => monthOf(x.joined) === m && x.status !== 'First-timer').length, b: members().filter(x => x.followUp && monthOf(x.followUp.visited) === m).length }));
  const mAtt = lastMonths(n).map(m => { const ss = sundays.filter(s => monthOf(s.date) === m); return { m, avg: ss.length ? Math.round(sum(ss, s => s.total) / ss.length) : 0, n: ss.length, hi: ss.length ? Math.max(...ss.map(s => s.total)) : 0 }; });
  return head + `<div class="grid kpis">${kpi('Average Sunday attendance', num(sundays.length ? sum(sundays, s => s.total) / sundays.length : 0), `${sundays.length} services`)}${kpi('New members', num(newM.length), '')}${kpi('First-timers', num(ft.length), `${conv.length} became members`)}${canFin() || S.role === 'pastor' ? kpi('Income', naira(sum(inc)), `Expenses ${naira(sum(exp))}`) : ''}</div>
  <div class="grid cols-2 gap">
    <section class="panel"><h2>Growth <span class="muted">last 12 months</span></h2>${barChart(growth, [{ key: 'a', label: 'New members', color: 'var(--accent)' }, { key: 'b', label: 'First-timers', color: 'var(--gold)' }], { fmt: v => num(v), label: 'New members and first-timers per month' })}</section>
    <section class="panel"><h2>Monthly attendance</h2><div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Services</th><th class="num">Average</th><th class="num">Highest</th></tr></thead><tbody>${mAtt.map(r => `<tr><td>${monthLabel(r.m, true)}</td><td class="num">${r.n}</td><td class="num"><b>${num(r.avg)}</b></td><td class="num">${num(r.hi)}</td></tr>`).join('')}</tbody></table></div></section>
    ${canFin() || S.role === 'pastor' ? `<section class="panel"><h2>Giving by category</h2>${hbars(Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v })), naira)}</section>` : ''}
    <section class="panel"><h2>Department strength</h2>${hbars(depts.filter(d => d.v))}</section>
    <section class="panel"><h2>Membership by status</h2>${hbars(statuses)}</section>
    <section class="panel"><h2>Pastor’s weekly summary</h2><textarea class="input" id="wk-sum" rows="8" readonly>${esc(weeklySummary())}</textarea><div class="toolbar" style="margin:10px 0 0"><button class="btn" data-act="copySummary">${icon('copy', 15)} Copy for WhatsApp</button></div></section>
  </div>
  <section class="panel gap"><h2>Export to Excel</h2><div class="toolbar" style="margin:0">
    <button class="btn" data-act="exportMembers">${icon('download', 15)} Members</button><button class="btn" data-act="exportAttendance">${icon('download', 15)} Attendance</button>
    ${canFin() || S.role === 'pastor' ? `<button class="btn" data-act="exportIncome">${icon('download', 15)} Income</button><button class="btn" data-act="exportExpenses">${icon('download', 15)} Expenses</button>` : ''}</div></section>`;
};
function weeklySummary() {
  const st = ST(); const from = addDays(today(), -6);
  const svcs = all('services').filter(inBranch).filter(s => s.date >= from).sort(byDateDesc);
  const inc = sum(all('income').filter(inBranch).filter(i => i.date >= from));
  const ft = members().filter(m => m.followUp && m.followUp.visited >= from).length;
  const abs = absentees().length; const due = followDue().length;
  return `${st.name}${isMulti() && S.branch !== 'all' ? ' (' + branchName(S.branch) + ')' : ''}: week ending ${fmtDate(today())}\n\n` +
    (svcs.length ? svcs.map(s => `• ${s.type} (${fmtShort(s.date)}): ${num(s.total)} (${num(s.men)} men, ${num(s.women)} women, ${num(s.children)} children)`).join('\n') : '• No services recorded this week') +
    `\n• First-timers: ${ft}\n• Giving recorded: ${naira(inc)}\n• Members missing 3+ services: ${abs}\n• Follow-ups due: ${due}\n\nSent from Shepherd Desk`;
}

/* ---------- Branches (multi-branch only) ---------- */
function remitDue(branchId, month) {
  const rates = ST().remitRates;
  return all('income').filter(i => (i.branchId || 'main') === branchId && monthOf(i.date) === month).reduce((a, i) => a + (+i.amount || 0) * ((+rates[i.category] || 0) / 100), 0);
}
V.branches = () => {
  const head = `<div class="page-head"><div><h1 class="page">Branches</h1><p class="sub">HQ view of every branch: people, giving and remittance.</p></div>${has('branches') && S.role === 'admin' ? `<div class="actions"><button class="btn primary" data-act="newBranch">${icon('plus', 16)} Add branch</button><button class="btn" data-act="newRemit">Record remittance</button></div>` : ''}</div>`;
  if (!has('branches')) return head + gate('branches', 'Branch management');
  const st = ST(); const m = thisMonth(); const mainType = st.serviceTypes[0];
  const rows = branches().map(b => {
    const mem = all('members').filter(x => (x.branchId || 'main') === b.id && !GONE.includes(x.status)).length;
    const lastS = all('services').filter(s => (s.branchId || 'main') === b.id && s.type === mainType).sort(byDateDesc)[0];
    const inc = sum(all('income').filter(i => (i.branchId || 'main') === b.id && monthOf(i.date) === m));
    const due = b.hq ? 0 : remitDue(b.id, m); const paid = sum(all('remits').filter(r => r.branchId === b.id && r.month === m));
    const bal = due - paid;
    const status = b.hq ? pill('HQ') : due === 0 ? pill('Nothing due') : bal <= 0 ? pill('Paid', 'ok') : paid > 0 ? pill('Part paid', 'warn') : pill('Owing', 'bad');
    return `<tr class="click" data-act="editBranch" data-id="${esc(b.id)}"><td><b>${esc(b.name)}</b><br><span class="muted small">${esc(b.pastor || 'No pastor posted')}</span></td><td class="num">${num(mem)}</td><td class="num">${lastS ? num(lastS.total) : '—'}</td><td class="num">${naira(inc)}</td><td class="num">${b.hq ? '—' : naira(due)}</td><td class="num">${b.hq ? '—' : naira(paid)}</td><td>${status}</td></tr>`;
  }).join('');
  const hist = all('remits').sort(byDateDesc).slice(0, 12);
  return head + `<section class="panel"><h2>${monthLabel(m, true)} at a glance</h2><div class="table-wrap"><table><thead><tr><th>Branch</th><th class="num">Members</th><th class="num">Last Sunday</th><th class="num">Income</th><th class="num">Remittance due</th><th class="num">Paid</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>
  <div class="grid cols-2 gap">
    <section class="panel"><h2>Remittance rates <span class="muted">% of each income category sent to HQ</span></h2>
      <form data-form="rates" class="stack"><div class="form-grid">${st.incomeCats.map(c => `<div class="field"><label for="r-${esc(c)}">${esc(c)} %</label><input class="input" id="r-${esc(c)}" name="${esc(c)}" type="number" min="0" max="100" step="0.5" value="${esc(st.remitRates[c] || 0)}" ${S.role === 'admin' ? '' : 'readonly'}></div>`).join('')}</div>${S.role === 'admin' ? '<div><button class="btn" type="submit">Save rates</button></div>' : ''}</form></section>
    <section class="panel"><h2>Remittance payments</h2>${hist.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Branch</th><th>For</th><th class="num">Amount</th></tr></thead><tbody>${hist.map(r => `<tr><td>${fmtShort(r.date)}</td><td>${esc(branchName(r.branchId))}</td><td>${monthLabel(r.month, true)}</td><td class="num">${naira(r.amount)}</td></tr>`).join('')}</tbody></table></div>` : emptyBox('No remittance payments recorded yet.')}</section>
  </div>
  <p class="muted small">Member and pastor transfers: open a member and change their branch. Open a branch to post a new pastor. Both are recorded with dates.</p>`;
};
function branchForm(id) {
  const b = id && id !== 'main' ? D.branches[id] : id === 'main' ? branches()[0] : {};
  const body = `<input type="hidden" name="id" value="${esc(id || '')}"><div class="form-grid">
    <div class="field"><label for="b-name">Branch name</label><input class="input" id="b-name" name="name" value="${esc(b.name || '')}" placeholder="e.g. Akure"></div>
    <div class="field"><label for="b-loc">Address</label><input class="input" id="b-loc" name="location" value="${esc(b.location || '')}"></div>
    <div class="field"><label for="b-pastor">Pastor in charge</label><input class="input" id="b-pastor" name="pastor" value="${esc(b.pastor || '')}"></div>
    <div class="field"><label for="b-phone">Branch phone</label><input class="input" id="b-phone" name="phone" value="${esc(b.phone || '')}" inputmode="tel"></div>
  </div>${(b.postings || []).length ? `<div><b class="small">Pastor postings</b><div class="timeline" style="margin-top:6px">${b.postings.slice().reverse().map(p => `<div class="note">${esc(p.pastor)}<small>From ${fmtDate(p.date)}</small></div>`).join('')}</div></div>` : ''}`;
  formModal('branch', id ? 'Edit ' + (b.name || 'branch') : 'Add a branch', body, id ? 'Save' : 'Add branch');
}
function remitForm() {
  const body = `<div class="form-grid">
    <div class="field"><label for="rm-b">Branch</label><select class="input" id="rm-b" name="branchId">${branches().filter(b => !b.hq).map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="rm-m">For month</label><input class="input" type="month" id="rm-m" name="month" value="${thisMonth()}"></div>
    <div class="field"><label for="rm-a">Amount (₦)</label><input class="input" id="rm-a" name="amount" inputmode="numeric"></div>
    <div class="field"><label for="rm-d">Date paid</label><input class="input" type="date" id="rm-d" name="date" value="${today()}"></div>
    <div class="field"><label for="rm-r">Reference</label><input class="input" id="rm-r" name="ref" placeholder="Transfer reference"></div></div>`;
  formModal('remit', 'Record remittance to HQ', body, 'Save payment');
}

/* ---------- Settings ---------- */
V.settings = () => {
  const st = ST(); const cur = st.plan;
  const planCard = k => { const p = PLANS[k]; return `<div class="plan ${cur === k ? 'on' : ''}"><h3>${esc(p.name)}${cur === k ? pill('Current', 'accent') : ''}</h3><span class="muted small">${esc(p.blurb)} · <b>${esc(p.price)}</b></span><ul>${p.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${cur === k ? '' : `<button class="btn ${PLANS[cur].fam === p.fam ? '' : 'primary'}" data-act="switchPlan" data-plan="${k}">${PLANS[cur].fam === 'single' && p.fam === 'multi' ? 'Switch on branches' : 'Switch to ' + esc(p.name)}</button>`}</div>`; };
  const team = st.team || [];
  const ex = COLS.filter(c => c !== 'settings').reduce((a, c) => a + all(c).filter(x => x.example).length, 0);
  const log = all('audit').sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 40);
  return `<div class="page-head"><div><h1 class="page">Settings</h1><p class="sub">Church profile, plan, team and lists.</p></div></div>
  <div class="grid cols-2">
    <section class="panel"><h2>Church profile</h2><form data-form="profile" class="stack"><div class="form-grid">
      <div class="field"><label for="p-name">Church name</label><input class="input" id="p-name" name="name" value="${esc(st.name)}"></div>
      <div class="field"><label for="p-main">${st.multiBranch ? 'HQ / main branch name' : 'Location name'}</label><input class="input" id="p-main" name="mainBranch" value="${esc(st.mainBranch)}"></div>
      <div class="field"><label for="p-pastor">Senior pastor</label><input class="input" id="p-pastor" name="pastor" value="${esc(st.pastor)}"></div>
      <div class="field"><label for="p-addr">Address</label><input class="input" id="p-addr" name="address" value="${esc(st.address)}"></div>
    </div><div><button class="btn" type="submit">Save profile</button></div></form></section>
    <section class="panel"><h2>Branches</h2>${st.multiBranch ? `<p style="margin:0 0 10px">Branch features are on. <b>${branches().length}</b> locations, with <b>${esc(st.mainBranch)}</b> as HQ.</p><button class="btn" data-act="goto" data-route="branches">Manage branches</button>` : `<p style="margin:0 0 10px">You’re set up as <b>one church</b>, so branch menus stay hidden. When you plant a second location, add it here. All your members, giving and history stay as they are.</p><button class="btn primary" data-act="switchPlan" data-plan="network">${icon('branch', 16)} Add a branch</button>`}</section>
  </div>
  <section class="panel gap"><h2>Plan</h2><p class="muted" style="margin:0">Prototype: switching plans here doesn’t charge anything. Naira prices will be set after the pilot.</p>
    <div class="fam-label">Single church plans</div><div class="grid plan-grid">${['starter', 'basic', 'standard', 'premium'].map(planCard).join('')}</div>
    <div class="fam-label">Multi-branch plans</div><div class="grid plan-grid">${['network', 'enterprise'].map(planCard).join('')}</div></section>
  <div class="grid cols-2 gap">
    <section class="panel"><h2>Team & roles <span class="muted">${team.length} of ${plan().admins === Infinity ? 'unlimited' : plan().admins} admin seats</span></h2>
      ${team.length ? `<div class="list">${team.map((t, i) => `<div class="row"><span class="grow"><b>${esc(t.name)}</b><br><span class="muted small">${esc(ROLES[t.role] ? ROLES[t.role].label : t.role)} ${t.phone ? '· ' + esc(t.phone) : ''}</span></span><button class="btn sm ghost danger" data-act="removeTeam" data-i="${i}">Remove</button></div>`).join('')}</div>` : emptyBox('Add the people who help run the church records.')}
      <form data-form="team" class="toolbar" style="margin:12px 0 0"><input class="input" name="name" placeholder="Name" style="flex:1 1 140px" aria-label="Team member name"><input class="input" name="phone" placeholder="Phone" style="flex:1 1 110px" aria-label="Phone"><select class="input" name="role" aria-label="Role">${Object.entries(ROLES).filter(([k]) => has('roles') || ['admin', 'finance', 'secretary'].includes(k)).map(([k, r]) => `<option value="${k}">${esc(r.label)}</option>`).join('')}</select><button class="btn" type="submit">Add</button></form>
      ${(typeof STORE !== 'undefined' && STORE && STORE.user.joinCode) ? `<div class="banner" style="margin:12px 0 0"><span class="grow">Your church code is <b>${esc(STORE.user.joinCode)}</b>. Team members create their own account, choose “Join with a code” and enter it.</span><button class="btn sm" data-act="copyCode">Copy code</button></div>` : ''}
      <p class="muted small" style="margin:10px 0 0">Use “Viewing as” at the top to see the app the way each role does.${has('roles') ? '' : ' More roles (pastor, follow-up, usher) come with Standard.'}</p></section>
    <section class="panel"><h2>Lists <span class="muted">one per line</span></h2><form data-form="lists" class="grid cols-2" style="gap:12px">
      ${[['departments', 'Departments'], ['serviceTypes', 'Service types (first is the main service)'], ['incomeCats', 'Giving categories'], ['expenseCats', 'Expense categories']].map(([k, l]) => `<div class="field"><label for="l-${k}">${esc(l)}</label><textarea class="input" id="l-${k}" name="${k}" rows="6">${esc((st[k] || []).join('\n'))}</textarea></div>`).join('')}
      <div><button class="btn" type="submit">Save lists</button></div></form></section>
  </div>
  <div class="grid cols-2 gap">
    <section class="panel"><h2>Activity log</h2>${has('audit') ? (log.length ? `<div class="list">${log.map(a => `<div class="row"><span class="grow"><b>${esc(a.action)}</b><br><span class="muted small">${esc(a.detail || '')}</span></span><span class="small muted">${esc(ROLES[a.role] ? ROLES[a.role].label : a.role || '')} · ${a.at ? new Date(a.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span></div>`).join('')}</div>` : emptyBox('Changes to money, members and settings will appear here.')) : `<p class="muted" style="margin:0">A record of who changed finance, member and plan records, and when. It comes with the Premium and multi-branch plans.</p>`}</section>
    <section class="panel"><h2>Your data</h2><div class="stack">
      <p class="muted" style="margin:0">${MODE === 'db' ? 'Records are saved online and shared with everyone you share this app with.' : 'Demo mode: records are saved in this browser only.'}</p>
      <div class="toolbar" style="margin:0"><button class="btn" data-act="exportAll">${icon('download', 15)} Export everything (JSON)</button><button class="btn" data-act="importMembers">${icon('upload', 15)} Import members (CSV)</button></div>
      ${ex ? `<div class="banner" style="margin:0"><span class="grow"><b>${num(ex)} example records</b> are loaded to show how the app works.</span><button class="btn sm danger" data-act="clearExample">Clear example data</button></div>` : ''}
    </div></section>
  </div>`;
};
