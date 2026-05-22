/* ═══════════════════════════════════════════════════════════════
   DB SERVICE — fachada única de acesso a dados
   Escolhe a implementação real (Firestore) ou demo (localStorage)
   conforme IS_DEMO. O resto do app só conhece ESTA interface.
   ═══════════════════════════════════════════════════════════════ */
import { IS_DEMO } from "../../firebase-config.js";

const impl = IS_DEMO
  ? await import("./firestore-demo.js")
  : await import("./firestore-real.js");

export const getDoc = impl.getDoc;
export const setDoc = impl.setDoc;
export const updateDoc = impl.updateDoc;
export const addDoc = impl.addDoc;
export const deleteDoc = impl.deleteDoc;
export const getCollection = impl.getCollection;
export const watchDoc = impl.watchDoc;
export const watchCollection = impl.watchCollection;
export const runTransaction = impl.runTransaction;

/** Sentinela de incremento atômico (use em updateDoc/setDoc-merge). */
export const inc = impl.increment;
/** Timestamp do servidor (ms no demo, Timestamp no real). */
export const tsNow = impl.serverTimestamp;
