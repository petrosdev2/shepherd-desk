'use client';
import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '../../../lib/supabaseClient';

const STATUS = [
  { v: 'member', label: 'I am a member of this church' },
  { v: 'new', label: 'I am new / just visiting' }
];

const BLANK = { kind: 'member', first: '', last: '', phone: '', gender: '', dob: '', address: '', marital: '', occupation: '', dept: '', invitedBy: '', branchId: '', photo: '' };
const BLANK_KID = { first: '', last: '', gender: '', dob: '', allergy: '', photo: '' };
const MAX_KIDS = 8;

// Shrink in the browser so a phone photo uploads in seconds on mobile data.
function shrink(file, max = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(b => b ? resolve(b) : reject(new Error('Could not read that image.')), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image we can read.')); };
    img.src = url;
  });
}

export default function Join({ params }) {
  const token = params.token;
  const [info, setInfo] = useState(undefined); // undefined = loading, null = bad link
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState('');        // local preview of the adult photo
  const [kidShots, setKidShots] = useState([]);
  const [upl, setUpl] = useState(0);           // how many uploads are in flight
  const [err, setErr] = useState('');
  const [f, setF] = useState(BLANK);
  const [kids, setKids] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    const supabase = getSupabase(); if (!supabase) { setInfo(null); return; }
    supabase.rpc('public_form_info', { p_token: token }).then(({ data }) => setInfo(data || null));
  }, [token]);

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const setKid = (i, k, v) => setKids(prev => prev.map((kid, j) => j === i ? { ...kid, [k]: v } : kid));

  const reset = () => { setF(BLANK); setKids([]); setShot(''); setKidShots([]); };

  const addKid = () => { setKids(prev => prev.length >= MAX_KIDS ? prev : [...prev, { ...BLANK_KID }]); setKidShots(prev => [...prev, '']); };
  const dropKid = i => { setKids(prev => prev.filter((_, j) => j !== i)); setKidShots(prev => prev.filter((_, j) => j !== i)); };

  // Shrink, upload, and hand back the public URL plus a local preview.
  const upload = async file => {
    const blob = await shrink(file);
    const supabase = getSupabase(); if (!supabase) throw new Error('Not connected.');
    const name = `signups/${token}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const { error } = await supabase.storage.from('member-photos').upload(name, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('member-photos').getPublicUrl(name);
    return { url: data.publicUrl, preview: URL.createObjectURL(blob) };
  };

  const pickPhoto = async (e, kidIndex) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setUpl(n => n + 1);
    try {
      const { url, preview } = await upload(file);
      if (kidIndex == null) { set('photo', url); setShot(preview); }
      else { setKid(kidIndex, 'photo', url); setKidShots(prev => prev.map((p, j) => j === kidIndex ? preview : p)); }
    } catch (e2) {
      setErr('Photo did not upload: ' + (e2.message || 'please try again.'));
    }
    setUpl(n => n - 1);
  };

  const submit = async e => {
    e.preventDefault(); setErr('');
    if (!f.first.trim()) return setErr('Please enter your first name.');
    if (!f.phone.trim()) return setErr('Please enter a phone number we can reach you on.');
    if ((info.branches || []).length > 1 && !f.branchId) return setErr('Please choose the expression you attend.');
    const named = kids.filter(k => k.first.trim());
    if (kids.length && named.length !== kids.length) return setErr('Please give each child a first name, or remove the empty one.');
    if (upl) return setErr('A photo is still uploading — one moment.');
    const supabase = getSupabase(); if (!supabase) return;
    setBusy(true);
    const payload = {
      ...f, first: f.first.trim(), last: f.last.trim(), phone: f.phone.trim(),
      branchName: ((info.branches || []).find(b => b.id === f.branchId) || {}).name || '',
      children: named.map(k => ({ ...k, first: k.first.trim(), last: k.last.trim() })),
      submittedAt: new Date().toISOString()
    };
    const { error } = await supabase.rpc('submit_signup', { p_token: token, p_data: payload });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setSent(true);
  };

  if (info === undefined) return <div className="boot">Loading…</div>;

  if (info === null) return (
    <Frame title="Link not valid">
      <p className="lead">This registration link doesn’t work any more. Please ask the church office for the current one.</p>
    </Frame>
  );

  if (sent) return (
    <Frame title="Thank you!" church={info.name}>
      <p className="lead">Your details have reached the church office. Someone will be in touch, and you’ll be added to the register shortly.</p>
      <button className="btn" onClick={() => { setSent(false); reset(); }} style={{ justifyContent: 'center' }}>Register someone else</button>
    </Frame>
  );

  return (
    <Frame title="Church registration" church={info.name} lead="It takes about a minute. Only your name and phone number are required.">
      <form onSubmit={submit}>
        <div className="field">
          <span className="lbl">Are you a member here?</span>
          {STATUS.map(s => (
            <label className="choice" key={s.v}>
              <input type="radio" name="kind" value={s.v} checked={f.kind === s.v} onChange={() => set('kind', s.v)} />
              <div><b>{s.label}</b></div>
            </label>
          ))}
        </div>
        {(info.branches || []).length > 1 ? (
          <div className="field">
            <label htmlFor="branch">Which expression do you attend? *</label>
            <select className="input" id="branch" value={f.branchId} onChange={e => set('branchId', e.target.value)}>
              <option value="">— Please choose —</option>
              {info.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        ) : null}
        <div className="field">
          <span className="lbl">Your photo</span>
          <div className="photo-pick">
            <Face src={shot} name={f.first} last={f.last} size={64} />
            <div>
              <button type="button" className="btn" onClick={() => fileRef.current && fileRef.current.click()}>
                {shot ? 'Change photo' : 'Take or choose a photo'}
              </button>
              <p className="note" style={{ margin: '6px 0 0' }}>Optional. It helps the pastors and unit heads put a face to your name.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={e => pickPhoto(e, null)} />
          </div>
        </div>
        <div className="form-grid">
          <div className="field"><label htmlFor="first">First name *</label><input className="input" id="first" value={f.first} onChange={e => set('first', e.target.value)} autoComplete="given-name" /></div>
          <div className="field"><label htmlFor="last">Surname</label><input className="input" id="last" value={f.last} onChange={e => set('last', e.target.value)} autoComplete="family-name" /></div>
          <div className="field"><label htmlFor="phone">Phone (WhatsApp) *</label><input className="input" id="phone" inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="0803 123 4567" autoComplete="tel" /></div>
          <div className="field"><label htmlFor="gender">Gender</label><select className="input" id="gender" value={f.gender} onChange={e => set('gender', e.target.value)}><option value="">—</option><option>Male</option><option>Female</option></select></div>
          <div className="field"><label htmlFor="dob">Birthday</label><input className="input" id="dob" type="date" value={f.dob} onChange={e => set('dob', e.target.value)} /></div>
          <div className="field"><label htmlFor="marital">Marital status</label><select className="input" id="marital" value={f.marital} onChange={e => set('marital', e.target.value)}><option value="">—</option><option>Single</option><option>Married</option><option>Widowed</option></select></div>
          <div className="field"><label htmlFor="occupation">Occupation</label><input className="input" id="occupation" value={f.occupation} onChange={e => set('occupation', e.target.value)} /></div>
          <div className="field"><label htmlFor="dept">{f.kind === 'member' ? 'Department you serve in' : 'Department you’d like to join'}</label>
            <select className="input" id="dept" value={f.dept} onChange={e => set('dept', e.target.value)}>
              <option value="">—</option>{(info.departments || []).map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label htmlFor="address">Area / address</label><input className="input" id="address" value={f.address} onChange={e => set('address', e.target.value)} placeholder="e.g. Oka Road, Ondo" /></div>
        {f.kind === 'new' ? <div className="field"><label htmlFor="invitedBy">Who invited you?</label><input className="input" id="invitedBy" value={f.invitedBy} onChange={e => set('invitedBy', e.target.value)} /></div> : null}

        <div className="field">
          <span className="lbl">Your children</span>
          <p className="note" style={{ margin: '0 0 10px' }}>
            Add any children who come to church with you, so the children’s workers know them and can reach you.
            Only add children you are the parent or guardian of.
          </p>
          {kids.map((k, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '12px 12px 2px', margin: '0 0 10px' }}>
              <div className="split">
                <b>Child {i + 1}</b>
                <button type="button" className="btn sm danger" onClick={() => dropKid(i)}>Remove</button>
              </div>
              <div className="photo-pick">
                <Face src={kidShots[i]} name={k.first} last={k.last || f.last} size={52} />
                <div>
                  <button type="button" className="btn sm" onClick={() => { const el = document.getElementById('kid-photo-' + i); if (el) el.click(); }}>
                    {kidShots[i] ? 'Change photo' : 'Add a photo'}
                  </button>
                </div>
                <input id={'kid-photo-' + i} type="file" accept="image/*" onChange={e => pickPhoto(e, i)} />
              </div>
              <div className="form-grid">
                <div className="field"><label htmlFor={'k-first-' + i}>First name *</label><input className="input" id={'k-first-' + i} value={k.first} onChange={e => setKid(i, 'first', e.target.value)} /></div>
                <div className="field"><label htmlFor={'k-last-' + i}>Surname</label><input className="input" id={'k-last-' + i} value={k.last} onChange={e => setKid(i, 'last', e.target.value)} placeholder={f.last || 'Same as yours'} /></div>
                <div className="field"><label htmlFor={'k-gender-' + i}>Gender</label><select className="input" id={'k-gender-' + i} value={k.gender} onChange={e => setKid(i, 'gender', e.target.value)}><option value="">—</option><option>Male</option><option>Female</option></select></div>
                <div className="field"><label htmlFor={'k-dob-' + i}>Date of birth</label><input className="input" id={'k-dob-' + i} type="date" value={k.dob} onChange={e => setKid(i, 'dob', e.target.value)} /></div>
              </div>
              <div className="field"><label htmlFor={'k-allergy-' + i}>Allergy or special care</label><input className="input" id={'k-allergy-' + i} value={k.allergy} onChange={e => setKid(i, 'allergy', e.target.value)} placeholder="e.g. asthma, peanut allergy — leave blank if none" /></div>
            </div>
          ))}
          {kids.length < MAX_KIDS
            ? <button type="button" className="btn" onClick={addKid}>{kids.length ? 'Add another child' : 'Add a child'}</button>
            : <p className="note" style={{ margin: 0 }}>That’s the most you can add here. Tell the church office about any others.</p>}
        </div>

        {err ? <p className="err">{err}</p> : null}
        <button className="btn primary" type="submit" disabled={busy || !!upl} style={{ justifyContent: 'center' }}>{busy ? 'Sending…' : upl ? 'Uploading photo…' : 'Submit my details'}</button>
        <p className="note">Your details go only to {info.name}’s church office and are used to keep in touch with you and your family. You can ask them to remove your record, or your child’s, at any time.</p>
      </form>
    </Frame>
  );
}

function Face({ src, name, last, size }) {
  const initials = ((name || '?')[0] || '').toUpperCase() + ((last || '')[0] || '').toUpperCase();
  return src
    ? <span className="avatar has-photo" style={{ width: size, height: size }}><img src={src} alt="" /></span>
    : <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}>{initials}</span>;
}

function Frame({ title, church, lead, children }) {
  return (
    <div className="auth-wrap">
      <div className="auth panel" style={{ width: 'min(560px, 100%)' }}>
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 22V9a5 5 0 0 1 10 0v1.5a2.5 2.5 0 0 1-5 0" /></svg>
          </span>
          <div><b>{church || 'Shepherd Desk'}</b><small>{church ? 'Member registration' : 'Church management'}</small></div>
        </div>
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
        {children}
      </div>
    </div>
  );
}
