/* ---------- Shell ---------- */
const V = {};
function shell() {
  if (!S.ready) return `<div class="loading">Opening your church records…</div>`;
  if (!D.settings.church) return setupView();
  const st = ST();
  if (!roleAllows(S.route) || (S.route === 'branches' && !st.multiBranch)) { const first = NAV.find(n => roleAllows(n.id) && !(n.multiOnly && !st.multiBranch)); S.route = first ? first.id : 'dashboard'; }
  const nav = NAV.filter(n => roleAllows(n.id) && !(n.multiOnly && !st.multiBranch)).map(n => {
    const locked = (n.feat && !has(n.feat)) || (n.id === 'branches' && !has('branches'));
    return `<button class="${S.route === n.id ? 'on' : ''}" data-act="goto" data-route="${n.id}" ${S.route === n.id ? 'aria-current="page"' : ''}>${icon(n.icon)}<span>${esc(n.label)}</span>${locked ? `<span class="lock" title="Upgrade to unlock">${icon('lock', 14)}</span>` : ''}</button>`;
  }).join('');
  const branchSel = isMulti() ? `<select class="input" data-ui="branch" aria-label="Branch"><option value="all" ${S.branch === 'all' ? 'selected' : ''}>All branches (HQ view)</option>${branches().map(b => `<option value="${esc(b.id)}" ${S.branch === b.id ? 'selected' : ''}>${esc(b.name)}${b.hq ? ' — HQ' : ''}</option>`).join('')}</select>` : '';
  const roleSel = `<label class="inline-field"><span class="hide-sm">Viewing as</span><select class="input" data-ui="role" aria-label="Viewing as role">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${S.role === k ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select></label>`;
  const modePill = MODE === 'db' ? pill('Live · shared with your team', 'ok') : pill('Demo · saved in this browser', 'warn');
  const view = (V[S.route] || V.dashboard)();
  return `<div class="app ${S.navOpen ? 'nav-open' : ''}">
    <aside class="side" aria-label="Main navigation">
      <div class="brand"><span class="mark">${icon('crook', 20)}</span><div style="min-width:0"><b>Shepherd Desk</b><small>${esc(st.name)}</small></div></div>
      <nav class="nav">${nav}</nav>
      <div class="side-foot"><span>${esc(plan().name)} plan · ${isMulti() ? branches().length + ' branches' : 'Single church'}</span><span>${modePill}</span>
        ${(typeof STORE !== 'undefined' && STORE) ? `<span class="split" style="gap:6px"><span style="overflow:hidden;text-overflow:ellipsis">${esc(STORE.user.email)}</span><button class="btn sm ghost" data-act="signOut">Sign out</button></span>` : ''}</div>
    </aside>
    <div class="side-scrim" data-act="toggleNav"></div>
    <div class="main">
      <header class="top">
        <button class="btn ghost sm menu-btn" data-act="toggleNav" aria-label="Open menu">${icon('menu')}</button>
        <span class="title">${esc(scopeLabel())}</span>
        <div class="right">${branchSel}${roleSel}</div>
      </header>
      <main class="content">${exampleBanner()}${view}</main>
    </div></div>`;
}
function exampleBanner() {
  if (!ST().example || S.route === 'settings') return '';
  return `<div class="banner">${icon('alert')}<span class="grow"><b>You’re looking at example records.</b> Explore freely. When you’re ready to enter your own church’s data, clear them in Settings.</span>${S.role === 'admin' ? `<button class="btn sm" data-act="goto" data-route="settings">Go to Settings</button>` : ''}</div>`;
}

/* ---------- First-run setup ---------- */
function setupView() {
  return `<div class="setup-wrap"><form class="setup panel" data-form="setup" novalidate>
    <div class="brand" style="padding:0"><span class="mark">${icon('crook', 20)}</span><div><b>Shepherd Desk</b><small>Set up your church in two minutes</small></div></div>
    <div class="field"><label for="su-name">Church name</label><input class="input" id="su-name" name="name" placeholder="e.g. Destiny Impact Church" required></div>
    <div class="form-grid">
      <div class="field"><label for="su-main">Location or branch name</label><input class="input" id="su-main" name="mainBranch" placeholder="e.g. Ondo"></div>
      <div class="field"><label for="su-pastor">Senior pastor</label><input class="input" id="su-pastor" name="pastor" placeholder="e.g. Pastor A. Bello"></div>
    </div>
    <div class="field"><label for="su-addr">Address</label><input class="input" id="su-addr" name="address" placeholder="Street, town, state"></div>
    <div class="field"><span class="lbl">Does your church have branches?</span>
      <label class="choice"><input type="radio" name="branches" value="no" checked><div><b>No, we’re one church</b><span>Start on the free Starter plan. You can add branches any time.</span></div></label>
      <label class="choice"><input type="radio" name="branches" value="yes"><div><b>Yes, we have branches</b><span>Turns on the HQ dashboard, remittance and branch reports (Branch Network plan).</span></div></label>
    </div>
    <p class="err" id="mf-err"></p>
    <button class="btn primary" type="submit" style="justify-content:center">Create my church</button>
  </form></div>`;
}

/* ---------- Dashboard ---------- */
V.dashboard = () => {
  const st = ST(); const mainType = st.serviceTypes[0];
  const sundays = all('services').filter(inBranch).filter(s => s.type === mainType).sort(byDateDesc);
  const last = sundays[0], prev = sundays[1];
  const mNow = thisMonth(), mPrev = shiftMonth(mNow, -1);
  const ftNow = members().filter(m => m.followUp && monthOf(m.followUp.visited) === mNow).length;
  const ftPrev = members().filter(m => m.followUp && monthOf(m.followUp.visited) === mPrev).length;
  const incNow = sum(all('income').filter(inBranch).filter(i => monthOf(i.date) === mNow));
  const incPrev = sum(all('income').filter(inBranch).filter(i => monthOf(i.date) === mPrev));
  const due = followDue();
  const trend = sundays.slice(0, 12).reverse().map(s => ({ l: fmtShort(s.date), v: s.total || 0 }));
  const abs = absentees();
  const pendingExp = has('expenses') ? all('expenses').filter(inBranch).filter(e => e.status === 'Pending') : [];
  const openCounts = has('counts') ? all('counts').filter(inBranch).filter(c => c.status !== 'Verified') : [];
  const kidsIn = has('children') ? all('checkins').filter(inBranch).filter(c => c.date === today() && !c.outAt) : [];
  const attn = [
    abs.length && roleAllows('attendance') ? { n: abs.length, t: 'members missed the last 3 services', r: 'attendance', tone: 'warn' } : null,
    due.length && roleAllows('followup') ? { n: due.length, t: 'first-timer follow-ups are due or overdue', r: 'followup', tone: 'bad' } : null,
    pendingExp.length && roleAllows('giving') ? { n: pendingExp.length, t: 'expense requests waiting for approval', r: 'giving', tab: 'expenses', tone: 'warn' } : null,
    openCounts.length && roleAllows('giving') ? { n: openCounts.length, t: 'offering counts still need sign-off', r: 'giving', tab: 'counts', tone: 'warn' } : null,
    kidsIn.length && roleAllows('children') ? { n: kidsIn.length, t: 'children are checked in and not yet picked up', r: 'children', tone: 'accent' } : null
  ].filter(Boolean);
  const cel = celebrations(14);
  const months = lastMonths(6);
  const finGroups = months.map(m => ({ l: monthLabel(m), a: sum(all('income').filter(inBranch).filter(i => monthOf(i.date) === m)), b: sum(all('expenses').filter(inBranch).filter(e => monthOf(e.date) === m && e.status === 'Approved')) }));
  const total = members().filter(m => !GONE.includes(m.status)).length; const lim = plan().limit;
  const greet = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  return `<div class="page-head"><div><h1 class="page">${greet}</h1><p class="sub">${esc(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} · ${esc(scopeLabel())}</p></div>
    <div class="actions">${roleAllows('attendance') ? `<button class="btn primary" data-act="newService">${icon('check', 16)} Record attendance</button>` : ''}${roleAllows('followup') ? `<button class="btn" data-act="newFirstTimer">${icon('plus', 16)} First-timer</button>` : ''}</div></div>
  <div class="grid kpis">
    ${kpi(`Last ${mainType.toLowerCase()}`, last ? num(last.total) : '—', last ? `${fmtShort(last.date)} · ${deltaText(last.total, prev && prev.total, 'the one before')}` : 'No services recorded yet')}
    ${kpi('First-timers this month', num(ftNow), deltaText(ftNow, ftPrev, 'last month'))}
    ${roleAllows('giving') ? kpi('Giving this month', naira(incNow), deltaText(incNow, incPrev, 'last month')) : kpi('Members', num(total), '')}
    ${kpi('Follow-ups due', num(due.length), due.length ? '<span class="down">Needs attention</span>' : '<span class="up">All caught up</span>')}
  </div>
  <div class="grid cols-2 gap">
    <section class="panel"><h2>${esc(mainType)} attendance <span class="muted">last ${trend.length} services</span></h2>${lineChart(trend, { fmt: v => num(v), label: 'Attendance trend' })}</section>
    <section class="panel"><h2>Needs attention</h2>${attn.length ? `<div class="list">${attn.map(a => `<div class="row"><span class="pill ${a.tone}" style="min-width:34px;justify-content:center">${a.n}</span><span class="grow">${esc(a.t)}</span><button class="btn sm" data-act="goto" data-route="${a.r}" ${a.tab ? `data-tab="${a.tab}"` : ''}>Open ${icon('arrow', 14)}</button></div>`).join('')}</div>` : emptyBox('Nothing needs attention right now.')}
      <div style="margin-top:16px"><div class="split small"><span class="muted">Members on the ${esc(plan().name)} plan</span><b>${num(total)}${lim === Infinity ? '' : ' / ' + num(lim)}</b></div>${lim === Infinity ? '' : `<div class="meter ${total / lim > .85 ? 'warn' : ''}" style="margin-top:6px"><i style="width:${Math.min(100, total / lim * 100)}%"></i></div>`}</div></section>
  </div>
  <div class="grid cols-2 gap">
    ${roleAllows('giving') ? `<section class="panel"><h2>Money in and out <span class="muted">last 6 months</span></h2>${has('expenses') ? barChart(finGroups, [{ key: 'a', label: 'Income', color: 'var(--accent)' }, { key: 'b', label: 'Approved expenses', color: 'var(--gold)' }], { fmt: v => '₦' + compact(v), label: 'Income and expenses by month' }) : barChart(finGroups, [{ key: 'a', label: 'Income', color: 'var(--accent)' }], { fmt: v => '₦' + compact(v), label: 'Income by month' })}</section>` : ''}
    <section class="panel"><h2>Birthdays & anniversaries <span class="muted">next 14 days</span></h2>${cel.length ? `<div class="list">${cel.slice(0, 8).map(c => `<div class="row"><span class="grow">${who(c.m, `${esc(c.label)} · ${c.diff === 0 ? '<b>Today</b>' : c.diff === 1 ? 'Tomorrow' : fmtShort(c.date)}`)}</span>${waBtn(c.m.phone, fillTpl(c.label === 'Birthday' ? ST().templates.birthday : 'Happy wedding anniversary, {first_name}! {church} celebrates God’s faithfulness in your home.', c.m), 'Send wish')}</div>`).join('')}</div>` : emptyBox('No birthdays or anniversaries in the next two weeks.')}</section>
  </div>`;
};

/* ---------- Members ---------- */
V.members = () => {
  const st = ST(); const seen = lastSeenMap();
  let list = members(); const q = S.q.trim().toLowerCase();
  if (q) list = list.filter(m => (fullName(m) + ' ' + (m.phone || '') + ' ' + (m.household || '') + ' ' + (m.email || '')).toLowerCase().includes(q));
  if (S.fStatus) list = list.filter(m => m.status === S.fStatus);
  if (S.fDept) list = list.filter(m => (m.depts || []).includes(S.fDept));
  list.sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const counts = {}; members().forEach(m => counts[m.status] = (counts[m.status] || 0) + 1);
  const canEdit = ['admin', 'pastor', 'secretary'].includes(S.role);
  const shown = list.slice(0, 300);
  S.sel.forEach(id => { if (!D.members[id]) S.sel.delete(id); });
  const allSel = canEdit && shown.length && shown.every(m => S.sel.has(m.id));
  const rows = shown.map(m => `<tr class="click" data-act="openMember" data-id="${esc(m.id)}">
    ${canEdit ? `<td class="sel-cell" data-act="selMember" data-id="${esc(m.id)}"><input type="checkbox" aria-label="Select ${esc(fullName(m))}" ${S.sel.has(m.id) ? 'checked' : ''}></td>` : ''}
    <td>${who(m, esc(m.household ? m.household + ' household' : (m.isChild ? 'Child' : '')))}</td><td>${esc(m.phone || '—')}</td><td>${pill(m.status, statusTone(m.status))}</td>
    <td class="hide-sm">${esc((m.depts || []).join(', ') || '—')}</td><td class="hide-sm">${seen[m.id] ? fmtShort(seen[m.id]) : '<span class="muted">Not recorded</span>'}</td>${isMulti() ? `<td class="hide-sm">${esc(branchName(m.branchId))}</td>` : ''}
    ${canEdit ? `<td class="num row-actions"><button class="btn sm" data-act="editMember" data-id="${esc(m.id)}" aria-label="Edit ${esc(fullName(m))}">Edit</button> <button class="btn sm danger" data-act="deleteMember" data-id="${esc(m.id)}" aria-label="Delete ${esc(fullName(m))}">Delete</button></td>` : ''}</tr>`).join('');
  const bulkBar = canEdit && S.sel.size ? `<div class="banner bulk" style="margin:0 0 14px"><span class="grow"><b>${S.sel.size} selected</b></span><button class="btn sm" data-act="clearSel">Clear selection</button><button class="btn sm danger" data-act="bulkDelete">Delete selected</button></div>` : '';
  return `<div class="page-head"><div><h1 class="page">Members</h1><p class="sub">${num(members().length)} people · ${STATUSES.filter(s => counts[s]).map(s => `${num(counts[s])} ${s.toLowerCase()}`).slice(0, 4).join(' · ')}</p></div>
    <div class="actions">${canEdit ? `<button class="btn primary" data-act="newMember">${icon('plus', 16)} Add member</button>` : ''}${canEdit ? `<button class="btn" data-act="importMembers">${icon('upload', 16)} Import</button>` : ''}<button class="btn" data-act="exportMembers">${icon('download', 16)} Export</button></div></div>
  <section class="panel">
    <div class="toolbar"><input class="input search" id="m-search" data-ui="q" data-quiet-render value="${esc(S.q)}" placeholder="Search name, phone or household" aria-label="Search members">
      <select class="input" data-ui="fStatus" aria-label="Filter by status"><option value="">All statuses</option>${STATUSES.map(s => `<option ${S.fStatus === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <select class="input" data-ui="fDept" aria-label="Filter by department"><option value="">All departments</option>${st.departments.map(s => `<option ${S.fDept === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
    ${bulkBar}${list.length ? `<div class="table-wrap"><table><thead><tr>${canEdit ? `<th class="sel-cell" data-act="selAll"><input type="checkbox" aria-label="Select all shown" ${allSel ? 'checked' : ''}></th>` : ''}<th>Name</th><th>Phone</th><th>Status</th><th class="hide-sm">Departments</th><th class="hide-sm">Last attended</th>${isMulti() ? '<th class="hide-sm">Branch</th>' : ''}${canEdit ? '<th class="num">Actions</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>${list.length > 300 ? `<p class="muted small">Showing the first 300 of ${num(list.length)}. Narrow your search to see more.</p>` : ''}` : emptyBox(members().length ? 'No one matches these filters.' : 'No members yet. Add your first member or import a list from Excel.', canEdit && !members().length ? `<button class="btn primary" data-act="newMember">Add member</button>` : '')}
  </section>`;
};
function showMember(id) {
  const m = D.members[id]; if (!m) return;
  const st = ST(); const year = today().slice(0, 4);
  const svc = all('services').filter(s => s.mode === 'names' && (s.branchId || 'main') === (m.branchId || 'main')).sort(byDateDesc).slice(0, 12);
  const came = svc.filter(s => (s.present || []).includes(id)).length;
  const gifts = all('income').filter(i => i.memberId === id && (i.date || '').startsWith(year)).sort(byDateDesc);
  const hh = m.household ? all('members').filter(x => x.household === m.household && x.id !== id) : [];
  const canEdit = ['admin', 'pastor', 'secretary'].includes(S.role);
  const showGiving = ['admin', 'pastor', 'finance'].includes(S.role);
  const body = `<div class="split">${who(m, esc(m.phone || 'No phone'))}${pill(m.status, statusTone(m.status))}</div>
    <dl class="dl">
      <dt>Gender</dt><dd>${esc(m.gender || '—')}${m.isChild ? ' · Child' : ''}</dd>
      <dt>Birthday</dt><dd>${m.dob ? fmtDate(m.dob) : '—'}</dd>
      ${m.anniversary ? `<dt>Wedding anniversary</dt><dd>${fmtDate(m.anniversary)}</dd>` : ''}
      <dt>Departments</dt><dd>${esc((m.depts || []).join(', ') || '—')}</dd>
      ${m.cell ? `<dt>Cell group</dt><dd>${esc(m.cell)}</dd>` : ''}
      <dt>Household</dt><dd>${esc(m.household || '—')}${hh.length ? ` · with ${hh.map(x => `<a href="#" data-act="openMember" data-id="${esc(x.id)}">${esc(fullName(x))}</a>`).join(', ')}` : ''}</dd>
      ${m.address ? `<dt>Address</dt><dd>${esc(m.address)}</dd>` : ''}
      ${m.occupation ? `<dt>Occupation</dt><dd>${esc(m.occupation)}</dd>` : ''}
      ${m.allergy ? `<dt>Allergy / care</dt><dd><span class="pill warn">${esc(m.allergy)}</span></dd>` : ''}
      ${m.isChild && m.guardianName ? `<dt>Guardian</dt><dd>${esc(m.guardianName)} ${esc(m.guardianPhone || '')}</dd>` : ''}
      <dt>Joined</dt><dd>${m.joined ? fmtDate(m.joined) : '—'}</dd>
      ${isMulti() ? `<dt>Branch</dt><dd>${esc(branchName(m.branchId))}</dd>` : ''}
      <dt>Attendance</dt><dd>${svc.length ? `${came} of the last ${svc.length} services` : 'No services recorded yet'}</dd>
    </dl>
    ${(m.history || []).length ? `<div><b class="small">Transfers</b><div class="timeline" style="margin-top:6px">${m.history.map(h => `<div class="note">${esc(branchName(h.from))} → ${esc(branchName(h.to))}<small>${fmtDate(h.date)}</small></div>`).join('')}</div></div>` : ''}
    ${showGiving ? `<div><div class="split"><b>Giving in ${year}</b><b>${naira(sum(gifts))}</b></div>${gifts.length ? `<div class="table-wrap" style="margin-top:6px"><table><tbody>${gifts.slice(0, 8).map(g => `<tr><td>${fmtShort(g.date)}</td><td>${esc(g.category)}</td><td class="num">${naira(g.amount)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small" style="margin:4px 0 0">No named giving recorded this year.</p>'}</div>` : ''}`;
  const foot = `${canEdit ? `<button class="btn danger left" data-act="deleteMember" data-id="${esc(id)}">Delete</button>` : ''}
    ${showGiving && gifts.length ? `<button class="btn" data-act="statement" data-id="${esc(id)}">${icon('copy', 15)} Giving statement</button>` : ''}
    ${waBtn(m.phone || m.guardianPhone, fillTpl('Hello {first_name}, ', m))}
    ${canEdit ? `<button class="btn primary" data-act="editMember" data-id="${esc(id)}">Edit</button>` : ''}`;
  openModal(fullName(m), body, foot, { noFocus: true });
}
function memberForm(id) {
  const m = id ? D.members[id] : { status: 'Member', joined: today(), branchId: curBranchId() }; const st = ST();
  const opt = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const body = `<input type="hidden" name="id" value="${esc(id || '')}">
   <div class="form-grid">
    <div class="field"><label for="f-first">First name *</label><input class="input" id="f-first" name="first" value="${esc(m.first || '')}" autocomplete="off"></div>
    <div class="field"><label for="f-last">Surname</label><input class="input" id="f-last" name="last" value="${esc(m.last || '')}" autocomplete="off"></div>
    <div class="field"><label for="f-phone">Phone *</label><input class="input" id="f-phone" name="phone" inputmode="tel" value="${esc(m.phone || '')}" placeholder="0803 123 4567"></div>
    <div class="field"><label for="f-gender">Gender</label><select class="input" id="f-gender" name="gender"><option value="">—</option>${opt(['Male', 'Female'], m.gender)}</select></div>
    <div class="field"><label for="f-status">Status</label><select class="input" id="f-status" name="status">${opt(STATUSES, m.status)}</select></div>
    <div class="field"><label for="f-dob">Birthday</label><input class="input" type="date" id="f-dob" name="dob" value="${esc(m.dob || '')}"></div>
    <div class="field"><label for="f-ann">Wedding anniversary</label><input class="input" type="date" id="f-ann" name="anniversary" value="${esc(m.anniversary || '')}"></div>
    <div class="field"><label for="f-joined">Date joined</label><input class="input" type="date" id="f-joined" name="joined" value="${esc(m.joined || '')}"></div>
    <div class="field"><label for="f-house">Household / family</label><input class="input" id="f-house" name="household" list="households" value="${esc(m.household || '')}" placeholder="e.g. Adeyemi family"><datalist id="households">${[...new Set(all('members').map(x => x.household).filter(Boolean))].map(h => `<option value="${esc(h)}">`).join('')}</datalist></div>
    <div class="field"><label for="f-cell">Cell / house fellowship</label><input class="input" id="f-cell" name="cell" value="${esc(m.cell || '')}"></div>
    <div class="field"><label for="f-email">Email</label><input class="input" id="f-email" name="email" type="email" value="${esc(m.email || '')}"></div>
    <div class="field"><label for="f-occ">Occupation</label><input class="input" id="f-occ" name="occupation" value="${esc(m.occupation || '')}"></div>
    ${isMulti() ? `<div class="field"><label for="f-branch">Branch</label><select class="input" id="f-branch" name="branchId">${branches().map(b => `<option value="${esc(b.id)}" ${(m.branchId || 'main') === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>` : ''}
   </div>
   <div class="field"><label for="f-addr">Address</label><input class="input" id="f-addr" name="address" value="${esc(m.address || '')}"></div>
   <div class="field"><span class="lbl">Departments</span><div class="checks">${st.departments.map(d => `<label><input type="checkbox" name="depts" value="${esc(d)}" ${(m.depts || []).includes(d) ? 'checked' : ''}>${esc(d)}</label>`).join('')}</div></div>
   <div class="field"><span class="lbl">Child record</span><div class="checks"><label><input type="checkbox" name="isChild" value="1" ${m.isChild ? 'checked' : ''}>This is a child (under 13)</label></div></div>
   <div class="form-grid">
    <div class="field"><label for="f-gname">Guardian name (children)</label><input class="input" id="f-gname" name="guardianName" value="${esc(m.guardianName || '')}"></div>
    <div class="field"><label for="f-gphone">Guardian phone (children)</label><input class="input" id="f-gphone" name="guardianPhone" inputmode="tel" value="${esc(m.guardianPhone || '')}"></div>
    <div class="field"><label for="f-allergy">Allergy or special care</label><input class="input" id="f-allergy" name="allergy" value="${esc(m.allergy || '')}" placeholder="e.g. Peanuts"></div>
   </div>`;
  formModal('member', id ? 'Edit ' + fullName(m) : 'Add member', body, id ? 'Save changes' : 'Add member', { wide: true });
}

/* ---------- Attendance ---------- */
V.attendance = () => {
  const st = ST(); const mainType = st.serviceTypes[0];
  const svcs = all('services').filter(inBranch).sort(byDateDesc);
  const sundays = svcs.filter(s => s.type === mainType);
  const avg4 = sundays.length ? Math.round(sum(sundays.slice(0, 4), s => s.total) / Math.min(4, sundays.length)) : 0;
  const last = sundays[0];
  const abs = absentees();
  const trend = sundays.slice(0, 12).reverse().map(s => ({ l: fmtShort(s.date), v: s.total || 0 }));
  const canMsg = roleAllows('comms') || roleAllows('followup');
  return `<div class="page-head"><div><h1 class="page">Attendance</h1><p class="sub">Tick names, scan in, or enter a headcount for each service.</p></div>
    <div class="actions"><button class="btn primary" data-act="newService">${icon('check', 16)} Record attendance</button></div></div>
  <div class="grid kpis">
    ${kpi(`Average ${mainType.toLowerCase()}`, num(avg4), 'Last 4 services')}
    ${kpi('Last service', last ? num(last.total) : '—', last ? `${num(last.men)} men · ${num(last.women)} women · ${num(last.children)} children` : 'Nothing recorded yet')}
    ${kpi('First-timers last service', last ? num(last.firstTimers) : '—', last ? fmtDate(last.date) : '')}
    ${kpi('Missing 3 in a row', num(abs.length), abs.length ? '<span class="down">Reach out this week</span>' : '<span class="up">No one</span>')}
  </div>
  <div class="grid cols-2 gap">
    <section class="panel"><h2>${esc(mainType)} trend</h2>${lineChart(trend, { fmt: v => num(v), label: 'Attendance trend' })}</section>
    <section class="panel"><h2>Missed the last 3 services <span class="muted">${num(abs.length)} people</span></h2>
      ${abs.length ? `<div class="list">${abs.slice(0, 10).map(a => { const contacted = a.m.lastContacted && daysBetween(a.m.lastContacted, today()) <= 7; return `<div class="row"><span class="grow">${who(a.m, a.last ? 'Last seen ' + fmtShort(a.last) : 'Not seen in recorded services')}</span>${contacted ? pill('Contacted ' + fmtShort(a.m.lastContacted), 'ok') : `${canMsg ? waBtn(a.m.phone, fillTpl(st.templates.missed, a.m), 'Message') : ''}<button class="btn sm" data-act="markContacted" data-id="${esc(a.m.id)}">Mark contacted</button>`}</div>`; }).join('')}</div>${abs.length > 10 ? `<p class="muted small">And ${abs.length - 10} more. Use Messages → “Absentees” to reach everyone.</p>` : ''}` : emptyBox('Everyone active has attended at least one of the last three services.')}
    </section>
  </div>
  <section class="panel gap"><h2>Recorded services</h2>
    ${svcs.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Service</th><th class="hide-sm">How</th><th class="num">Men</th><th class="num">Women</th><th class="num">Children</th><th class="num">First-timers</th><th class="num">Total</th>${isMulti() ? '<th class="hide-sm">Branch</th>' : ''}</tr></thead><tbody>
      ${svcs.slice(0, 40).map(s => `<tr class="click" data-act="editService" data-id="${esc(s.id)}"><td>${fmtDate(s.date)}</td><td>${esc(s.type)}</td><td class="hide-sm">${s.mode === 'names' ? pill('Names', 'accent') : pill('Headcount')}</td><td class="num">${num(s.men)}</td><td class="num">${num(s.women)}</td><td class="num">${num(s.children)}</td><td class="num">${num(s.firstTimers)}</td><td class="num"><b>${num(s.total)}</b></td>${isMulti() ? `<td class="hide-sm">${esc(branchName(s.branchId))}</td>` : ''}</tr>`).join('')}
    </tbody></table></div>` : emptyBox('No services recorded yet.', `<button class="btn primary" data-act="newService">Record your first service</button>`)}
  </section>`;
};
function serviceForm(id) {
  const st = ST(); const s = id ? D.services[id] : { date: today(), type: st.serviceTypes[0], mode: 'names', present: [] };
  const people = members().filter(m => !GONE.includes(m.status) && m.status !== 'Inactive').sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const present = new Set(s.present || []);
  const body = `<input type="hidden" name="id" value="${esc(id || '')}"><input type="hidden" name="mode" id="att-mode" value="${esc(s.mode)}">
    <div class="form-grid">
      <div class="field"><label for="att-date">Date</label><input class="input" type="date" id="att-date" name="date" value="${esc(s.date)}"></div>
      <div class="field"><label for="att-type">Service</label><select class="input" id="att-type" name="type">${st.serviceTypes.map(t => `<option ${t === s.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
    </div>
    <div class="seg" role="tablist"><button type="button" class="${s.mode === 'names' ? 'on' : ''}" data-act="attMode" data-mode="names">Tick names</button><button type="button" class="${s.mode === 'count' ? 'on' : ''}" data-act="attMode" data-mode="count">Headcount only</button></div>
    <div id="att-names" ${s.mode === 'names' ? '' : 'hidden'} class="stack">
      <div class="split"><input class="input search" id="att-q" placeholder="Find a name" aria-label="Find a name" style="flex:1"><b id="att-count">${present.size} present</b></div>
      <div class="check-list" id="att-list">${people.map(m => `<label class="check-row" data-name="${esc(fullName(m).toLowerCase())}"><input type="checkbox" name="present" value="${esc(m.id)}" ${present.has(m.id) ? 'checked' : ''}><span class="grow">${esc(fullName(m))}</span>${m.status === 'First-timer' ? pill('First-timer', 'gold') : m.isChild ? pill('Child') : ''}</label>`).join('') || '<div class="empty">Add members first, or use headcount.</div>'}</div>
      <div class="panel" style="padding:12px;background:var(--surface-2);border:0"><b class="small">New face today?</b><div class="toolbar" style="margin:8px 0 0"><input class="input" id="ft-first" placeholder="Full name" style="flex:1 1 150px"><input class="input" id="ft-phone" placeholder="Phone" inputmode="tel" style="flex:1 1 120px"><button type="button" class="btn sm" data-act="attAddFT">${icon('plus', 14)} Add first-timer</button></div></div>
    </div>
    <div id="att-counts" ${s.mode === 'count' ? '' : 'hidden'}><div class="form-grid">
      ${[['men', 'Men'], ['women', 'Women'], ['children', 'Children'], ['firstTimers', 'Of which first-timers']].map(([k, l]) => `<div class="field"><label for="c-${k}">${l}</label><input class="input" type="number" min="0" inputmode="numeric" id="c-${k}" name="${k}" value="${s.mode === 'count' ? esc(s[k] || 0) : ''}"></div>`).join('')}
    </div><p class="muted small">Use headcount for large services or when the list isn’t up to date.</p></div>`;
  formModal('service', id ? 'Edit attendance' : 'Record attendance', body, 'Save attendance', { wide: true, left: id ? `<button class="btn danger left" data-act="deleteService" data-id="${esc(id)}">Delete</button>` : '' });
}

/* ---------- First-timers & follow-up ---------- */
V.followup = () => {
  const list = members().filter(m => m.followUp);
  const mNow = thisMonth();
  const recent = list.filter(m => daysBetween(m.followUp.visited || today(), today()) <= 90);
  const contacted = recent.filter(m => m.followUp.contactedAt);
  const fast = contacted.filter(m => daysBetween(m.followUp.visited, m.followUp.contactedAt) <= 3);
  const conv = recent.filter(m => ['Member', 'Department'].includes(m.followUp.stage));
  const cols = STAGES.map(stage => {
    const items = list.filter(m => m.followUp.stage === stage && !(stage === 'Department' && daysBetween(m.followUp.movedAt || m.followUp.visited, today()) > 60)).sort((a, b) => (a.followUp.due || '9').localeCompare(b.followUp.due || '9'));
    return `<div class="col"><h3>${esc(stage)} <span class="pill">${items.length}</span></h3>${items.map(m => {
      const f = m.followUp; const od = f.due && !['Member', 'Department'].includes(stage) ? daysBetween(today(), f.due) : null;
      const dueP = od === null ? '' : od < 0 ? pill(`${-od}d overdue`, 'bad') : od === 0 ? pill('Due today', 'warn') : pill('Due ' + fmtShort(f.due));
      return `<div class="card" data-act="openFT" data-id="${esc(m.id)}" role="button" tabindex="0"><b>${esc(fullName(m))}</b><div class="meta">Visited ${fmtShort(f.visited)}${f.assignee ? ' · ' + esc(f.assignee) : ' · <span class="down">Unassigned</span>'}</div><div class="card-foot">${dueP || '<span></span>'}${stage !== 'Department' ? `<button class="btn sm" data-act="ftNext" data-id="${esc(m.id)}" title="Move to ${esc(STAGES[STAGES.indexOf(stage) + 1])}">Next ${icon('arrow', 14)}</button>` : ''}</div></div>`;
    }).join('') || '<p class="muted small" style="margin:4px">No one here.</p>'}</div>`;
  }).join('');
  return `<div class="page-head"><div><h1 class="page">First-timers & follow-up</h1><p class="sub">Every visitor gets a person, a due date and a next step.</p></div>
    <div class="actions"><button class="btn primary" data-act="newFirstTimer">${icon('plus', 16)} Add first-timer</button></div></div>
  <div class="grid kpis">
    ${kpi('First-timers this month', num(list.filter(m => monthOf(m.followUp.visited) === mNow).length), '')}
    ${kpi('Contacted within 72 hours', recent.length ? Math.round(fast.length / recent.length * 100) + '%' : '—', 'Target 80% · last 90 days')}
    ${kpi('Became members', recent.length ? Math.round(conv.length / recent.length * 100) + '%' : '—', `${conv.length} of ${recent.length} in the last 90 days`)}
    ${kpi('Due or overdue', num(followDue().length), '')}
  </div>
  <section class="panel gap"><h2>Follow-up pipeline <span class="muted">tap a card for details and notes</span></h2><div class="board">${cols}</div></section>`;
};
function firstTimerForm() {
  const workers = members().filter(m => ['Worker', 'Minister'].includes(m.status)).map(fullName);
  const body = `<div class="form-grid">
      <div class="field"><label for="n-first">First name *</label><input class="input" id="n-first" name="first"></div>
      <div class="field"><label for="n-last">Surname</label><input class="input" id="n-last" name="last"></div>
      <div class="field"><label for="n-phone">Phone *</label><input class="input" id="n-phone" name="phone" inputmode="tel"></div>
      <div class="field"><label for="n-gender">Gender</label><select class="input" id="n-gender" name="gender"><option value="">—</option><option>Male</option><option>Female</option></select></div>
      <div class="field"><label for="n-date">Date visited</label><input class="input" type="date" id="n-date" name="visited" value="${today()}"></div>
      <div class="field"><label for="n-inv">Invited by</label><input class="input" id="n-inv" name="invitedBy" list="all-names"></div>
      <div class="field"><label for="n-heard">How they heard</label><select class="input" id="n-heard" name="heardVia"><option value="">—</option><option>Invited by a member</option><option>Walked in</option><option>Social media</option><option>Outreach / crusade</option><option>Radio / flyer</option></select></div>
      <div class="field"><label for="n-assign">Assign follow-up to</label><input class="input" id="n-assign" name="assignee" list="workers"></div>
    </div>
    <datalist id="workers">${workers.map(w => `<option value="${esc(w)}">`).join('')}</datalist><datalist id="all-names">${members().map(m => `<option value="${esc(fullName(m))}">`).join('')}</datalist>
    <div class="field"><label for="n-addr">Address / area</label><input class="input" id="n-addr" name="address"></div>
    <div class="field"><label for="n-prayer">Prayer request (visible to pastors and follow-up)</label><textarea class="input" id="n-prayer" name="prayer" rows="3"></textarea></div>`;
  formModal('firsttimer', 'Add first-timer', body, 'Add and start follow-up', { wide: true });
}
function ftModal(id) {
  const m = D.members[id]; if (!m || !m.followUp) return; const f = m.followUp; const st = ST();
  const workers = members().filter(x => ['Worker', 'Minister'].includes(x.status)).map(fullName);
  const body = `<input type="hidden" name="id" value="${esc(id)}">
    <div class="split">${who(m, esc(m.phone || 'No phone'))}${waBtn(m.phone, fillTpl(st.templates.welcome, m), 'Send welcome')}</div>
    <dl class="dl"><dt>Visited</dt><dd>${fmtDate(f.visited)}</dd>${f.invitedBy ? `<dt>Invited by</dt><dd>${esc(f.invitedBy)}</dd>` : ''}${f.heardVia ? `<dt>Heard via</dt><dd>${esc(f.heardVia)}</dd>` : ''}${m.address ? `<dt>Address</dt><dd>${esc(m.address)}</dd>` : ''}${f.prayer ? `<dt>Prayer request</dt><dd>${esc(f.prayer)}</dd>` : ''}${f.contactedAt ? `<dt>First contacted</dt><dd>${fmtDate(f.contactedAt)} (${daysBetween(f.visited, f.contactedAt)} days after visit)</dd>` : ''}</dl>
    <div class="form-grid">
      <div class="field"><label for="u-stage">Stage</label><select class="input" id="u-stage" name="stage">${STAGES.map(s => `<option ${s === f.stage ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label for="u-assign">Assigned to</label><input class="input" id="u-assign" name="assignee" list="workers2" value="${esc(f.assignee || '')}"><datalist id="workers2">${workers.map(w => `<option value="${esc(w)}">`).join('')}</datalist></div>
      <div class="field"><label for="u-due">Next follow-up due</label><input class="input" type="date" id="u-due" name="due" value="${esc(f.due || '')}"></div>
      <div class="field"><label for="u-dept">Department (last stage)</label><select class="input" id="u-dept" name="dept"><option value="">—</option>${st.departments.map(d => `<option ${(m.depts || []).includes(d) ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label for="u-note">Add a note</label><textarea class="input" id="u-note" name="note" rows="2" placeholder="e.g. Called, she’ll come with her sister next Sunday"></textarea></div>
    ${(f.notes || []).length ? `<div class="timeline">${f.notes.slice().reverse().map(n => `<div class="note">${esc(n.text)}<small>${fmtDate(n.date)} · ${esc(n.by || '')}</small></div>`).join('')}</div>` : '<p class="muted small" style="margin:0">No notes yet.</p>'}`;
  formModal('followup', 'Follow-up: ' + fullName(m), body, 'Save', { wide: true, noFocus: true, left: `<button class="btn danger" data-act="deleteMember" data-id="${esc(id)}">Delete</button><button class="btn left" data-act="openMember" data-id="${esc(id)}">Full profile</button>` });
}
