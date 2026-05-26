/* ═══════════════════════════════════════════════════════════════
   CHAT NOTIFIER — avisa (toast) quando chega mensagem nova de OUTRA pessoa,
   sem precisar abrir o chat. Mantém um watcher por pedido ativo.
   ═══════════════════════════════════════════════════════════════ */
import { watchMessages } from "../services/chat.service.js";
import { toast } from "./toast.js";

const watchers = new Map(); // orderId -> { unsub, baseline }

const tsOf = (m) => {
  const v = m?.createdAt;
  return v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === "number" ? v : 0));
};

/**
 * Sincroniza os watchers de chat com a lista de pedidos atual.
 * Toca um toast quando surge mensagem nova de outra pessoa (from !== meUid).
 * A 1ª leitura de cada pedido só estabelece a baseline (não notifica histórico).
 */
export function syncChatNotifiers(orderIds, meUid) {
  const ids = new Set(orderIds || []);

  // Encerra watchers de pedidos que saíram da lista.
  for (const [id, w] of watchers) {
    if (!ids.has(id)) { w.unsub?.(); watchers.delete(id); }
  }

  // Cria watchers para pedidos novos.
  for (const id of ids) {
    if (watchers.has(id)) continue;
    const w = { unsub: null, baseline: null };
    watchers.set(id, w);
    w.unsub = watchMessages(id, (msgs) => {
      if (!msgs.length) { if (w.baseline == null) w.baseline = 0; return; }
      const last = msgs[msgs.length - 1];
      const lastTs = tsOf(last);
      if (w.baseline == null) { w.baseline = lastTs; return; } // baseline silenciosa
      if (lastTs > w.baseline) {
        w.baseline = lastTs;
        if (last.from && last.from !== meUid) {
          const who = last.fromRole ? `${last.fromRole}` : "alguém";
          const preview = String(last.text || "").slice(0, 40);
          toast("info", "💬", `Nova mensagem de ${who}: ${preview}`);
        }
      }
    });
  }
}

/** Encerra todos os watchers (ex.: logout). */
export function stopChatNotifiers() {
  for (const [, w] of watchers) w.unsub?.();
  watchers.clear();
}
