/* ═══════════════════════════════════════════════════════════════
   POINTS SERVICE — méritos, metiqos, extrato e progressão de rank
   collections: 
   - pointsHistory: { userId, delta, reason, orderId, type, createdAt }
   - metiqosHistory: { userId, delta, reason, type, createdAt }
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

/**
 * Credita/debita Metiqos (moeda virtual) do agente.
 */
export async function adjustMetiqos(uid, delta, reason) {
  await updateDoc(`users/${uid}`, {
    metiqos: inc(delta)
  });
  await addDoc("metiqosHistory", {
    userId: uid,
    delta,
    reason,
    type: "metiqos",
    createdAt: tsNow(),
  });
  
  const users = await getCollection("users", { where: [["uid", "==", uid]] });
  return users[0]?.metiqos || 0;
}

export function getHistory(uid) {
  return getCollection("pointsHistory", {
    where: [["userId", "==", uid]],
    orderBy: ["createdAt", "desc"],
    limit: 50,
  });
}

export function getMetiqosHistory(uid) {
  return getCollection("metiqosHistory", {
    where: [["userId", "==", uid]],
    orderBy: ["createdAt", "desc"],
    limit: 50,
  });
}
