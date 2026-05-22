/* ═══════════════════════════════════════════════════════════════
   FIRESTORE REAL — wrapper sobre o SDK modular do Firebase
   Espelha exatamente a interface de firestore-demo.js.
   ═══════════════════════════════════════════════════════════════ */
import { getFirebase } from "../../firebase-config.js";
import {
  doc, collection, getDoc as fsGetDoc, setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc, addDoc as fsAddDoc, deleteDoc as fsDeleteDoc,
  getDocs, onSnapshot, query, where as fsWhere, orderBy as fsOrderBy,
  limit as fsLimit, runTransaction as fsRunTransaction,
  increment as fsIncrement, serverTimestamp as fsServerTimestamp,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const { db } = await getFirebase();

const docRef = (path) => doc(db, path);
const colRef = (col) => collection(db, col);
const snap = (s) => (s.exists() ? { id: s.id, ...s.data() } : null);

function buildQuery(col, opts = {}) {
  const constraints = [];
  (opts.where || []).forEach(([f, op, v]) => constraints.push(fsWhere(f, op, v)));
  if (opts.orderBy) constraints.push(fsOrderBy(opts.orderBy[0], opts.orderBy[1] || "asc"));
  if (opts.limit) constraints.push(fsLimit(opts.limit));
  return query(colRef(col), ...constraints);
}

export async function getDoc(path) {
  return snap(await fsGetDoc(docRef(path)));
}

export async function setDoc(path, data, { merge = false } = {}) {
  await fsSetDoc(docRef(path), data, { merge });
  return { id: path.split("/").pop(), ...data };
}

export async function updateDoc(path, partial) {
  await fsUpdateDoc(docRef(path), partial);
}

export async function addDoc(col, data) {
  if (data.id) { await fsSetDoc(docRef(`${col}/${data.id}`), data); return data.id; }
  const ref = await fsAddDoc(colRef(col), data);
  return ref.id;
}

export async function deleteDoc(path) {
  await fsDeleteDoc(docRef(path));
}

export async function getCollection(col, opts = {}) {
  const qs = await getDocs(buildQuery(col, opts));
  return qs.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function watchDoc(path, cb) {
  return onSnapshot(docRef(path), (s) => cb(snap(s)));
}

export function watchCollection(col, opts, cb) {
  if (typeof opts === "function") { cb = opts; opts = {}; }
  return onSnapshot(buildQuery(col, opts), (qs) =>
    cb(qs.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function runTransaction(fn) {
  return fsRunTransaction(db, async (t) => {
    const tx = {
      get: async (path) => snap(await t.get(docRef(path))),
      set: (path, data, o = {}) => t.set(docRef(path), data, o),
      update: (path, data) => t.update(docRef(path), data),
    };
    return fn(tx);
  });
}

export const increment = (n) => fsIncrement(n);
export const serverTimestamp = () => fsServerTimestamp();
export function resolveOps(_current, partial) { return partial; }
