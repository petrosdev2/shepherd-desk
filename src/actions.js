/* ---------- Rendering ---------- */
let rq = 0, deferred = false, qT = 0;
function scheduleRender() { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; render(); }); }
function render() {
  const app = $('#app'); const a = document.activeElement;
  if (a && app.contains(a) && a.matches('input,textarea,select') && a.closest('form[data-form]') && !a.hasAttribute('data-ui')) { deferred = true; return; }
  const id = a && app.contains(a) ? a.id : ''; let s = null, e = null;
  try { s = a.selectionStart; e = a.selectionEnd; } catch (_) { /* not a text field */ }
  app.innerHTML = shell();
  if (id) { const el = document.getElementById(id); if (el && app.contains(el)) { el.focus({ preventScroll: true }); try { if (s != null) el.setSelectionRange(s, e); } catch (_) { /* ignore */ } } }
}
document.addEventListener('focusout', () => { if (deferred) { deferred = false; setTimeout(scheduleRender, 0); } });

/* ---------- Helpers for handlers ---------- */
const A = {}, F = {};
function formObj(f) { const o = {}; new FormData(f).forEach((v, k) => { o[k] = typeof v === 'string' ? v : ''; }); return o; }
const val = (o, k) => String(o[k] || '').trim();
const money = v => parseFloat(String(v || '').replace(/[₦,\s]/g, '')) || 0;
let PENDING = null;
function confirmBox(title, msgHtml, label, fn, danger = true) { PENDING = fn; openModal(title, `<p style="margin:0">${msgHtml}</p>`, `<button class="btn" data-act="closeModal">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-act="confirmYes">${esc(label)}</button>`, { noFocus: true }); }
const splitName = n => { const p = String(n || '').trim().split(/\s+/); return { first: p[0] || '', last: p.slice(1).join(' ') }; };
const roleLabel = () => (ROLES[S.role] || ROLES.admin).label;

A.closeModal = () => closeModal();
A.confirmYes = async () => { const fn = PENDING; PENDING = null; closeModal(); if (fn) await fn(); };
A.submitModal = () => { const f = $('#mf'); if (f) f.requestSubmit(); };
A.toggleNav = () => { S.navOpen = !S.navOpen; render(); };
A.goto = el => { S.route = el.dataset.route; if (el.dataset.tab) S.gTab = el.dataset.tab; S.navOpen = false; savePrefs(); closeModal(); render(); window.scrollTo(0, 0); };
A.copyFrom = el => { const t = $(el.dataset.src); if (t) copyText(t.value); };
A.copyExport = () => copyText($('#exp-text').value);
A.copyCode = () => { if (typeof STORE !== 'undefined' && STORE) copyText(STORE.user.joinCode); };
A.signOut = () => { if (typeof STORE === 'undefined' || !STORE) return; confirmBox('Sign out?', 'You can sign back in with your email and password. Nothing is lost.', 'Sign out', () => STORE.signOut(), false); };

/* ---------- Setup & settings ---------- */
F.setup = async f => {
  const o = formObj(f); if (!val(o, 'name')) return formErr('Enter your church’s name.');
  const multi = o.branches === 'yes';
  await saveSettings({ name: val(o, 'name'), mainBranch: val(o, 'mainBranch') || 'Main church', pastor: val(o, 'pastor'), address: val(o, 'address'), plan: multi ? 'network' : 'starter', multiBranch: multi, team: [{ name: val(o, 'pastor') || 'Church admin', role: 'admin' }] });
  S.route = multi ? 'branches' : 'dashboard'; S.role = 'admin'; savePrefs(); toast(multi ? 'Your church is set up. Add your branches next.' : 'Your church is set up');
};
F.profile = async f => { const o = formObj(f); if (!val(o, 'name')) return toast('Church name can’t be empty.', 'bad'); await saveSettings({ name: val(o, 'name'), mainBranch: val(o, 'mainBranch') || 'Main church', pastor: val(o, 'pastor'), address: val(o, 'address') }); toast('Profile saved'); };
F.lists = async f => {
  const o = formObj(f); const patch = {};
  for (const k of ['departments', 'serviceTypes', 'incomeCats', 'expenseCats']) { const arr = [...new Set(String(o[k] || '').split('\n').map(x => x.trim()).filter(Boolean))]; if (!arr.length) return toast('Each list needs at least one item.', 'bad'); patch[k] = arr; }
  await saveSettings(patch); toast('Lists saved');
};
F.templates = async f => { const o = formObj(f); const t = {}; Object.keys(TEMPLATE_NAMES).forEach(k => t[k] = val(o, k) || DEFAULT_SETTINGS.templates[k]); await saveSettings({ templates: t }); S.cText = ''; toast('Templates saved'); };
F.team = async f => {
  const o = formObj(f); if (!val(o, 'name')) return toast('Enter the team member’s name.', 'bad');
  const team = clone(ST().team || []); if (team.length >= plan().admins) return toast(`The ${plan().name} plan includes ${plan().admins} admin seat${plan().admins === 1 ? '' : 's'}. Upgrade for more.`, 'bad');
  team.push({ name: val(o, 'name'), phone: val(o, 'phone'), role: o.role || 'secretary' }); await saveSettings({ team }); audit('Team member added', `${val(o, 'name')} as ${ROLES[o.role] ? ROLES[o.role].label : o.role}`); toast('Team member added');
};
A.removeTeam = async el => { const team = clone(ST().team || []); const [x] = team.splice(+el.dataset.i, 1); await saveSettings({ team }); if (x) audit('Team member removed', x.name); };
A.switchPlan = el => {
  const k = el.dataset.plan; const target = PLANS[k]; const st = ST(); const cur = PLANS[st.plan] || PLANS.starter;
  const count = all('members').filter(m => !GONE.includes(m.status)).length;
  if (target.fam === 'multi' && !st.multiBranch) {
    return confirmBox('Switch on branches?', `<b>${esc(st.name)}</b> becomes the HQ (main branch) and all existing records stay with it. You’ll get the HQ dashboard, remittance tracking and member transfers on the <b>${esc(target.name)}</b> plan.`, 'Switch on branches', async () => {
      await saveSettings({ plan: k, multiBranch: true }); audit('Plan changed', `${cur.name} → ${target.name}`); S.branch = 'all'; S.route = 'branches'; savePrefs(); render(); toast('Branch features are on. Add your first branch.');
      setTimeout(() => branchForm(), 200);
    }, false);
  }
  if (target.fam === 'single' && st.multiBranch) {
    if (all('branches').length) return toast('Remove your other branches first. Then you can switch back to a single-church plan.', 'bad');
  }
  const over = count > target.limit;
  confirmBox(`Switch to ${target.name}?`, `${over ? `<b>You have ${num(count)} members, above this plan’s ${num(target.limit)} limit.</b> Nothing is deleted, but you’ll be asked to upgrade. ` : ''}Features not included in ${esc(target.name)} will be locked. All records are kept.`, 'Switch plan', async () => {
    await saveSettings({ plan: k, multiBranch: target.fam === 'multi' }); audit('Plan changed', `${cur.name} → ${target.name}`); toast(`You’re now on the ${target.name} plan`);
  }, false);
};
A.exportAll = () => download('shepherd-desk-export.json', JSON.stringify(D, null, 2), 'application/json');
A.clearExample = () => {
  const n = COLS.filter(c => c !== 'settings').reduce((a, c) => a + all(c).filter(x => x.example).length, 0);
  confirmBox('Clear example data?', `This permanently deletes the <b>${num(n)} example records</b> (members, services, giving and more). Your church profile, plan, team and lists stay.`, 'Clear example data', async () => {
    toast('Clearing example records…');
    for (const c of COLS) { if (c === 'settings') continue; for (const x of all(c).filter(r => r.example)) await del(c, x.id); }
    await saveSettings({ example: false }); audit('Example data cleared', `${n} records`); toast('Example data cleared. You’re ready to add your own records.');
  });
};

/* ---------- Members ---------- */
A.openMember = el => showMember(el.dataset.id);
A.newMember = () => memberForm();
A.editMember = el => memberForm(el.dataset.id);
F.member = async f => {
  const o = formObj(f); if (!val(o, 'first')) return formErr('Enter a first name.');
  const isChild = !!f.querySelector('[name=isChild]:checked');
  if (!val(o, 'phone') && !isChild) return formErr('Enter a phone number so the church can reach them.');
  const prev = o.id ? D.members[o.id] : null; const ph = intlPhone(o.phone);
  if (ph && !isChild && !f.dataset.dupOk) { const dup = all('members').find(x => x.id !== o.id && !x.isChild && intlPhone(x.phone) === ph); if (dup) { f.dataset.dupOk = '1'; return formErr(`${fullName(dup)} already uses this number. Press Save again to keep both.`); } }
  const m = prev ? clone(prev) : { id: uid(), branchId: curBranchId() };
  ['first', 'last', 'phone', 'gender', 'status', 'dob', 'anniversary', 'joined', 'household', 'cell', 'email', 'occupation', 'address', 'guardianName', 'guardianPhone', 'allergy'].forEach(k => m[k] = val(o, k));
  m.depts = $$('[name=depts]:checked', f).map(x => x.value); m.isChild = isChild;
  if (o.branchId && o.branchId !== (m.branchId || 'main')) {
    if (prev) { m.history = [...(m.history || []), { date: today(), from: m.branchId || 'main', to: o.branchId }]; audit('Member transferred', `${fullName(m)}: ${branchName(m.branchId)} → ${branchName(o.branchId)}`); }
    m.branchId = o.branchId;
  }
  if (m.status === 'First-timer' && !m.followUp) m.followUp = { stage: 'First visit', visited: m.joined || today(), due: addDays(m.joined || today(), 2), notes: [] };
  if (prev && prev.status !== m.status && ['Deceased', 'Relocated'].includes(m.status)) audit('Member status changed', `${fullName(m)} → ${m.status}`);
  if (!prev) { const lim = plan().limit; if (all('members').filter(x => !GONE.includes(x.status)).length >= lim) toast(`You’ve passed the ${plan().name} plan’s ${num(lim)}-member limit. Upgrade in Settings to stay within your plan.`, 'bad'); }
  closeModal(); await put('members', m); toast(prev ? 'Changes saved' : `${fullName(m)} added`);
};
A.deleteMember = el => { const m = D.members[el.dataset.id]; if (!m) return; confirmBox('Delete this member?', `This removes <b>${esc(fullName(m))}</b> and their follow-up notes. Past giving and attendance totals stay. To keep their history, set their status to Relocated or Inactive instead.`, 'Delete member', async () => { S.sel.delete(m.id); await del('members', m.id); audit('Member deleted', fullName(m)); toast(`${fullName(m)} deleted`); }); };
A.selMember = (el, e) => { const cb = el.querySelector('input'); if (e.target !== cb) cb.checked = !cb.checked; if (cb.checked) S.sel.add(el.dataset.id); else S.sel.delete(el.dataset.id); render(); };
A.selAll = (el, e) => { const cb = el.querySelector('input'); if (e.target !== cb) cb.checked = !cb.checked; const ids = $$('td.sel-cell[data-id]').map(td => td.dataset.id); ids.forEach(id => cb.checked ? S.sel.add(id) : S.sel.delete(id)); render(); };
A.clearSel = () => { S.sel.clear(); render(); };
A.bulkDelete = () => {
  const list = [...S.sel].map(id => D.members[id]).filter(Boolean); if (!list.length) return;
  const names = list.slice(0, 5).map(m => esc(fullName(m))).join(', ') + (list.length > 5 ? ` and ${list.length - 5} more` : '');
  confirmBox(`Delete ${list.length} member${list.length === 1 ? '' : 's'}?`, `This permanently removes <b>${names}</b> and their follow-up notes. Past giving and attendance totals stay. To keep someone’s history, set their status to Relocated or Inactive instead.`, `Delete ${list.length}`, async () => {
    S.sel.clear(); toast(`Deleting ${list.length} members…`);
    for (const m of list) await del('members', m.id);
    audit('Members deleted', `${list.length}: ${list.map(fullName).slice(0, 10).join(', ')}${list.length > 10 ? '…' : ''}`); toast(`${list.length} member${list.length === 1 ? '' : 's'} deleted`);
  });
};
A.statement = el => {
  const m = D.members[el.dataset.id]; const st = ST(); const year = today().slice(0, 4);
  const gifts = all('income').filter(i => i.memberId === m.id && (i.date || '').startsWith(year)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const t = `${st.name}\nGIVING STATEMENT, ${year}\n${fullName(m)}\n\n${gifts.map(g => `${fmtDate(g.date)}  ${g.category}  ${naira(g.amount)}`).join('\n')}\n\nTotal: ${naira(sum(gifts))}\n\nThank you for your faithful giving.`;
  openModal('Giving statement', `<textarea class="input" id="st-text" rows="12" readonly>${esc(t)}</textarea>`, `<button class="btn" data-act="copyFrom" data-src="#st-text">${icon('copy', 15)} Copy</button>${waBtn(m.phone, t, 'Send on WhatsApp')}`);
};
A.exportMembers = () => {
  const rows = [['First name', 'Surname', 'Phone', 'Gender', 'Status', 'Birthday', 'Anniversary', 'Departments', 'Household', 'Cell', 'Email', 'Address', 'Joined', 'Branch', 'Child', 'Allergy']];
  members().sort((a, b) => fullName(a).localeCompare(fullName(b))).forEach(m => rows.push([m.first, m.last, m.phone, m.gender, m.status, m.dob, m.anniversary, (m.depts || []).join('; '), m.household, m.cell, m.email, m.address, m.joined, branchName(m.branchId), m.isChild ? 'Yes' : '', m.allergy]));
  download(`members-${today()}.csv`, toCSV(rows));
};
let IMPORT = [];
A.importMembers = () => {
  if (!has('import')) return openModal('Import members', gate('import', 'Importing from Excel'));
  openModal('Import members from Excel', `<p class="muted" style="margin:0">In Excel, save your list as <b>CSV</b>, then choose the file or paste its contents below. The first row must be column names, such as <i>First name, Surname, Phone, Gender, Birthday, Department</i>.</p>
    <input type="file" id="imp-file" accept=".csv,text/csv" class="input"><textarea class="input" id="imp-text" rows="7" placeholder="First name,Surname,Phone,Gender&#10;Grace,Adeyemi,08031234567,Female"></textarea><div id="imp-sum"></div>`,
    `<button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" data-act="previewImport">Check file</button>`, { wide: true });
};
const COLMAP = { first: ['first name', 'firstname', 'first', 'given name', 'other names'], last: ['last name', 'surname', 'lastname', 'last', 'family name'], name: ['name', 'full name', 'fullname', 'member name'], phone: ['phone', 'phone number', 'mobile', 'telephone', 'gsm', 'whatsapp', 'phone no'], gender: ['gender', 'sex'], dob: ['dob', 'date of birth', 'birthday', 'birth date'], email: ['email', 'e-mail', 'email address'], address: ['address', 'home address'], depts: ['department', 'departments', 'unit', 'units'], status: ['status', 'membership status'], household: ['household', 'family'] };
function normDate(s) { s = String(s || '').trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : ''; }
A.previewImport = async () => {
  const file = $('#imp-file').files[0]; let text = $('#imp-text').value;
  if (file) text = await file.text();
  const rows = parseCSV(text || ''); const out = $('#imp-sum');
  if (rows.length < 2) { out.innerHTML = '<p class="err">Add a header row and at least one member.</p>'; return; }
  const head = rows[0].map(h => h.trim().toLowerCase()); const idx = {};
  Object.entries(COLMAP).forEach(([k, names]) => { const i = head.findIndex(h => names.includes(h)); if (i >= 0) idx[k] = i; });
  if (idx.first === undefined && idx.name === undefined) { out.innerHTML = '<p class="err">We couldn’t find a name column. Name one column “First name” or “Name”.</p>'; return; }
  const existing = new Set(all('members').map(m => intlPhone(m.phone)).filter(Boolean)); const st = ST();
  IMPORT = []; let dups = 0;
  rows.slice(1).forEach(r => {
    const g = k => idx[k] === undefined ? '' : String(r[idx[k]] || '').trim();
    let first = g('first'), last = g('last'); if (!first && g('name')) ({ first, last } = splitName(g('name')));
    if (!first) return; const ph = intlPhone(g('phone')); if (ph && existing.has(ph)) { dups++; return; } if (ph) existing.add(ph);
    const gen = g('gender').toLowerCase(); const stt = STATUSES.find(s => s.toLowerCase() === g('status').toLowerCase());
    IMPORT.push({ first, last, phone: g('phone'), gender: gen.startsWith('m') ? 'Male' : gen.startsWith('f') ? 'Female' : '', dob: normDate(g('dob')), email: g('email'), address: g('address'), household: g('household'), status: stt || 'Member', depts: g('depts').split(/[;,/]/).map(x => x.trim()).filter(d => st.departments.includes(d)), joined: today(), branchId: curBranchId() });
  });
  out.innerHTML = `<div class="banner" style="margin:0"><span class="grow"><b>${IMPORT.length} members ready to import.</b>${dups ? ` ${dups} skipped because their phone number is already on record.` : ''} Columns found: ${Object.keys(idx).join(', ')}.</span>${IMPORT.length ? `<button class="btn primary sm" data-act="doImport">Import ${IMPORT.length}</button>` : ''}</div>`;
};
A.doImport = async () => {
  const list = IMPORT; IMPORT = []; closeModal(); toast(`Importing ${list.length} members…`);
  for (const m of list) await put('members', m);
  audit('Members imported', `${list.length} records`); toast(`${list.length} members imported`);
};

/* ---------- Attendance ---------- */
A.newService = () => serviceForm();
A.editService = el => serviceForm(el.dataset.id);
A.attMode = el => { const mode = el.dataset.mode; $('#att-mode').value = mode; $('#att-names').hidden = mode !== 'names'; $('#att-counts').hidden = mode !== 'count'; $$('.seg button', el.parentNode).forEach(b => b.classList.toggle('on', b === el)); };
function updAttCount() { const c = $('#att-count'); if (c) c.textContent = $$('#att-list [name=present]:checked').length + ' present'; }
A.attAddFT = async () => {
  const nm = $('#ft-first').value.trim(); const ph = $('#ft-phone').value.trim(); if (!nm) return toast('Type the first-timer’s name.', 'bad');
  const date = $('#att-date').value || today(); const { first, last } = splitName(nm);
  const m = { id: uid(), first, last, phone: ph, status: 'First-timer', joined: date, branchId: curBranchId(), followUp: { stage: 'First visit', visited: date, due: addDays(date, 2), notes: [] } };
  const list = $('#att-list'); const empty = list.querySelector('.empty'); if (empty) empty.remove();
  list.insertAdjacentHTML('afterbegin', `<label class="check-row" data-name="${esc(nm.toLowerCase())}"><input type="checkbox" name="present" value="${esc(m.id)}" checked><span class="grow">${esc(nm)}</span>${pill('First-timer', 'gold')}</label>`);
  $('#ft-first').value = ''; $('#ft-phone').value = ''; updAttCount(); toast(`${nm} added and marked present`);
  await put('members', m);
};
F.service = async f => {
  const o = formObj(f); if (!o.date) return formErr('Pick the service date.');
  const prev = o.id ? D.services[o.id] : null; const s = prev ? clone(prev) : { id: uid(), branchId: curBranchId() };
  s.date = o.date; s.type = o.type; s.mode = o.mode;
  if (s.mode === 'names') {
    const ids = $$('[name=present]:checked', f).map(x => x.value); if (!ids.length) return formErr('Tick at least one name, or switch to headcount.');
    const ms = ids.map(id => D.members[id]).filter(Boolean);
    s.present = ids; s.children = ms.filter(m => m.isChild).length; s.men = ms.filter(m => !m.isChild && m.gender === 'Male').length; s.women = ms.filter(m => !m.isChild && m.gender === 'Female').length;
    s.firstTimers = ms.filter(m => m.status === 'First-timer' || (m.followUp && m.followUp.visited === s.date)).length; s.total = ids.length;
  } else {
    s.present = []; ['men', 'women', 'children', 'firstTimers'].forEach(k => s[k] = Math.max(0, parseInt(o[k], 10) || 0)); s.total = s.men + s.women + s.children;
    if (!s.total) return formErr('Enter at least one count.');
  }
  const dup = all('services').find(x => x.id !== s.id && x.date === s.date && x.type === s.type && (x.branchId || 'main') === (s.branchId || 'main'));
  if (dup) return formErr(`${s.type} on ${fmtDate(s.date)} is already recorded. Open it from the list to edit it.`);
  closeModal(); await put('services', s); toast(`Attendance saved: ${num(s.total)} people`);
};
A.deleteService = el => { const s = D.services[el.dataset.id]; confirmBox('Delete this attendance record?', `${esc(s.type)} on ${fmtDate(s.date)} (${num(s.total)} people) will be removed.`, 'Delete', async () => { await del('services', s.id); toast('Attendance record deleted'); }); };
A.markContacted = async el => { const m = clone(D.members[el.dataset.id]); m.lastContacted = today(); await put('members', m); toast(`Marked ${fullName(m)} as contacted`); };

/* ---------- First-timers ---------- */
A.newFirstTimer = () => firstTimerForm();
A.openFT = el => ftModal(el.dataset.id);
F.firsttimer = async f => {
  const o = formObj(f); if (!val(o, 'first')) return formErr('Enter a first name.'); if (!val(o, 'phone')) return formErr('Enter a phone number for follow-up.');
  const visited = o.visited || today();
  const m = { id: uid(), first: val(o, 'first'), last: val(o, 'last'), phone: val(o, 'phone'), gender: o.gender || '', address: val(o, 'address'), status: 'First-timer', joined: visited, branchId: curBranchId(), depts: [],
    followUp: { stage: 'First visit', visited, due: addDays(visited, 2), assignee: val(o, 'assignee'), invitedBy: val(o, 'invitedBy'), heardVia: o.heardVia || '', prayer: val(o, 'prayer'), notes: [] } };
  closeModal(); await put('members', m); toast(`${fullName(m)} added. Follow-up due ${fmtShort(m.followUp.due)}.`);
};
function applyStage(m, stage) {
  const f = m.followUp; if (f.stage === 'First visit' && stage !== 'First visit' && !f.contactedAt) f.contactedAt = today();
  f.stage = stage; f.movedAt = today();
  if (['Member', 'Department'].includes(stage)) { if (m.status === 'First-timer') m.status = 'Member'; f.due = ''; } else f.due = addDays(today(), stage === 'Contacted' ? 5 : 7);
  f.notes = [...(f.notes || []), { date: today(), text: 'Moved to ' + stage, by: roleLabel() }];
}
A.ftNext = async el => { const m = clone(D.members[el.dataset.id]); const i = STAGES.indexOf(m.followUp.stage); const next = STAGES[Math.min(i + 1, STAGES.length - 1)]; applyStage(m, next); await put('members', m); toast(`${fullName(m)} moved to ${next}`); };
F.followup = async f => {
  const o = formObj(f); const m = clone(D.members[o.id]); const fu = m.followUp; const stageChanged = o.stage !== fu.stage;
  if (stageChanged) applyStage(m, o.stage); else if (!['Member', 'Department'].includes(fu.stage)) fu.due = o.due || '';
  fu.assignee = val(o, 'assignee');
  if (o.dept && !(m.depts || []).includes(o.dept)) m.depts = [...(m.depts || []), o.dept];
  if (val(o, 'note')) fu.notes = [...(fu.notes || []), { date: today(), text: val(o, 'note'), by: roleLabel() }];
  if (val(o, 'note') && fu.stage === 'First visit') { fu.contactedAt = fu.contactedAt || today(); }
  closeModal(); await put('members', m); toast('Follow-up saved');
};

/* ---------- Giving ---------- */
A.gTab = el => { S.gTab = el.dataset.tab; render(); };
A.newIncome = () => incomeForm();
A.editIncome = el => incomeForm(el.dataset.id);
F.income = async f => {
  const o = formObj(f); const amt = money(o.amount); if (amt <= 0) return formErr('Enter the amount in naira.'); if (!o.date) return formErr('Pick a date.');
  let mem = null; if (val(o, 'member')) { mem = all('members').find(m => fullName(m).toLowerCase() === val(o, 'member').toLowerCase()); if (!mem) return formErr(`No member called “${val(o, 'member')}”. Pick a name from the list, or leave it blank for a general collection.`); }
  const prev = o.id ? D.income[o.id] : null; const i = prev ? clone(prev) : { id: uid(), branchId: curBranchId(), source: 'manual' };
  Object.assign(i, { date: o.date, category: o.category, amount: amt, method: o.method, memberId: mem ? mem.id : '', note: val(o, 'note') });
  closeModal(); await put('income', i);
  audit(prev ? 'Giving record edited' : 'Giving recorded', `${i.category} ${naira(amt)} · ${mem ? fullName(mem) : 'general collection'}${prev && prev.amount !== amt ? ` (was ${naira(prev.amount)})` : ''}`);
  toast(prev ? 'Giving record updated' : `${naira(amt)} ${i.category.toLowerCase()} recorded`);
};
A.deleteIncome = el => { const i = D.income[el.dataset.id]; confirmBox('Delete this giving record?', `${esc(i.category)} of ${naira(i.amount)} on ${fmtDate(i.date)}. This is recorded in the activity log.`, 'Delete', async () => { await del('income', i.id); audit('Giving record deleted', `${i.category} ${naira(i.amount)} on ${fmtDate(i.date)}`); toast('Giving record deleted'); }); };
A.receipt = el => {
  const i = D.income[el.dataset.id]; const m = D.members[i.memberId]; const st = ST();
  const t = `${st.name}\nOFFICIAL RECEIPT  RCT-${i.id.slice(-6).toUpperCase()}\n\nReceived from: ${fullName(m)}\nAmount: ${naira(i.amount)}\nFor: ${i.category}\nDate: ${fmtDate(i.date)}\nMethod: ${i.method || 'Cash'}\n\nThank you for your faithful giving. God bless you.`;
  openModal('Receipt', `<textarea class="input" id="rc-text" rows="11" readonly>${esc(t)}</textarea>`, `<button class="btn" data-act="copyFrom" data-src="#rc-text">${icon('copy', 15)} Copy</button>${waBtn(m && m.phone, t, 'Send on WhatsApp')}`);
};
A.newExpense = () => expenseForm();
F.expense = async f => {
  const o = formObj(f); const amt = money(o.amount); if (amt <= 0) return formErr('Enter the amount in naira.'); if (!val(o, 'desc')) return formErr('Say what the money is for.');
  const e = { id: uid(), date: o.date || today(), category: o.category, amount: amt, desc: val(o, 'desc'), status: 'Pending', requestedBy: roleLabel(), branchId: curBranchId() };
  closeModal(); await put('expenses', e); audit('Expense requested', `${e.category} ${naira(amt)} · ${e.desc}`); toast('Expense sent for approval');
};
A.decideExp = async el => { const e = clone(D.expenses[el.dataset.id]); e.status = el.dataset.d; e.decidedBy = roleLabel(); e.decidedAt = today(); await put('expenses', e); audit(`Expense ${e.status.toLowerCase()}`, `${e.category} ${naira(e.amount)} · ${e.desc}`); toast(`Expense ${e.status.toLowerCase()}`); };
A.newCount = () => countForm();
A.editCount = el => countForm(el.dataset.id);
function recalcCount() {
  const f = $('[data-form=count]'); if (!f) return; let t = 0;
  DENOMS.forEach(d => { const n = parseInt(f.querySelector(`[name=d${d}]`).value, 10) || 0; t += n * d; const l = $('#dl-' + d); if (l) l.textContent = naira(n * d); });
  t += money(f.querySelector('[name=coins]').value); $('#cnt-total').textContent = naira(t);
}
F.count = async f => {
  const o = formObj(f); const denoms = {}; let total = 0;
  DENOMS.forEach(d => { const n = parseInt(o['d' + d], 10) || 0; if (n) denoms[d] = n; total += n * d; });
  const coins = money(o.coins); total += coins; if (total <= 0) return formErr('Enter how many of each note were counted.');
  const counters = [0, 1, 2].map(k => ({ name: val(o, 'cn' + k), signed: !!o['cs' + k] && !!val(o, 'cn' + k) }));
  const signed = counters.filter(c => c.signed).length;
  const prev = o.id ? D.counts[o.id] : null; const c = prev ? clone(prev) : { id: uid(), branchId: curBranchId(), posted: false };
  Object.assign(c, { date: o.date, service: o.service, category: o.category, denoms, coins, total, counters, status: signed >= 2 ? 'Verified' : 'Awaiting sign-off' });
  closeModal(); await put('counts', c); audit('Offering count saved', `${c.service} ${fmtDate(c.date)}: ${naira(total)}, ${signed} signatures`);
  toast(signed >= 2 ? 'Count verified. You can post it to income now.' : 'Count saved. It needs 2 counters to sign.');
};
A.deleteCount = el => { const c = D.counts[el.dataset.id]; confirmBox('Delete this count sheet?', `${esc(c.service)} on ${fmtDate(c.date)}, ${naira(c.total)}.`, 'Delete', async () => { await del('counts', c.id); audit('Count sheet deleted', `${c.service} ${fmtDate(c.date)} ${naira(c.total)}`); }); };
A.postCount = async el => {
  const c = clone(D.counts[el.dataset.id]); if (c.posted) return;
  c.posted = true; await put('counts', c);
  await put('income', { date: c.date, category: c.category, amount: c.total, method: 'Cash', note: `${c.service} count`, source: 'count', countId: c.id, branchId: c.branchId || 'main' });
  audit('Count posted to income', `${c.category} ${naira(c.total)} from ${c.service} ${fmtDate(c.date)}`); toast(`${naira(c.total)} posted to income`);
};

/* ---------- Messages ---------- */
let PREP = null;
A.prepareMsgs = () => {
  const aud = audience(S.cAud); const label = (audienceOptions().find(x => x[0] === S.cAud) || [0, 'Selected people'])[1]; const text = S.cText;
  if (!text.trim()) return toast('Write a message first.', 'bad');
  PREP = { label, text, count: aud.length, numbers: aud.map(m => m.phone || m.guardianPhone).join('\n') };
  openModal(`Send to ${label}`, `<p class="muted" style="margin:0">${num(aud.length)} people. Each message is personalised. Tap WhatsApp to open each chat with the message ready.</p>
    <div class="list">${aud.slice(0, 300).map(m => `<div class="row"><span class="grow">${who(m, esc(m.phone || m.guardianPhone))}</span>${waBtn(m.phone || m.guardianPhone, fillTpl(text, m))}</div>`).join('')}</div>`,
    `<button class="btn left" data-act="copyNumbers">${icon('copy', 15)} Copy all numbers</button><button class="btn primary" data-act="logMsgs">Mark as sent</button>`, { wide: true, noFocus: true });
};
A.copyNumbers = () => PREP && copyText(PREP.numbers);
A.logMsgs = async () => { if (!PREP) return; const p = PREP; PREP = null; closeModal(); await put('messages', { date: today(), audience: p.label, count: p.count, text: p.text, branchId: curBranchId() }); toast('Logged as sent'); };

/* ---------- Children ---------- */
A.checkInChild = () => checkInForm();
F.checkin = async f => {
  const o = formObj(f); let child = o.childId ? D.members[o.childId] : null;
  if (!child && !val(o, 'childName')) return formErr('Pick a child, or type a new child’s name.');
  if (!val(o, 'guardian')) return formErr('Enter who dropped the child off.');
  if (!child) { const { first, last } = splitName(val(o, 'childName')); child = { id: uid(), first, last, isChild: true, status: 'Member', allergy: val(o, 'allergy'), guardianName: val(o, 'guardian'), guardianPhone: val(o, 'guardianPhone'), joined: today(), branchId: curBranchId(), depts: [] }; await put('members', child); }
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const c = { date: today(), childId: child.id, childName: fullName(child), cls: o.cls, guardian: val(o, 'guardian'), guardianPhone: val(o, 'guardianPhone') || child.guardianPhone || '', code, inAt: new Date().toISOString(), branchId: curBranchId() };
  await put('checkins', c);
  const msg = `${ST().name} children’s church: ${fullName(child)} is checked in. Your pickup code is ${code}. Please show it when you collect ${child.first}.`;
  openModal('Pickup code', `<div class="code-big" aria-label="Pickup code ${code}">${code}</div><p style="margin:0">Give this code to <b>${esc(c.guardian)}</b>. ${esc(child.first)} will be released only to someone who has it.</p>${child.allergy ? `<span class="pill warn">${icon('alert', 13)} ${esc(child.allergy)}: teachers will see this</span>` : ''}`,
    `${waBtn(c.guardianPhone, msg, 'Send code on WhatsApp')}<button class="btn primary" data-act="closeModal">Done</button>`, { noFocus: true });
};
A.releaseChild = el => {
  const c = D.checkins[el.dataset.id]; const k = D.members[c.childId] || { first: c.childName };
  formModal('release', 'Release ' + fullName(k), `<input type="hidden" name="id" value="${esc(c.id)}"><div class="form-grid"><div class="field"><label for="rl-code">Pickup code</label><input class="input" id="rl-code" name="code" inputmode="numeric" maxlength="4" autocomplete="off" style="font-size:22px;letter-spacing:.2em"></div><div class="field"><label for="rl-by">Collected by</label><input class="input" id="rl-by" name="outBy" value="${esc(c.guardian || '')}"></div></div>`, 'Release child');
};
F.release = async f => {
  const o = formObj(f); const c = D.checkins[o.id];
  if (val(o, 'code') !== String(c.code)) return formErr('That code doesn’t match. Don’t release the child. Call a children’s church leader.');
  const cc = clone(c); cc.outAt = new Date().toISOString(); cc.outBy = val(o, 'outBy') || c.guardian; closeModal(); await put('checkins', cc); toast(`${c.childName} released to ${cc.outBy}`);
};

/* ---------- Reports ---------- */
A.period = el => { S.period = el.dataset.p; render(); };
A.copySummary = () => copyText($('#wk-sum').value);
A.exportAttendance = () => { const rows = [['Date', 'Service', 'Branch', 'Method', 'Men', 'Women', 'Children', 'First-timers', 'Total']]; all('services').filter(inBranch).sort(byDateDesc).forEach(s => rows.push([s.date, s.type, branchName(s.branchId), s.mode === 'names' ? 'Names' : 'Headcount', s.men, s.women, s.children, s.firstTimers, s.total])); download(`attendance-${today()}.csv`, toCSV(rows)); };
A.exportIncome = () => { const rows = [['Date', 'Category', 'Member', 'Method', 'Amount (NGN)', 'Note', 'Branch']]; all('income').filter(inBranch).sort(byDateDesc).forEach(i => rows.push([i.date, i.category, i.memberId && D.members[i.memberId] ? fullName(D.members[i.memberId]) : '', i.method, i.amount, i.note, branchName(i.branchId)])); download(`income-${today()}.csv`, toCSV(rows)); };
A.exportExpenses = () => { const rows = [['Date', 'Category', 'Description', 'Amount (NGN)', 'Status', 'Requested by', 'Decided by', 'Branch']]; all('expenses').filter(inBranch).sort(byDateDesc).forEach(e => rows.push([e.date, e.category, e.desc, e.amount, e.status, e.requestedBy, e.decidedBy, branchName(e.branchId)])); download(`expenses-${today()}.csv`, toCSV(rows)); };

/* ---------- Branches ---------- */
A.newBranch = () => branchForm();
A.editBranch = el => { if (S.role === 'admin') branchForm(el.dataset.id); };
F.branch = async f => {
  const o = formObj(f); if (!val(o, 'name')) return formErr('Enter the branch name.');
  if (o.id === 'main') { await saveSettings({ mainBranch: val(o, 'name'), address: val(o, 'location'), pastor: val(o, 'pastor') }); closeModal(); return toast('HQ details saved'); }
  const prev = o.id ? D.branches[o.id] : null; const b = prev ? clone(prev) : { id: uid(), postings: [] };
  if (val(o, 'pastor') && val(o, 'pastor') !== (prev ? prev.pastor : '')) { b.postings = [...(b.postings || []), { pastor: val(o, 'pastor'), date: today() }]; if (prev) audit('Pastor posted', `${val(o, 'pastor')} to ${val(o, 'name')}`); }
  Object.assign(b, { name: val(o, 'name'), location: val(o, 'location'), pastor: val(o, 'pastor'), phone: val(o, 'phone') });
  closeModal(); await put('branches', b); if (!prev) audit('Branch added', b.name); toast(prev ? 'Branch saved' : `${b.name} branch added`);
};
A.newRemit = () => { if (branches().length < 2) return toast('Add a branch first.', 'bad'); remitForm(); };
F.remit = async f => {
  const o = formObj(f); const amt = money(o.amount); if (amt <= 0) return formErr('Enter the amount paid.');
  const r = { branchId: o.branchId, month: o.month || thisMonth(), amount: amt, date: o.date || today(), ref: val(o, 'ref') };
  closeModal(); await put('remits', r); audit('Remittance recorded', `${branchName(r.branchId)} · ${monthLabel(r.month, true)} · ${naira(amt)}`); toast('Remittance recorded');
};
F.rates = async f => { const o = formObj(f); const rates = {}; ST().incomeCats.forEach(c => { const v = parseFloat(o[c]); if (v > 0) rates[c] = Math.min(100, v); }); await saveSettings({ remitRates: rates }); audit('Remittance rates changed', Object.entries(rates).map(([k, v]) => `${k} ${v}%`).join(', ')); toast('Rates saved'); };

/* ---------- Event wiring ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return; const fn = A[t.dataset.act]; if (!fn) return;
  if (t.tagName === 'A' || t.tagName === 'BUTTON') e.preventDefault();
  if (t.disabled) return; fn(t, e);
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault(); const fn = F[f.dataset.form]; if (!fn) return;
  try { await fn(f); } catch (err) { console.error(err); formErr('Something went wrong saving this. Try again.'); }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'att-q') { const q = el.value.trim().toLowerCase(); $$('#att-list .check-row').forEach(r => { r.hidden = !!q && !r.dataset.name.includes(q); }); return; }
  if (el.dataset && el.dataset.denom !== undefined) { recalcCount(); return; }
  const f = el.closest && el.closest('#mf'); if (f && f.dataset.dupOk && el.name === 'phone') delete f.dataset.dupOk;
  if (!el.dataset || !el.dataset.ui || el.tagName === 'SELECT' || el.type === 'month') return;
  S[el.dataset.ui] = el.value; if (el.hasAttribute('data-no-render')) return;
  clearTimeout(qT); qT = setTimeout(render, 220);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.closest && el.closest('#att-list')) { updAttCount(); return; }
  if (el.id === 'c-tpl') { S.cTpl = el.value; S.cText = ST().templates[el.value] || ''; const t = $('#c-text'); if (t) t.value = S.cText; return; }
  if (el.id === 'ch-child') { const k = D.members[el.value]; $('#ch-new').hidden = !!el.value; if (k) { $('#ch-guard').value = k.guardianName || ''; $('#ch-gphone').value = k.guardianPhone || ''; } return; }
  if (el.dataset && el.dataset.ui && (el.tagName === 'SELECT' || el.type === 'month')) {
    S[el.dataset.ui] = el.value; if (el.dataset.ui === 'role' || el.dataset.ui === 'branch') closeModal();
    render(); savePrefs();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#modal-root').hidden) closeModal(); else if (S.navOpen) { S.navOpen = false; render(); } }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.card[role=button]')) { e.preventDefault(); e.target.click(); }
});

/* ---------- Start ---------- */
async function init() {
  render();
  let db = null;
  if (typeof STORE !== 'undefined' && STORE) db = STORE;
  else { try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch (e) { db = null; } }
  if (db) {
    DB = db; MODE = 'db'; const waiting = new Set(COLS);
    const done = () => { if (!S.ready && waiting.size === 0) S.ready = true; scheduleRender(); };
    COLS.forEach(c => {
      try {
        db.collection(c).onSnapshot(snap => {
          const m = {}; snap.docs.forEach(d => { if (d.exists) m[d.id] = { ...d.data(), id: d.id }; }); D[c] = m; waiting.delete(c); done();
        }, () => { waiting.delete(c); done(); toast('Live updates paused. Reload the page to reconnect.', 'bad'); });
      } catch (e) { waiting.delete(c); }
    });
    setTimeout(() => { if (!S.ready) { S.ready = true; scheduleRender(); } }, 9000);
  } else { MODE = 'local'; loadLocal(); S.ready = true; render(); }
}
init();
