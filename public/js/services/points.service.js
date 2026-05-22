/* ═══════════════════════════════════════════════════════════════
   POINTS SERVICE — méritos, extrato e progressão de rank
   collection pointsHistory: { userId, delta, reason, orderId, createdAt }
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
    createdAt: tsNow(),
  });
  return next;
}

export function getHistory(uid) {
  return getCollection("pointsHistory", {
    where: [["userId", "==", uid]],
    orderBy: ["createdAt", "desc"],
    limit: 50,
  });
}
