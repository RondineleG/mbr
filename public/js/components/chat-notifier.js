/* ═══════════════════════════════════════════════════════════════
   CHAT NOTIFIER — avisa (toast) e conta não-lidas por pedido, sem abrir o chat.
   Mantém um watcher por pedido ativo. "Lido" é persistido em localStorage.
   ═══════════════════════════════════════════════════════════════ */
import { watchMessages } from "../services/chat.service.js";
import { toast } from "./toast.js";

const watchers = new Map();   // orderId -> { unsub, baseline }
const unread = new Map();     // orderId -> contagem de não-lidas
const listeners = new Set();  // callbacks notificados quando a contagem muda

const tsOf = (m) => {
  const v = m?.createdAt;
  return v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === "number" ? v : 0));
};
const readKey = (id) => "chatRead:" + id;
const getLastRead = (id) => { try { return +(localStorage.getItem(readKey(id)) || 0); } catch { return 0; } };

function setUnread(id, n) {
  if (unread.get(id) === n) return;
  unread.set(id, n);
  listeners.forEach((fn) => { try { fn(); } catch {} });
}

/** Contagem de não-lidas de um pedido. */
export function getUnread(id) { return unread.get(id) || 0; }

/** Assina mudanças de contagem (para re-renderizar badges). Retorna unsub. */
export function onUnreadChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Marca o chat do pedido como lido (zera não-lidas). */
export function markRead(id) {
  try { localStorage.setItem(readKey(id), String(Date.now())); } catch {}
  setUnread(id, 0);
}

/**
 * Sincroniza watchers com a lista de pedidos atual.
 * - Atualiza a contagem de não-lidas (mensagens de outros após o "lido").
 * - Toca um toast quando surge mensagem NOVA de outra pessoa (não no histórico).
 */
export function syncChatNotifiers(orderIds, meUid) {
  const ids = new Set(orderIds || []);

  for (const [id, w] of watchers) {
    if (!ids.has(id)) { w.unsub?.(); watchers.delete(id); unread.delete(id); }
  }

  for (const id of ids) {
    if (watchers.has(id)) continue;
    const w = { unsub: null, baseline: null };
    watchers.set(id, w);
    w.unsub = watchMessages(id, (msgs) => {
      // Não-lidas (persistente): mensagens de outros depois do último "lido".
      const lastRead = getLastRead(id);
      setUnread(id, (msgs || []).filter((m) => m.from !== meUid && tsOf(m) > lastRead).length);

      // Toast só para mensagem nova (a 1ª leitura é baseline silenciosa).
      if (!msgs.length) { if (w.baseline == null) w.baseline = 0; return; }
      const last = msgs[msgs.length - 1];
      const lastTs = tsOf(last);
      if (w.baseline == null) { w.baseline = lastTs; return; }
      if (lastTs > w.baseline) {
        w.baseline = lastTs;
        if (last.from && last.from !== meUid) {
          toast("info", "💬", `Nova mensagem de ${last.fromRole || "alguém"}: ${String(last.text || "").slice(0, 40)}`);
        }
      }
    });
  }
}

/** Encerra todos os watchers (ex.: logout). */
export function stopChatNotifiers() {
  for (const [, w] of watchers) w.unsub?.();
  watchers.clear();
  unread.clear();
}
