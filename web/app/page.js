'use client';
import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { createStore } from '../lib/store';
import { startApp } from '../lib/app.generated';

let appStarted = false; // the app owns #app directly; never start it twice

export default function Home() {
  const [stage, setStage] = useState('boot'); // boot | no-env | signed-out | onboarding | app
  const [session, setSession] = useState(null);
  const started = useRef(false);

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
      const { data: church } = await supabase.from('churches').select('name, join_code').eq('id', profile.church_id).maybeSingle();
      if (!active) return;
      const store = createStore({ supabase, churchId: profile.church_id, user: s.user, profile, church, onSignOut: () => window.location.reload() });
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
    </>
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
