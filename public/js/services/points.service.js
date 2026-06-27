/* ═══════════════════════════════════════════════════════════════
   POINTS SERVICE — méritos, extrato e progressão de rank
   collections: 
   - pointsHistory: { userId, delta, reason, orderId, type, createdAt }
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, updateDoc, addDoc, getCollection, inc, tsNow } from "../firebase/db.service.js";
import { rankFromPoints, toMillis } from "../utils/format.js";

/**
 * Credita/debita méritos do agente e registra no extrato.
 * Recalcula rank/level a partir do total resultante.
 */
export async function adjustPoints(uid, delta, reason, orderId = null) {
  // Lê o total atual para recalcular rank (o increment cuida do valor real).
  // getDoc direto pelo id do doc (= uid) evita query de coleção desnecessária.
  const user = await getDoc(`users/${uid}`);
  const current = user?.points || 0;
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

export async function getHistory(uid) {
  // Só `where` (sem orderBy) p/ não exigir índice composto; ordena no cliente.
  const rows = await getCollection("pointsHistory", { where: [["userId", "==", uid]] });
  return rows
    // Normaliza os dois schemas existentes: adjustPoints grava {reason, delta};
    // mission.service grava {description, amount}. Sem isto, linhas de missão
    // renderizam "undefined" no extrato.
    .map((r) => ({
      ...r,
      reason: r.reason ?? r.description ?? "Transação",
      delta: r.delta ?? r.amount ?? 0,
    }))
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 50);
}
