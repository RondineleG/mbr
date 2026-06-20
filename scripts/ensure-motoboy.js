/* Garante motoboy:true no agente3 (persona de entregas dos testes E2E). Idempotente. */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();
const db = admin.firestore();

(async () => {
  const email = process.argv[2] || 'agente3@mrbur.com';
  const user = await auth.getUserByEmail(email);
  const ref = db.collection('users').doc(user.uid);
  const before = (await ref.get()).data() || {};
  if (before.motoboy === true) {
    console.log(`✅ ${email} (${before.codename || user.uid}) já é motoboy.`);
  } else {
    await ref.set({ motoboy: true }, { merge: true });
    console.log(`🛵 ${email} (${before.codename || user.uid}) → motoboy:true definido.`);
  }
  process.exit(0);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
