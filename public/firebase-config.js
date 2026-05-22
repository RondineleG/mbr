/* ═══════════════════════════════════════════════════════════════
   FIREBASE CONFIG — MrBur "A Ordem" · projeto: projetohowx
   ───────────────────────────────────────────────────────────────
   A apiKey Web do Firebase é pública por natureza — a segurança real
   vem das Security Rules (firestore.rules / storage.rules).

   Para voltar ao MODO DEMO offline (localStorage), basta trocar a
   apiKey por um valor contendo "XXX".
   ═══════════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: "AIzaSyC3ksjEPoHlSrOchpXXSjGOiQQvkrVg4W4",
  authDomain: "projetohowx.firebaseapp.com",
  projectId: "projetohowx",
  storageBucket: "projetohowx.firebasestorage.app",
  messagingSenderId: "996149288551",
  appId: "1:996149288551:web:7b55107b844a608a18fec2",
  measurementId: "G-W4SJS3EVMQ",
};

/** true enquanto as credenciais forem placeholders (modo demo offline). */
export const IS_DEMO = firebaseConfig.apiKey.includes("XXX");

const SDK = "https://www.gstatic.com/firebasejs/12.13.0";

let _fb = null;
/**
 * Inicializa o Firebase sob demanda (memoizado). Só é chamado pelos
 * adapters "real" — no modo demo o SDK nunca é baixado.
 */
export async function getFirebase() {
  if (_fb) return _fb;
  const { initializeApp } = await import(`${SDK}/firebase-app.js`);
  const { getAuth, setPersistence, browserLocalPersistence } = await import(`${SDK}/firebase-auth.js`);
  const { getFirestore } = await import(`${SDK}/firebase-firestore.js`);
  const { getStorage } = await import(`${SDK}/firebase-storage.js`);
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence).catch(() => {});
  _fb = { app, auth, db: getFirestore(app), storage: getStorage(app) };

  // Analytics é opcional — funciona só em ambientes suportados (https).
  try {
    const { getAnalytics, isSupported } = await import(`${SDK}/firebase-analytics.js`);
    if (await isSupported()) getAnalytics(app);
  } catch { /* ignora — analytics não é essencial */ }

  return _fb;
}
