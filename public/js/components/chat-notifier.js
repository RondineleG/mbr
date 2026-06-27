/* ═══════════════════════════════════════════════════════════════
   CHAT NOTIFIER — avisa (toast) e conta não-lidas por CONVERSA, sem abrir o chat.
   Uma conversa = (pedido, canal). Mantém um watcher por conversa ativa.
   "Lido" é persistido em localStorage pela chave da thread.
   ═══════════════════════════════════════════════════════════════ */
import { watchMessages, threadKey, CHANNELS } from "../services/chat.service.js";
import { toast } from "./toast.js";

const watchers = new Map();   // threadKey -> { unsub, baseline }
const unread = new Map();     // threadKey -> contagem de não-lidas
const listeners = new Set();  // callbacks notificados quando a contagem muda

const ROLE_LABEL = { cliente: "Cliente", motoboy: "Entregador", admin: "Atendimento MrBur" };

const tsOf = (m) => {
  const v = m?.createdAt;
  return v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === "number" ? v : 0));
};
const readKey = (tkey) => "chatRead:" + tkey;
const getLastRead = (tkey) => { try { return +(localStorage.getItem(readKey(tkey)) || 0); } catch { return 0; } };

function setUnread(tkey, n) {
  if (unread.get(tkey) === n) return;
  unread.set(tkey, n);
  listeners.forEach((fn) => { try { fn(); } catch {} });
}

/** Contagem de não-lidas de uma conversa (chave = threadKey(orderId, channel)). */
export function getUnread(tkey) { return unread.get(tkey) || 0; }

/** Total de não-lidas em todas as conversas observadas (badge do topo). */
export function totalUnread() { let n = 0; for (const v of unread.values()) n += v; return n; }

/** Não-lidas somando os canais de um pedido (ex.: na lista de conversas). */
export function unreadForOrder(orderId, channels) {
  return (channels || []).reduce((n, ch) => n + getUnread(threadKey(orderId, ch)), 0);
}

/** Assina mudanças de contagem (para re-renderizar badges). Retorna unsub. */
export function onUnreadChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Marca a conversa como lida (zera não-lidas). */
export function markRead(tkey) {
  try { localStorage.setItem(readKey(tkey), String(Date.now())); } catch {}
  setUnread(tkey, 0);
}

/**
 * Sincroniza watchers com a lista de conversas atual.
 * @param {Array<{orderId:string, channel?:string}>} threads conversas a observar
 * @param {string} meUid uid do usuário corrente (para ignorar as próprias msgs)
 */
export function syncChatNotifiers(threads, meUid) {
  const specs = new Map(); // threadKey -> {orderId, channel}
  for (const t of (threads || [])) {
    const ch = t.channel || CHANNELS.CM;
    specs.set(threadKey(t.orderId, ch), { orderId: t.orderId, channel: ch });
  }

  for (const [tkey, w] of watchers) {
    if (!specs.has(tkey)) { w.unsub?.(); watchers.delete(tkey); unread.delete(tkey); }
  }

  for (const [tkey, { orderId, channel }] of specs) {
    if (watchers.has(tkey)) continue;
    const w = { unsub: null, baseline: null };
    watchers.set(tkey, w);
    w.unsub = watchMessages(orderId, (msgs) => {
      // Não-lidas (persistente): mensagens de outros depois do último "lido".
      const lastRead = getLastRead(tkey);
      setUnread(tkey, (msgs || []).filter((m) => m.from !== meUid && tsOf(m) > lastRead).length);

      // Toast só para mensagem nova (a 1ª leitura é baseline silenciosa).
      if (!msgs.length) { if (w.baseline == null) w.baseline = 0; return; }
      const last = msgs[msgs.length - 1];
      const lastTs = tsOf(last);
      if (w.baseline == null) { w.baseline = lastTs; return; }
      if (lastTs > w.baseline) {
        w.baseline = lastTs;
        if (last.from && last.from !== meUid) {
          const who = ROLE_LABEL[last.fromRole] || last.fromRole || "alguém";
          toast("info", "💬", `Nova mensagem de ${who}: ${String(last.text || "").slice(0, 40)}`);
        }
      }
    }, channel);
  }
}

/** Encerra todos os watchers (ex.: logout). */
export function stopChatNotifiers() {
  for (const [, w] of watchers) w.unsub?.();
  watchers.clear();
  unread.clear();
}
