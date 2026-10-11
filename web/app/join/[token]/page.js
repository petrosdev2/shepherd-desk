'use client';
import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '../../../lib/supabaseClient';

const STATUS = [
  { v: 'member', label: 'I am a member of this church' },
  { v: 'new', label: 'I am new / just visiting' }
];

const BLANK = { kind: 'member', first: '', last: '', phone: '', gender: '', dob: '', address: '', marital: '', occupation: '', dept: '', invitedBy: '', branchId: '', photo: '' };

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
  const [shot, setShot] = useState(''); // local preview
  const [upl, setUpl] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState(BLANK);
  const fileRef = useRef(null);

  useEffect(() => {
    const supabase = getSupabase(); if (!supabase) { setInfo(null); return; }
    supabase.rpc('public_form_info', { p_token: token }).then(({ data }) => setInfo(data || null));
  }, [token]);

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const pickPhoto = async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setUpl(true);
    try {
      const blob = await shrink(file);
      const supabase = getSupabase(); if (!supabase) throw new Error('Not connected.');
      const name = `signups/${token}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
      const { error } = await supabase.storage.from('member-photos').upload(name, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('member-photos').getPublicUrl(name);
      set('photo', data.publicUrl);
      setShot(URL.createObjectURL(blob));
    } catch (e2) {
      setErr('Photo did not upload: ' + (e2.message || 'please try again.'));
    }
    setUpl(false);
  };

  const submit = async e => {
    e.preventDefault(); setErr('');
    if (!f.first.trim()) return setErr('Please enter your first name.');
    if (!f.phone.trim()) return setErr('Please enter a phone number we can reach you on.');
    if ((info.branches || []).length > 1 && !f.branchId) return setErr('Please choose the expression you attend.');
    if (upl) return setErr('Your photo is still uploading — one moment.');
    const supabase = getSupabase(); if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc('submit_signup', { p_token: token, p_data: { ...f, first: f.first.trim(), last: f.last.trim(), phone: f.phone.trim(), branchName: ((info.branches || []).find(b => b.id === f.branchId) || {}).name || '', submittedAt: new Date().toISOString() } });
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
      <button className="btn" onClick={() => { setSent(false); setF(BLANK); setShot(''); }} style={{ justifyContent: 'center' }}>Register someone else</button>
    </Frame>
  );

  const initials = ((f.first || '?')[0] || '').toUpperCase() + ((f.last || '')[0] || '').toUpperCase();

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
            {shot
              ? <span className="avatar has-photo" style={{ width: 64, height: 64 }}><img src={shot} alt="" /></span>
              : <span className="avatar" style={{ width: 64, height: 64, fontSize: 20 }}>{initials}</span>}
            <div>
              <button type="button" className="btn" onClick={() => fileRef.current && fileRef.current.click()} disabled={upl}>
                {upl ? 'Uploading…' : shot ? 'Change photo' : 'Take or choose a photo'}
              </button>
              <p className="note" style={{ margin: '6px 0 0' }}>Optional. It helps the pastors and unit heads put a face to your name.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} />
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
        {err ? <p className="err">{err}</p> : null}
        <button className="btn primary" type="submit" disabled={busy || upl} style={{ justifyContent: 'center' }}>{busy ? 'Sending…' : 'Submit my details'}</button>
        <p className="note">Your details go only to {info.name}’s church office and are used to keep in touch with you. You can ask them to remove your record at any time.</p>
      </form>
    </Frame>
  );
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
