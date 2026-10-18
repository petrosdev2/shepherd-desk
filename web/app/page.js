'use client';
import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { createStore } from '../lib/store';
import { startApp } from '../lib/app.generated';

let appStarted = false; // the app owns #app directly; never start it twice

export default function Home() {
  const [stage, setStage] = useState('boot'); // boot | no-env | signed-out | onboarding | app
  const [session, setSession] = useState(null);
  const [conn, setConn] = useState(null);     // { online, fresh, pending } once the store is up
  const started = useRef(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    // Hand the worker the exact build assets this page used, so the first
    // visit is enough to open the app again with no network at all.
    const precache = () => {
      const sw = navigator.serviceWorker.controller;
      if (!sw) return;
      const urls = performance.getEntriesByType('resource')
        .map(e => e.name)
        .filter(u => u.startsWith(window.location.origin) && (u.includes('/_next/static/') || u.endsWith('/manifest.webmanifest') || u.endsWith('/icon.svg')));
      if (urls.length) sw.postMessage({ type: 'precache', urls });
    };
    const reg = () => navigator.serviceWorker.register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(() => { precache(); navigator.serviceWorker.addEventListener('controllerchange', precache); })
      .catch(e => console.error('Offline mode unavailable', e));
    if (document.readyState === 'complete') reg();
    else window.addEventListener('load', reg, { once: true });
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setStage('no-env'); return; }
    let active = true;

    const route = async s => {
      if (!active) return;
      setSession(s);
      if (!s) { setStage('signed-out'); return; }
      const { data: profile } = await supabase.from('profiles').select('church_id, role, full_name').eq('user_id', s.user.id).maybeSingle();
      if (!active) return;
      if (!profile) { setStage('onboarding'); return; }
      setStage('app');
      if (appStarted || started.current) return;
      started.current = true; appStarted = true;
      const { data: church } = await supabase.from('churches').select('name, join_code, form_token').eq('id', profile.church_id).maybeSingle();
      if (!active) return;
      const store = createStore({ supabase, churchId: profile.church_id, user: s.user, profile, church, onSignOut: () => window.location.reload() });
      store.onStatus(setConn);
      window.__QR = async text => (await import('qrcode')).toDataURL(text, { width: 440, margin: 1, color: { dark: '#0B6E4F', light: '#FFFFFF' } });
      setTimeout(() => startApp(store), 0);
    };

    supabase.auth.getSession().then(({ data }) => route(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (!appStarted) route(s); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  if (stage === 'boot') return <div className="boot">Loading…</div>;
  if (stage === 'no-env') return <MissingEnv />;
  if (stage === 'signed-out') return <Auth />;
  if (stage === 'onboarding') return <Onboarding session={session} onDone={() => window.location.reload()} />;

  return (
    <>
      <div id="app" />
      <div id="modal-root" hidden />
      <div id="toasts" aria-live="polite" />
      <ConnectionBar conn={conn} />
    </>
  );
}

// Sits out of the way until something is worth saying: you are offline, or
// there are saved changes still to go up.
function ConnectionBar({ conn }) {
  if (!conn) return null;
  const { online, pending } = conn;
  if (online && !pending) return null;
  const msg = !online
    ? (pending ? `Offline — ${pending} change${pending === 1 ? '' : 's'} saved on this phone` : 'Offline — your records are the last saved copy')
    : `Sending ${pending} saved change${pending === 1 ? '' : 's'}…`;
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)',
      bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', zIndex: 60,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 15px', borderRadius: 999, maxWidth: 'calc(100vw - 32px)',
      background: online ? '#0B6E4F' : '#4a3a12', color: '#fff',
      font: '500 13px/1.3 ui-sans-serif, system-ui, sans-serif',
      boxShadow: '0 6px 20px rgba(0,0,0,.35)'
    }}>
      <span aria-hidden="true" style={{
        width: 8, height: 8, borderRadius: '50%', flex: 'none',
        background: online ? '#9ff0cd' : '#f2c14e'
      }} />
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg}</span>
    </div>
  );
}

function Shell({ title, lead, children }) {
  return (
    <div className="auth-wrap">
      <div className="auth panel">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 22V9a5 5 0 0 1 10 0v1.5a2.5 2.5 0 0 1-5 0" /></svg>
          </span>
          <div><b>Shepherd Desk</b><small>Church management</small></div>
        </div>
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
        {children}
      </div>
    </div>
  );
}

function MissingEnv() {
  return (
    <Shell title="Almost there" lead="This app needs its Supabase keys before it can run.">
      <p className="note">Add <b>NEXT_PUBLIC_SUPABASE_URL</b> and <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> in Vercel → Project → Settings → Environment Variables (or in a local <b>.env.local</b> file), then redeploy. The README has the full steps.</p>
    </Shell>
  );
}

function Auth() {
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async e => {
    e.preventDefault(); setErr(''); setMsg('');
    const supabase = getSupabase(); if (!supabase) return;
    if (!email.trim() || password.length < 6) { setErr('Enter your email and a password of at least 6 characters.'); return; }
    setBusy(true);
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) setErr(error.message === 'Invalid login credentials' ? 'That email and password don’t match an account.' : error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      setBusy(false);
      if (error) { setErr(error.message); return; }
      if (!data.session) setMsg('Check your email to confirm the account, then sign in.');
    }
  };

  return (
    <Shell title={mode === 'in' ? 'Sign in' : 'Create your account'} lead={mode === 'in' ? 'Welcome back.' : 'One account per person. You’ll set up or join a church next.'}>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="password">Password</label><input className="input" id="password" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} /></div>
        {err ? <p className="err">{err}</p> : null}
        {msg ? <p className="note">{msg}</p> : null}
        <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
      </form>
      <p className="switch">
        {mode === 'in' ? 'New here? ' : 'Already have an account? '}
        <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); setMsg(''); }}>{mode === 'in' ? 'Create an account' : 'Sign in'}</button>
      </p>
    </Shell>
  );
}

function Onboarding({ session, onDone }) {
  const [tab, setTab] = useState('new');
  const [churchName, setChurchName] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async e => {
    e.preventDefault(); setErr(''); const supabase = getSupabase(); if (!supabase) return;
    setBusy(true);
    const { error } = tab === 'new'
      ? await supabase.rpc('create_church', { p_name: churchName.trim(), p_full_name: fullName.trim() || null })
      : await supabase.rpc('join_church', { p_code: code.trim(), p_full_name: fullName.trim() || null });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onDone();
  };

  return (
    <Shell title="Set up your church" lead={`Signed in as ${session?.user?.email || ''}`}>
      <div className="seg" role="tablist">
        <button type="button" className={tab === 'new' ? 'on' : ''} onClick={() => setTab('new')}>Start a new church</button>
        <button type="button" className={tab === 'join' ? 'on' : ''} onClick={() => setTab('join')}>Join with a code</button>
      </div>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="fn">Your name</label><input className="input" id="fn" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Petros" /></div>
        {tab === 'new'
          ? <div className="field"><label htmlFor="cn">Church name</label><input className="input" id="cn" value={churchName} onChange={e => setChurchName(e.target.value)} placeholder="e.g. Destiny Impact Church" /></div>
          : <div className="field"><label htmlFor="cc">Church code</label><input className="input" id="cc" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="8 characters from your church admin" /></div>}
        {err ? <p className="err">{err}</p> : null}
        <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Setting up…' : tab === 'new' ? 'Create church' : 'Join church'}</button>
      </form>
      <p className="note">Starting a church makes you its admin. Your church code is in Settings, and your team members use it to join.</p>
    </Shell>
  );
}
