'use client';
/**
 * Supabase-backed store with the same shape the app already expects:
 *   store.collection(col).onSnapshot(next, error) -> unsubscribe
 *   store.collection(col).doc(id).set(body) / .delete()
 *
 * Church records are JSON documents in public.records, scoped by row-level
 * security. The extra "signups" collection is the public registration queue
 * (public.signups) presented through the same interface.
 *
 * Offline: every record is mirrored into IndexedDB, so the app opens and runs
 * with the last known data even with no network. Writes apply to the local copy
 * at once and go into an outbox that drains when the connection returns. The
 * app sees no difference — only the status banner does.
 */
import { openDb, docsAll, docPut, docDel, docsReplace, outboxAll, outboxAdd, outboxDel } from './idb';

const RECORD_COLS = ['settings', 'members', 'services', 'income', 'expenses', 'counts', 'messages', 'checkins', 'branches', 'remits', 'audit'];
const COLS = [...RECORD_COLS, 'signups'];
const signupDoc = row => ({ ...(row.data || {}), id: row.id, status: row.status, createdAt: row.created_at, date: (row.created_at || '').slice(0, 10) });
const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

export function createStore({ supabase, churchId, user, profile, church, onSignOut }) {
  const cache = {}; COLS.forEach(c => cache[c] = new Map());
  const listeners = {}; COLS.forEach(c => listeners[c] = new Set());
  let loaded = false;       // true once we have shown something, local or remote
  let fresh = false;        // true once the server copy has landed this session
  let db = null;
  let pending = 0;          // writes waiting in the outbox
  let flushing = false;

  /* ---------- status, for the banner in the web shell ---------- */
  const statusWatchers = new Set();
  const status = () => ({ online: isOnline(), fresh, pending });
  const announce = () => statusWatchers.forEach(fn => { try { fn(status()); } catch (e) { console.error(e); } });

  const snapshotFor = col => ({
    docs: [...cache[col].entries()].map(([id, body]) => ({ id, exists: true, data: () => body })),
    metadata: { fromCache: !fresh, hasPendingWrites: pending > 0 }
  });
  const emit = col => { const s = snapshotFor(col); listeners[col].forEach(fn => { try { fn(s); } catch (e) { console.error(e); } }); };

  /* ---------- local copy ---------- */
  async function hydrate() {
    db = await openDb(churchId);
    const rows = await docsAll(db);
    if (rows && rows.length) {
      rows.forEach(r => { if (cache[r.col]) cache[r.col].set(r.id, { ...r.body, id: r.id }); });
      loaded = true; COLS.forEach(emit);
    }
    const queued = await outboxAll(db);
    pending = queued.length;
    announce();
  }

  /* ---------- server copy ---------- */
  async function loadAll() {
    const page = 1000; let from = 0; const rows = [];
    for (;;) {
      const { data, error } = await supabase.from('records').select('col,doc_id,doc').eq('church_id', churchId).range(from, from + page - 1);
      if (error) throw error;
      (data || []).forEach(r => { if (cache[r.col]) rows.push({ col: r.col, id: r.doc_id, body: r.doc }); });
      if (!data || data.length < page) break;
      from += page;
    }
    const { data: subs, error: subErr } = await supabase.from('signups').select('id,data,status,created_at').eq('church_id', churchId).order('created_at', { ascending: false }).limit(1000);
    if (subErr) throw subErr;
    (subs || []).forEach(r => rows.push({ col: 'signups', id: r.id, body: signupDoc(r) }));

    // Outbox writes are newer than anything the server just gave us: keep them on top.
    const queued = await outboxAll(db);
    const held = new Set(queued.map(q => q.col + ':' + q.id));

    COLS.forEach(c => cache[c].clear());
    rows.forEach(r => { if (cache[r.col] && !held.has(r.col + ':' + r.id)) cache[r.col].set(r.id, { ...r.body, id: r.id }); });
    queued.forEach(q => {
      if (!cache[q.col]) return;
      if (q.op === 'delete') cache[q.col].delete(q.id);
      else cache[q.col].set(q.id, { ...q.body, id: q.id });
    });

    await docsReplace(db, [...COLS.flatMap(c => [...cache[c].entries()].map(([id, body]) => ({ col: c, id, body })))]);
    loaded = true; fresh = true; COLS.forEach(emit); announce();
  }

  function subscribeRealtime() {
    supabase.channel('sd-' + churchId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `church_id=eq.${churchId}` }, payload => {
        const row = payload.new && payload.new.col ? payload.new : payload.old;
        if (!row || !cache[row.col]) return;
        if (payload.eventType === 'DELETE') { cache[row.col].delete(row.doc_id); docDel(db, row.col, row.doc_id); }
        else { cache[row.col].set(row.doc_id, { ...row.doc, id: row.doc_id }); docPut(db, row.col, row.doc_id, row.doc); }
        emit(row.col);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signups', filter: `church_id=eq.${churchId}` }, payload => {
        const row = payload.new && payload.new.id ? payload.new : payload.old;
        if (!row) return;
        if (payload.eventType === 'DELETE') { cache.signups.delete(row.id); docDel(db, 'signups', row.id); }
        else { const d = signupDoc(row); cache.signups.set(row.id, d); docPut(db, 'signups', row.id, d); }
        emit('signups');
      })
      .subscribe();
  }

  /* ---------- the outbox ---------- */
  const sendOne = async entry => {
    if (entry.col === 'signups') {
      if (entry.op === 'delete') {
        const { error } = await supabase.from('signups').delete().eq('id', entry.id).eq('church_id', churchId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('signups').update({ status: entry.body.status || 'pending', reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', entry.id).eq('church_id', churchId);
        if (error) throw error;
      }
      return;
    }
    if (entry.op === 'delete') {
      const { error } = await supabase.from('records').delete().eq('church_id', churchId).eq('col', entry.col).eq('doc_id', entry.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('records').upsert({ church_id: churchId, col: entry.col, doc_id: entry.id, doc: entry.body, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'church_id,col,doc_id' });
      if (error) throw error;
    }
  };

  async function flush() {
    if (flushing || !isOnline()) return;
    flushing = true;
    try {
      const queued = await outboxAll(db);
      for (const entry of queued) {
        try { await sendOne(entry); } catch (e) {
          if (isPermanent(e)) { await outboxDel(db, entry.key); pending = Math.max(0, pending - 1); announce(); continue; }
          break;                       // still offline or the server is down — try again later
        }
        await outboxDel(db, entry.key);
        pending = Math.max(0, pending - 1); announce();
      }
    } finally { flushing = false; }
  }

  // A write the server will never accept (rejected by security, bad shape) must
  // not block the queue behind it — drop it and tell the app.
  const isPermanent = e => {
    const msg = String((e && e.message) || '');
    const code = String((e && e.code) || '');
    return /row-level security|permission|violates|invalid input|not-null/i.test(msg) || code === '42501' || code === '22P02' || code === '23502';
  };

  const queue = async entry => {
    await outboxAdd(db, { ...entry, at: Date.now() });
    pending += 1; announce();
    flush();
  };

  /* ---------- boot ---------- */
  const ready = hydrate()
    .then(() => { if (isOnline()) return loadAll().then(subscribeRealtime); })
    .then(() => flush())
    .catch(err => {
      console.error('Could not reach the church records', err);
      loaded = true; COLS.forEach(emit); announce();
    });

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      announce();
      flush().then(() => { if (!fresh) loadAll().then(subscribeRealtime).catch(e => console.error(e)); });
    });
    window.addEventListener('offline', announce);
  }

  const mapError = e => {
    const msg = String((e && e.message) || '');
    if (/row-level security|permission/i.test(msg)) return { code: 'invalid_argument', message: msg };
    if (/JWT|token|auth/i.test(msg)) return { code: 'revoked', message: msg };
    return { code: 'unavailable', message: msg || 'Network error' };
  };

  return {
    user: {
      email: user.email, role: (profile && profile.role) || 'admin', churchId,
      joinCode: (church && church.join_code) || '',
      formLink: (church && church.form_token) ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${church.form_token}` : ''
    },
    status,
    onStatus(fn) { statusWatchers.add(fn); fn(status()); return () => statusWatchers.delete(fn); },
    sync: () => flush(),
    signOut: async () => { try { await supabase.auth.signOut(); } catch (e) { /* ignore */ } if (onSignOut) onSignOut(); },
    collection(col) {
      return {
        doc(id) {
          return {
            async set(body) {
              const prev = cache[col].get(id) || {};
              const next = col === 'signups' ? { ...prev, ...body, id } : { ...body, id };
              cache[col].set(id, next);
              emit(col);
              await docPut(db, col, id, next);
              await queue({ op: 'set', col, id, body: next });
            },
            async delete() {
              cache[col].delete(id);
              emit(col);
              await docDel(db, col, id);
              await queue({ op: 'delete', col, id });
            }
          };
        },
        onSnapshot(next, error) {
          if (!cache[col]) return () => {};
          listeners[col].add(next);
          if (loaded) next(snapshotFor(col));
          ready.then(() => { if (listeners[col].has(next)) next(snapshotFor(col)); }).catch(e => error && error(mapError(e)));
          return () => listeners[col].delete(next);
        }
      };
    }
  };
}
