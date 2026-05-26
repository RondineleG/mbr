/* ═══════════════════════════════════════════════════════════════
   CHAT SERVICE — mensagens por pedido (motoboy ↔ cliente)
   Coleção: orderMessages { orderId, from, fromRole, text, createdAt }
   ═══════════════════════════════════════════════════════════════ */
import { addDoc, watchCollection, tsNow } from "../firebase/db.service.js";

const toMillis = (v) =>
  v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === "number" ? v : 0));

/** Envia uma mensagem no chat do pedido. */
export function sendMessage(orderId, { from, fromRole, text }) {
  const t = (text || "").trim();
  if (!t) return Promise.resolve(null);
  return addDoc("orderMessages", { orderId, from, fromRole, text: t, createdAt: tsNow() });
}

/** Observa o chat do pedido (ordena no cliente p/ não exigir índice composto). */
export function watchMessages(orderId, cb) {
  return watchCollection("orderMessages", { where: [["orderId", "==", orderId]] }, (rows) => {
    cb((rows || []).sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt)));
  });
}
