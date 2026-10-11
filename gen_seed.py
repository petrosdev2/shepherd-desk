import json, random, os, datetime as dt
random.seed(7)
TODAY = dt.date(2026, 9, 20)
iso = lambda d: d.isoformat()
OUT = '/home/claude/shepherd-desk/seed'
docs = {c: {} for c in ['settings','members','services','income','expenses','counts','messages','checkins']}
n = [0]
def nid(p):
    n[0] += 1
    return f"ex-{p}-{n[0]:03d}"
def add(col, d, id=None):
    d = dict(d); d['id'] = id or nid(col[:3]); d['example'] = True
    d.setdefault('createdAt', dt.datetime(2026, 9, 1, 9, 0).isoformat() + 'Z')
    docs[col][d['id']] = d; return d

docs['settings']['church'] = {
  'id': 'church', 'name': 'Destiny Impact Church', 'mainBranch': 'Ondo', 'address': 'Ondo, Ondo State', 'pastor': '',
  'plan': 'standard', 'multiBranch': False, 'example': True,
  'team': [{'name': 'Petros', 'role': 'admin', 'phone': ''}, {'name': 'Finance secretary', 'role': 'finance', 'phone': ''}],
}

adults = [
 ('Adebayo','Ogunleye','Male','Minister'),('Funmilayo','Ogunleye','Female','Minister'),('Olumide','Akinola','Male','Minister'),
 ('Oluwaseun','Adeyemi','Male','Worker'),('Yetunde','Adeyemi','Female','Worker'),('Chinedu','Okafor','Male','Worker'),('Ngozi','Okafor','Female','Worker'),
 ('Kehinde','Balogun','Female','Worker'),('Taiwo','Balogun','Male','Worker'),('Femi','Oladipo','Male','Worker'),('Bisola','Ajayi','Female','Worker'),
 ('Tolulope','Fashola','Female','Worker'),('Segun','Ibitoye','Male','Worker'),('Abimbola','Ojo','Female','Worker'),('Emeka','Nwosu','Male','Worker'),
 ('Grace','Akande','Female','Member'),('Samuel','Olatunji','Male','Member'),('Mary','Olatunji','Female','Member'),('Blessing','Eze','Female','Member'),
 ('Ibrahim','Salami','Male','Member'),('Folake','Adewale','Female','Member'),('Kunle','Adewale','Male','Member'),('Esther','Oyelaran','Female','Member'),
 ('Victor','Ekpo','Male','Member'),('Deborah','Afolabi','Female','Member'),('Joseph','Alabi','Male','Member'),('Ruth','Omotayo','Female','Member'),
 ('Tobi','Adeleke','Male','Member'),('Damilola','Oke','Female','Member'),('Peter','Obi-Johnson','Male','Member'),('Comfort','Idowu','Female','Member'),
 ('Gbenga','Aro','Male','Member'),('Janet','Olowu','Female','Member'),('Michael','Dada','Male','Member'),
 ('Sade','Ayodele','Female','Regular attender'),('Kayode','Fagbemi','Male','Regular attender'),('Lola','Osho','Female','Regular attender'),
 ('Rotimi','Ige','Male','Inactive'),
]
depts = ['Choir','Ushers','Media','Children','Protocol','Prayer','Sanctuary','Evangelism','Welfare']
households = {'Ogunleye':'Ogunleye family','Adeyemi':'Adeyemi family','Okafor':'Okafor family','Balogun':'Balogun family','Olatunji':'Olatunji family','Adewale':'Adewale family'}
M = []
for i,(f,l,g,s) in enumerate(adults):
    y = random.randint(1968, 2002); dob = dt.date(y, random.randint(1,12), random.randint(1,28))
    if i in (4, 16, 22): dob = dt.date(y, 9, [22, 24, 27][(4,16,22).index(i)])
    joined = TODAY - dt.timedelta(days=random.randint(200, 2400))
    m = {'first': f, 'last': l, 'gender': g, 'status': s, 'phone': f"0803 555 {1000+i*37:04d}", 'dob': iso(dob), 'joined': iso(joined),
         'household': households.get(l, ''), 'depts': random.sample(depts, 1 if s != 'Worker' else 2) if s in ('Worker','Minister') or random.random() < .5 else [],
         'address': random.choice(['Oka Road','Yaba','Odojomu','Igbindo','Iyana Lotu','Fagun','Adeyemi College area']) + ', Ondo', 'branchId': 'main', 'isChild': False,
         'occupation': random.choice(['Teacher','Trader','Civil servant','Nurse','Engineer','Student','Tailor','Banker','Farmer','Business owner',''])}
    if l in households and g == 'Male' and s != 'Inactive': m['anniversary'] = iso(dt.date(random.randint(1995, 2020), random.randint(1,12), random.randint(1,28)))
    if i == 7: m['anniversary'] = '2012-09-26'
    M.append(add('members', m, id=f"ex-m-{i:02d}"))
# converted first-timers (now members with follow-up history)
conv = [('Oluwatobi','Adekunle','Male','Member','2026-07-12'),('Precious','Uche','Female','Department','2026-06-28'),('Halima','Bello','Female','Membership class','2026-08-16')]
for j,(f,l,g,stage,vis) in enumerate(conv):
    v = dt.date.fromisoformat(vis); c = v + dt.timedelta(days=2)
    notes = [{'date': iso(c), 'text': 'Called. Glad to hear from us, will come again.', 'by': 'Follow-up Coordinator'}]
    m = {'first': f, 'last': l, 'gender': g, 'status': 'Member' if stage in ('Member','Department') else 'First-timer', 'phone': f"0806 555 {2000+j*41:04d}",
         'joined': vis, 'branchId': 'main', 'isChild': False, 'depts': ['Choir'] if stage == 'Department' else [], 'address': 'Ondo',
         'followUp': {'stage': stage, 'visited': vis, 'contactedAt': iso(c), 'movedAt': iso(v + dt.timedelta(days=30)), 'due': '' if stage in ('Member','Department') else '2026-09-24',
                      'assignee': 'Yetunde Adeyemi', 'invitedBy': 'Grace Akande', 'heardVia': 'Invited by a member', 'prayer': '', 'notes': notes}}
    M.append(add('members', m, id=f"ex-c-{j}"))
# current first-timers across stages
fts = [('Chioma','Nnaji','Female','First visit','2026-09-20',None,''),('David','Oyewole','Male','First visit','2026-09-13',None,'Kehinde Balogun'),
       ('Ayomide','Fakorede','Female','Contacted','2026-09-13','2026-09-14','Yetunde Adeyemi'),('Musa','Abdullahi','Male','Contacted','2026-09-06','2026-09-10','Emeka Nwosu'),
       ('Temitope','Arowolo','Female','Second visit','2026-08-30','2026-08-31','Yetunde Adeyemi'),('Joy','Ikenna','Female','First visit','2026-09-06',None,'')]
for j,(f,l,g,stage,vis,cont,asg) in enumerate(fts):
    v = dt.date.fromisoformat(vis)
    due = iso(v + dt.timedelta(days=2)) if stage == 'First visit' else iso(dt.date.fromisoformat(cont) + dt.timedelta(days=5 if stage == 'Contacted' else 7))
    notes = [{'date': cont, 'text': 'Called after service. Lives near Yaba.', 'by': 'Follow-up Coordinator'}] if cont else []
    m = {'first': f, 'last': l, 'gender': g, 'status': 'First-timer', 'phone': f"0810 555 {3000+j*53:04d}", 'joined': vis, 'branchId': 'main', 'isChild': False, 'depts': [], 'address': 'Ondo',
         'followUp': {'stage': stage, 'visited': vis, 'contactedAt': cont or '', 'due': due, 'assignee': asg, 'invitedBy': random.choice(['Grace Akande','Samuel Olatunji','','Blessing Eze']),
                      'heardVia': random.choice(['Invited by a member','Walked in','Social media']), 'prayer': 'Pray for a new job' if j == 1 else '', 'notes': notes}}
    M.append(add('members', m, id=f"ex-f-{j}"))
# children
kids = [('Tomiwa','Adeyemi','Male','Yetunde Adeyemi','0803 555 1148',''),('Tife','Adeyemi','Female','Yetunde Adeyemi','0803 555 1148','Peanuts'),
        ('Kamsi','Okafor','Female','Ngozi Okafor','0803 555 1222',''),('Ireti','Balogun','Female','Kehinde Balogun','0803 555 1259','Asthma inhaler in bag'),
        ('Dara','Olatunji','Male','Mary Olatunji','0803 555 1629',''),('Ife','Ogunleye','Female','Funmilayo Ogunleye','0803 555 1037',''),
        ('Timi','Adewale','Male','Folake Adewale','0803 555 1740','Lactose intolerant'),('Zion','Okafor','Male','Ngozi Okafor','0803 555 1222','')]
K = []
for j,(f,l,g,gn,gp,al) in enumerate(kids):
    m = {'first': f, 'last': l, 'gender': g, 'status': 'Member', 'isChild': True, 'guardianName': gn, 'guardianPhone': gp, 'allergy': al, 'household': households.get(l,''),
         'dob': iso(dt.date(random.randint(2015, 2023), random.randint(1,12), random.randint(1,28))), 'joined': '2024-01-07', 'branchId': 'main', 'depts': [], 'phone': ''}
    K.append(add('members', m, id=f"ex-k-{j}"))

absent_ids = {'ex-m-23', 'ex-m-26', 'ex-m-31'}  # missed last 3 Sundays
sundays = [TODAY - dt.timedelta(weeks=w) for w in range(11, -1, -1)]
prob = {'Minister': .97, 'Worker': .9, 'Member': .78, 'Regular attender': .55, 'Inactive': 0}
for idx, d in enumerate(sundays):
    present = []
    for m in M:
        if m['joined'] > iso(d): continue
        if m['id'] in absent_ids and idx >= len(sundays) - 3: continue
        if m['status'] == 'First-timer' or 'followUp' in m:
            fu = m['followUp']; v = fu['visited']
            if v == iso(d): present.append(m['id']); continue
            if v < iso(d) and fu['stage'] != 'First visit' and random.random() < .7: present.append(m['id'])
            continue
        if random.random() < prob.get(m['status'], .7) + (0.04 if idx > 6 else 0): present.append(m['id'])
    for k in K:
        if random.random() < .82: present.append(k['id'])
    ms = {m['id']: m for m in M + K}
    pm = [ms[i] for i in present]
    s = {'date': iso(d), 'type': 'Sunday Service', 'mode': 'names', 'present': present, 'branchId': 'main',
         'children': sum(1 for m in pm if m['isChild']), 'men': sum(1 for m in pm if not m['isChild'] and m['gender'] == 'Male'),
         'women': sum(1 for m in pm if not m['isChild'] and m['gender'] == 'Female'),
         'firstTimers': sum(1 for m in pm if m.get('followUp', {}).get('visited') == iso(d)), 'total': len(present)}
    add('services', s)
for w in range(4):
    d = TODAY - dt.timedelta(days=4 + 7*w)
    men, women, ch = random.randint(9, 14), random.randint(14, 20), random.randint(2, 5)
    add('services', {'date': iso(d), 'type': 'Midweek Service', 'mode': 'count', 'present': [], 'men': men, 'women': women, 'children': ch, 'firstTimers': 0, 'total': men+women+ch, 'branchId': 'main'})

# income
for idx, d in enumerate(sundays):
    add('income', {'date': iso(d), 'category': 'Offering', 'amount': random.randrange(48000, 76000, 500), 'method': 'Cash', 'memberId': '', 'note': 'Sunday service offering', 'source': 'manual', 'branchId': 'main'})
    add('income', {'date': iso(d), 'category': 'Tithe', 'amount': random.randrange(90000, 160000, 1000), 'method': 'Cash', 'memberId': '', 'note': 'Tithe box (unnamed envelopes)', 'source': 'manual', 'branchId': 'main'})
for mo, (o, t) in {'2026-04': (268000, 520000), '2026-05': (251000, 488000), '2026-06': (284000, 541000)}.items():
    add('income', {'date': mo + '-28', 'category': 'Offering', 'amount': o, 'method': 'Cash', 'memberId': '', 'note': 'Monthly total brought forward', 'source': 'manual', 'branchId': 'main'})
    add('income', {'date': mo + '-28', 'category': 'Tithe', 'amount': t, 'method': 'Cash', 'memberId': '', 'note': 'Monthly total brought forward', 'source': 'manual', 'branchId': 'main'})
named = [('ex-m-03','Tithe',45000,'Bank transfer','2026-09-06'),('ex-m-04','Tithe',38000,'Online (Paystack)','2026-09-06'),('ex-m-15','Tithe',25000,'Bank transfer','2026-09-13'),
         ('ex-m-16','Thanksgiving',50000,'Cash','2026-09-13'),('ex-m-05','Tithe',60000,'Online (Paystack)','2026-09-20'),('ex-m-00','Building Fund',100000,'Bank transfer','2026-08-23'),
         ('ex-m-19','Seed',20000,'POS','2026-08-30'),('ex-m-03','Tithe',45000,'Bank transfer','2026-08-02'),('ex-m-21','Thanksgiving',30000,'Cash','2026-07-26')]
for mid, cat, amt, meth, d in named:
    add('income', {'date': d, 'category': cat, 'amount': amt, 'method': meth, 'memberId': mid, 'note': '', 'source': 'manual', 'branchId': 'main'})
# expenses
exps = [('2026-09-18','Fuel & Generator',42000,'Diesel for Sunday and midweek services','Pending'),('2026-09-16','Welfare',35000,'Support for the Ige family (hospital bill)','Pending'),
        ('2026-09-10','Utilities',18500,'Electricity token','Approved'),('2026-09-02','Media & Equipment',65000,'Replacement wireless microphone','Approved'),
        ('2026-08-27','Fuel & Generator',40000,'Diesel','Approved'),('2026-08-15','Maintenance',28000,'Plumbing repairs, restrooms','Approved'),
        ('2026-07-20','Programmes',150000,'Youth summer retreat','Approved'),('2026-07-05','Fuel & Generator',38000,'Diesel','Approved'),
        ('2026-06-14','Utilities',17000,'Electricity token','Approved'),('2026-05-09','Honorarium',60000,'Guest minister honorarium','Approved'),('2026-04-18','Maintenance',45000,'Roof leak repair','Approved')]
for d, c, a, desc, st in exps:
    e = {'date': d, 'category': c, 'amount': a, 'desc': desc, 'status': st, 'requestedBy': 'Finance Secretary', 'branchId': 'main'}
    if st == 'Approved': e.update({'decidedBy': 'Pastor', 'decidedAt': d})
    add('expenses', e)
# counts
add('counts', {'date': '2026-09-13', 'service': 'Sunday Service', 'category': 'Offering', 'denoms': {'1000': 38, '500': 29, '200': 22, '100': 19, '50': 8}, 'coins': 0,
               'total': 38000+14500+4400+1900+400, 'counters': [{'name':'Taiwo Balogun','signed':True},{'name':'Bisola Ajayi','signed':True},{'name':'Segun Ibitoye','signed':True}],
               'status': 'Verified', 'posted': True, 'branchId': 'main'})
add('counts', {'date': '2026-09-20', 'service': 'Sunday Service', 'category': 'Offering', 'denoms': {'1000': 41, '500': 33, '200': 25, '100': 14, '50': 6}, 'coins': 0,
               'total': 41000+16500+5000+1400+300, 'counters': [{'name':'Taiwo Balogun','signed':True},{'name':'Bisola Ajayi','signed':False},{'name':'','signed':False}],
               'status': 'Awaiting sign-off', 'posted': False, 'branchId': 'main'})
# check-ins today
for j, (kid, cls, code, t_in, out) in enumerate([(0,'Juniors (6–9)','4821','09:02',None),(1,'Beginners (3–5)','7390','09:02',None),(3,'Juniors (6–9)','5166','09:10',None),
                                                   (4,'Pre-teens (10–12)','2048','09:15',None),(6,'Beginners (3–5)','6612','09:20','12:05')]):
    k = K[kid]
    c = {'date': iso(TODAY), 'childId': k['id'], 'childName': k['first'] + ' ' + k['last'], 'cls': cls, 'guardian': k['guardianName'], 'guardianPhone': k['guardianPhone'],
         'code': code, 'inAt': f"{iso(TODAY)}T{t_in}:00+01:00", 'branchId': 'main'}
    if out: c.update({'outAt': f"{iso(TODAY)}T{out}:00+01:00", 'outBy': k['guardianName']})
    add('checkins', c)
add('messages', {'date': '2026-09-17', 'audience': 'Workers & ministers', 'count': 15, 'text': 'Dear {first_name}, workers’ meeting holds this Saturday at 4pm in the main auditorium. Please be punctual.', 'branchId': 'main'})
add('messages', {'date': '2026-09-14', 'audience': 'First-timers', 'count': 3, 'text': 'Hello {first_name}, thank you for worshipping with us at {church}...', 'branchId': 'main'})

os.makedirs(OUT, exist_ok=True)
json.dump(docs, open(f'{OUT}/local.json', 'w'), ensure_ascii=False)
writes = []
for col, dd in docs.items():
    os.makedirs(f'{OUT}/docs/{col}', exist_ok=True)
    for i, d in dd.items():
        p = f'{OUT}/docs/{col}/{i}.json'; json.dump(d, open(p, 'w'), ensure_ascii=False)
        writes.append({'op': 'set', 'collection': col, 'doc_id': i, 'file_path': p})
batches = [writes[i:i+50] for i in range(0, len(writes), 50)]
for bi, b in enumerate(batches): json.dump(b, open(f'{OUT}/batch{bi}.json', 'w'))
print({c: len(v) for c, v in docs.items()}, 'total', len(writes), 'batches', len(batches))
