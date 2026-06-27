/* ═══════════════════════════════════════════════════════════════
   CHAT SERVICE — mensagens por pedido, em 3 canais independentes:
     cm = cliente ↔ motoboy        (legado: docs sem `channel` = cm)
     cp = cliente ↔ plataforma     (atendimento/loja)
     mp = motoboy ↔ plataforma     (suporte ao entregador)
   Coleção: orderMessages { orderId, channel, from, fromRole, text, createdAt }
   ═══════════════════════════════════════════════════════════════ */
import { addDoc, watchCollection, tsNow } from "../firebase/db.service.js";

export const CHANNELS = { CM: "cm", CP: "cp", MP: "mp" };

// Canal de um doc (legado sem campo = cliente↔motoboy).
const chanOf = (m) => m?.channel || CHANNELS.CM;

/** Identidade de uma conversa p/ "lido"/badges. cm mantém a chave = orderId
 *  (compatível com o histórico de "lido" já salvo); os demais usam sufixo. */
export const threadKey = (orderId, channel = CHANNELS.CM) =>
  channel === CHANNELS.CM ? orderId : `${orderId}#${channel}`;

const toMillis = (v) =>
  v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === "number" ? v : 0));

/** Envia uma mensagem no canal do pedido. */
export function sendMessage(orderId, { from, fromRole, text, channel = CHANNELS.CM }) {
  const t = (text || "").trim();
  if (!t) return Promise.resolve(null);
  return addDoc("orderMessages", { orderId, channel, from, fromRole, text: t, createdAt: tsNow() });
}

/** Observa um canal do pedido. Consulta só por orderId (sem índice composto)
 *  e filtra o canal no cliente; ordena por data. */
export function watchMessages(orderId, cb, channel = CHANNELS.CM) {
  return watchCollection("orderMessages", { where: [["orderId", "==", orderId]] }, (rows) => {
    cb((rows || [])
      .filter((m) => chanOf(m) === channel)
      .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt)));
  });
}
