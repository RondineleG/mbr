/* ═══════════════════════════════════════════════════════════════
   CHAT NOTIFIER — avisa (toast) e conta não-lidas por CONVERSA, sem abrir o chat.
   Uma conversa = (pedido, canal). Mantém um watcher por conversa ativa.
   "Lido" é persistido em localStorage pela chave da thread.
   ═══════════════════════════════════════════════════════════════ */
import { watchOrderMessages, threadKey, CHANNELS } from "../services/chat.service.js";
import { toast } from "./toast.js";

const watchers = new Map();   // orderId -> { unsub, baseline, channels:Set, keys:Set }
const unread = new Map();     // threadKey -> contagem de não-lidas
const listeners = new Set();  // callbacks notificados quando a contagem muda
const chanOf = (m) => m?.channel || CHANNELS.CM;

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
 * Sincroniza watchers com a lista de conversas atual. Agrupa por PEDIDO e abre
 * UM único listener por pedido (deriva as não-lidas de cada canal dali), em vez
 * de um listener por canal sobre a mesma query.
 * @param {Array<{orderId:string, channel?:string}>} threads conversas a observar
 * @param {string} meUid uid do usuário corrente (para ignorar as próprias msgs)
 */
export function syncChatNotifiers(threads, meUid) {
  const byOrder = new Map(); // orderId -> Set(channels)
  for (const t of (threads || [])) {
    if (!t || !t.orderId) continue;
    if (!byOrder.has(t.orderId)) byOrder.set(t.orderId, new Set());
    byOrder.get(t.orderId).add(t.channel || CHANNELS.CM);
  }

  // Remove watchers de pedidos que saíram da lista.
  for (const [orderId, w] of watchers) {
    if (!byOrder.has(orderId)) { w.unsub?.(); watchers.delete(orderId); for (const tk of w.keys) unread.delete(tk); }
  }

  for (const [orderId, channels] of byOrder) {
    const existing = watchers.get(orderId);
    if (existing) { existing.channels = channels; continue; } // já observado — atualiza canais
    const w = { unsub: null, baseline: null, channels, keys: new Set() };
    watchers.set(orderId, w);
    w.unsub = watchOrderMessages(orderId, (msgs) => {
      // Não-lidas por canal (persistente): mensagens de outros após o último "lido".
      for (const ch of w.channels) {
        const tk = threadKey(orderId, ch); w.keys.add(tk);
        const lastRead = getLastRead(tk);
        setUnread(tk, msgs.filter((m) => chanOf(m) === ch && m.from !== meUid && tsOf(m) > lastRead).length);
      }
      // Toast p/ a última msg nova de outra pessoa, em qualquer canal observado.
      const watched = msgs.filter((m) => w.channels.has(chanOf(m)));
      if (!watched.length) { if (w.baseline == null) w.baseline = 0; return; }
      const last = watched[watched.length - 1];
      const lastTs = tsOf(last);
      if (w.baseline == null) { w.baseline = lastTs; return; }
      if (lastTs > w.baseline) {
        w.baseline = lastTs;
        if (last.from && last.from !== meUid) {
          const who = ROLE_LABEL[last.fromRole] || last.fromRole || "alguém";
          toast("info", "💬", `Nova mensagem de ${who}: ${String(last.text || "").slice(0, 40)}`);
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
