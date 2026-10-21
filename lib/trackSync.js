// The tracking list ("מעקב") lives in this browser (localStorage "landscape-v2", shared with the companies
// app). Signed in, it is also kept in the account (org_follows), so it works on every device:
//   - the first time an account is used on a device, companies saved here before signing in are added to it;
//   - every visit, companies in the account that this browser doesn't have yet are added here.
// Removing a company (company page, companies app, /me) removes it from both. Browser only.
export const TRACK_KEY = "landscape-v2";
export const SYNC_FLAG = "creativein-follows-synced";

const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
export const readTrack = () => { try { return JSON.parse(localStorage.getItem(TRACK_KEY) || "{}"); } catch { return {}; } };
export const writeTrack = (s) => { try { localStorage.setItem(TRACK_KEY, JSON.stringify(s)); return true; } catch { return false; } };
export const newEntry = (id) => ({ org_id: id, stage: "to_pitch", added: today(), updated_at: new Date().toISOString(), v: 1 });

export function setTracked(id, on) {
  const s = readTrack();
  const pipeline = { ...(s.pipeline || {}) };
  if (on) pipeline[id] = pipeline[id] || newEntry(id);
  else delete pipeline[id];
  return writeTrack({ ...s, pipeline, prefs: s.prefs || { crafts: [] } });
}

// follows: the account's company ids (from GET /api/follows). Returns the ids still to add to the account.
export function mergeIntoBrowser(follows) {
  const s = readTrack();
  const pipeline = { ...(s.pipeline || {}) };
  let changed = false;
  for (const id of follows) if (!pipeline[id]) { pipeline[id] = newEntry(id); changed = true; }
  if (changed) writeTrack({ ...s, pipeline, prefs: s.prefs || { crafts: [] } });
  let first = false;
  try { first = !localStorage.getItem(SYNC_FLAG); localStorage.setItem(SYNC_FLAG, "1"); } catch {}
  const have = new Set(follows);
  return first ? Object.keys(s.pipeline || {}).filter((id) => !have.has(id)).slice(0, 100) : [];
}

export async function syncTracking() {
  const j = await fetch("/api/follows", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
  if (!j?.signedIn) return null;
  const toAdd = mergeIntoBrowser(j.follows || []);
  if (toAdd.length) {
    await fetch("/api/follows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ add: toAdd }) }).catch(() => null);
  }
  return { follows: [...new Set([...(j.follows || []), ...toAdd])] };
}
