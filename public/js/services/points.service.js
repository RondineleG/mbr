/* ═══════════════════════════════════════════════════════════════
   POINTS SERVICE — méritos, extrato e progressão de rank
   collections: 
   - pointsHistory: { userId, delta, reason, orderId, type, createdAt }
   ═══════════════════════════════════════════════════════════════ */
import { updateDoc, addDoc, getCollection, inc, tsNow } from "../firebase/db.service.js";
import { rankFromPoints } from "../utils/format.js";

/**
 * Credita/debita méritos do agente e registra no extrato.
 * Recalcula rank/level a partir do total resultante.
 */
export async function adjustPoints(uid, delta, reason, orderId = null) {
  // Lê o total atual para recalcular rank (o increment cuida do valor real).
  const users = await getCollection("users", { where: [["uid", "==", uid]] });
  const current = users[0]?.points || 0;
  const next = current + delta;
  const rank = rankFromPoints(next);

  await updateDoc(`users/${uid}`, {
    points: inc(delta),
    level: rank.level,
    rank: rank.name,
  });
  await addDoc("pointsHistory", {
    userId: uid,
    delta,
    reason,
    orderId,
    type: "meritos",
    createdAt: tsNow(),
  });
  return next;
}

// Converte createdAt (Timestamp do Firestore | number | Date) em ms para ordenar.
const toMillis = (v) =>
  v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === "number" ? v : 0));

export async function getHistory(uid) {
  // Só `where` (sem orderBy) p/ não exigir índice composto; ordena no cliente.
  const rows = await getCollection("pointsHistory", { where: [["userId", "==", uid]] });
  return rows.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)).slice(0, 50);
}
