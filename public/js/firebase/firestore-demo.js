/* ═══════════════════════════════════════════════════════════════
   FIRESTORE DEMO — backend fake sobre localStorage
   ───────────────────────────────────────────────────────────────
   Implementa a MESMA interface de db.service usando localStorage,
   com REALTIME real entre abas via o evento "storage" (que dispara
   em outras abas da mesma origem). Permite demonstrar o app — e o
   admin mudando status refletindo no cliente — sem credenciais.
   ═══════════════════════════════════════════════════════════════ */

const PREFIX = "mrbur:db:";
const PING_KEY = "mrbur:db:__ping__";

const read = (col) => {
  try { return JSON.parse(localStorage.getItem(PREFIX + col) || "[]"); }
  catch { return []; }
};
const write = (col, rows) => {
  localStorage.setItem(PREFIX + col, JSON.stringify(rows));
  // Notifica esta aba e dispara "storage" nas outras abas.
  localStorage.setItem(PING_KEY, JSON.stringify({ col, ts: Date.now(), r: Math.random() }));
  notifyLocal(col);
};

const uid = () => "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ─── Bus de listeners (mesma aba) ─── */
const listeners = new Map(); // col -> Set<fn>
function notifyLocal(col) {
  (listeners.get(col) || new Set()).forEach((fn) => {
    try { fn(); } catch (e) { console.error(e); }
  });
}
function subscribe(col, fn) {
  if (!listeners.has(col)) listeners.set(col, new Set());
  listeners.get(col).add(fn);
  return () => listeners.get(col)?.delete(fn);
}

// Outras abas → re-dispara o listener local da coleção alterada.
window.addEventListener("storage", (e) => {
  if (e.key === PING_KEY && e.newValue) {
    try { notifyLocal(JSON.parse(e.newValue).col); } catch { /* ignore */ }
  }
});

/* ─── path helpers: "col" ou "col/id" ─── */
const parse = (path) => {
  const parts = path.split("/").filter(Boolean);
  return { col: parts[0], id: parts[1] };
};

const applyQuery = (rows, opts = {}) => {
  let out = rows.slice();
  (opts.where || []).forEach(([field, op, val]) => {
    out = out.filter((r) => {
      const v = r[field];
      switch (op) {
        case "==": return v === val;
        case "!=": return v !== val;
        case ">": return v > val;
        case ">=": return v >= val;
        case "<": return v < val;
        case "<=": return v <= val;
        case "in": return Array.isArray(val) && val.includes(v);
        default: return true;
      }
    });
  });
  if (opts.orderBy) {
    const [field, dir = "asc"] = opts.orderBy;
    out.sort((a, b) => {
      const av = a[field], bv = b[field];
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return dir === "desc" ? -cmp : cmp;
    });
  }
  if (opts.limit) out = out.slice(0, opts.limit);
  return out;
};

/* ═══ API pública (espelha db.service) ═══ */

export async function getDoc(path) {
  const { col, id } = parse(path);
  return read(col).find((r) => r.id === id) || null;
}

export async function setDoc(path, data, { merge = false } = {}) {
  const { col, id } = parse(path);
  const rows = read(col);
  const i = rows.findIndex((r) => r.id === id);
  const base = merge && i >= 0 ? rows[i] : { id };
  const resolved = resolveOps(i >= 0 ? rows[i] : null, data); // aplica increment()
  const next = { ...base, ...resolved, id };
  if (i >= 0) rows[i] = next; else rows.push(next);
  write(col, rows);
  return next;
}

export async function updateDoc(path, partial) {
  return setDoc(path, partial, { merge: true });
}

export async function addDoc(col, data) {
  const id = data.id || uid();
  await setDoc(`${col}/${id}`, { ...data, id });
  return id;
}

export async function deleteDoc(path) {
  const { col, id } = parse(path);
  write(col, read(col).filter((r) => r.id !== id));
}

export async function getCollection(col, opts = {}) {
  return applyQuery(read(col), opts);
}

export function watchDoc(path, cb) {
  const { col, id } = parse(path);
  const emit = () => cb(read(col).find((r) => r.id === id) || null);
  emit();
  return subscribe(col, emit);
}

export function watchCollection(col, opts, cb) {
  if (typeof opts === "function") { cb = opts; opts = {}; }
  const emit = () => cb(applyQuery(read(col), opts));
  emit();
  return subscribe(col, emit);
}

/** Transação simplificada: dá acesso de leitura/escrita síncrono ao caller. */
export async function runTransaction(fn) {
  const tx = {
    get: (path) => getDoc(path),
    set: (path, data, o) => setDoc(path, data, o),
    update: (path, data) => updateDoc(path, data),
  };
  return fn(tx);
}

/** Incremento atômico (no demo é só ler+somar). */
export function increment(n) {
  return { __op: "increment", n };
}

/** Aplica operações especiais (increment) — usado internamente pelo service. */
export function resolveOps(current, partial) {
  const out = { ...partial };
  for (const k of Object.keys(partial)) {
    const v = partial[k];
    if (v && v.__op === "increment") out[k] = (Number(current?.[k]) || 0) + v.n;
  }
  return out;
}

export const serverTimestamp = () => Date.now();
