'use client';
/**
 * Supabase-backed store with the same shape the app already expects:
 *   store.collection(col).onSnapshot(next, error) -> unsubscribe
 *   store.collection(col).doc(id).set(body) / .delete()
 *
 * Every record is one row in public.records, scoped to the signed-in user's
 * church by row-level security.
 */
const COLS = ['settings', 'members', 'services', 'income', 'expenses', 'counts', 'messages', 'checkins', 'branches', 'remits', 'audit'];

export function createStore({ supabase, churchId, user, profile, church, onSignOut }) {
  const cache = {}; COLS.forEach(c => cache[c] = new Map());
  const listeners = {}; COLS.forEach(c => listeners[c] = new Set());
  let loaded = false;

  const snapshotFor = col => ({
    docs: [...cache[col].entries()].map(([id, body]) => ({ id, exists: true, data: () => body })),
    metadata: { fromCache: !loaded, hasPendingWrites: false }
  });
  const emit = col => { const s = snapshotFor(col); listeners[col].forEach(fn => { try { fn(s); } catch (e) { console.error(e); } }); };

  async function loadAll() {
    const page = 1000; let from = 0;
    for (;;) {
      const { data, error } = await supabase.from('records').select('col,doc_id,doc').eq('church_id', churchId).range(from, from + page - 1);
      if (error) throw error;
      (data || []).forEach(r => { if (cache[r.col]) cache[r.col].set(r.doc_id, { ...r.doc, id: r.doc_id }); });
      if (!data || data.length < page) break;
      from += page;
    }
    loaded = true; COLS.forEach(emit);
  }

  function subscribeRealtime() {
    supabase.channel('records-' + churchId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `church_id=eq.${churchId}` }, payload => {
        const row = payload.new && payload.new.col ? payload.new : payload.old;
        if (!row || !cache[row.col]) return;
        if (payload.eventType === 'DELETE') cache[row.col].delete(row.doc_id);
        else cache[row.col].set(row.doc_id, { ...row.doc, id: row.doc_id });
        emit(row.col);
      })
      .subscribe();
  }

  const ready = loadAll().then(subscribeRealtime).catch(err => { console.error('Could not load records', err); loaded = true; COLS.forEach(emit); });

  const mapError = e => {
    const msg = String((e && e.message) || '');
    if (/row-level security|permission/i.test(msg)) return { code: 'invalid_argument', message: msg };
    if (/JWT|token|auth/i.test(msg)) return { code: 'revoked', message: msg };
    return { code: 'unavailable', message: msg || 'Network error' };
  };

  return {
    user: { email: user.email, role: (profile && profile.role) || 'admin', churchId, joinCode: (church && church.join_code) || '' },
    signOut: async () => { try { await supabase.auth.signOut(); } catch (e) { /* ignore */ } if (onSignOut) onSignOut(); },
    collection(col) {
      return {
        doc(id) {
          return {
            async set(body) {
              cache[col].set(id, { ...body, id });
              const { error } = await supabase.from('records').upsert({ church_id: churchId, col, doc_id: id, doc: body, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'church_id,col,doc_id' });
              if (error) throw mapError(error);
            },
            async delete() {
              cache[col].delete(id);
              const { error } = await supabase.from('records').delete().eq('church_id', churchId).eq('col', col).eq('doc_id', id);
              if (error) throw mapError(error);
            }
          };
        },
        onSnapshot(next, error) {
          listeners[col].add(next);
          ready.then(() => { if (listeners[col].has(next)) next(snapshotFor(col)); }).catch(e => error && error(mapError(e)));
          return () => listeners[col].delete(next);
        }
      };
    }
  };
}
