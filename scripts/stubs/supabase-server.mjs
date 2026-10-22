// Test stub for "@/lib/supabase/server": an in-memory database that behaves like PostgREST on uuid columns
// (rejects anything that isn't a uuid in user_id), and a fake auth exchange. Used by scripts/test-callback.mjs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const tables = {};
export const state = { user: null, exchangeError: null };
const bad = (v) => v !== undefined && !UUID.test(String(v));
const uuidError = (v) => ({ message: `invalid input syntax for type uuid: "${v}"` });

function query(name) {
  const rows = (tables[name] ||= []);
  const filters = [];
  let op = "select";
  let payload = null;
  let conflict = [];
  let err = null;
  const match = (r) => filters.every(([c, v]) => String(r[c]) === String(v));
  async function run() {
    if (Array.isArray(payload)) for (const p of payload) if (bad(p.user_id)) err = uuidError(p.user_id);
    if (err) return { data: null, error: err };
    if (op === "select") return { data: rows.filter(match), error: null };
    if (op === "insert") {
      rows.push(...payload.map((p) => ({ ...p })));
      return { data: payload, error: null };
    }
    if (op === "upsert") {
      for (const p of payload) {
        const i = rows.findIndex((r) => conflict.length && conflict.every((c) => String(r[c]) === String(p[c])));
        if (i >= 0) rows[i] = { ...rows[i], ...p };
        else rows.push({ ...p });
      }
      return { data: payload, error: null };
    }
    if (op === "update") {
      rows.filter(match).forEach((r) => Object.assign(r, payload));
      return { data: null, error: null };
    }
    if (op === "delete") {
      for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i])) rows.splice(i, 1);
      return { data: null, error: null };
    }
    return { data: null, error: null };
  }
  const q = {
    select: () => q,
    order: () => q,
    limit: () => q,
    eq: (c, v) => {
      if (c === "user_id" && bad(v)) err = uuidError(v);
      filters.push([c, v]);
      return q;
    },
    insert: (p) => { op = "insert"; payload = [].concat(p); return q; },
    upsert: (p, o = {}) => { op = "upsert"; payload = [].concat(p); conflict = String(o.onConflict || "").split(",").filter(Boolean); return q; },
    update: (p) => { op = "update"; payload = p; return q; },
    delete: () => { op = "delete"; return q; },
    maybeSingle: () => run().then((r) => ({ ...r, data: r.data ? r.data[0] || null : null })),
    single: () => run().then((r) => ({ ...r, data: r.data ? r.data[0] || null : null })),
    then: (ok, ko) => run().then(ok, ko),
  };
  return q;
}

const db = { from: query, rpc: async () => ({ data: null, error: null }) };

export async function serverClient() {
  return {
    auth: {
      exchangeCodeForSession: async () =>
        state.exchangeError ? { data: null, error: state.exchangeError } : { data: { user: state.user, session: { user: state.user } }, error: null },
      verifyOtp: async ({ token_hash }) => {
        state.verified = token_hash;
        return state.exchangeError || !token_hash ? { data: null, error: state.exchangeError || { message: "bad token" } } : { data: { user: state.user, session: { user: state.user } }, error: null };
      },
      getUser: async () => ({ data: { user: state.user } }),
    },
    from: query,
  };
}
export async function currentUser() {
  return state.user;
}
export function adminClient() {
  return db;
}
