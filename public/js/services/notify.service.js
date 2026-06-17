/* ═══════════════════════════════════════════════════════════════
   NOTIFY SERVICE — notificações de status do pedido (client-side).
   Usa a Notifications API + Service Worker (registration.showNotification),
   disparadas quando o realtime detecta mudança de status do pedido.
   Sem servidor: funciona com o app aberto/em background no mesmo device.
   Push remoto com o app fechado exige FCM (ver issue #19).
   ═══════════════════════════════════════════════════════════════ */
import { ORDER_STATUS_LABELS } from "./order.service.js";

const PREF = "mrbur:notify";
const NOTIFY_STATES = ["aprovado", "producao", "enviado", "entregue"];
const MSG = {
  aprovado: "Pedido aprovado ✅",
  producao: "Seu pedido entrou em produção 🍳",
  enviado: "Saiu para entrega 🛵",
  entregue: "Pedido entregue 📦 Bom apetite!",
};

export const notifySupported = () => typeof window !== "undefined" && "Notification" in window;
export const notifyEnabled = () =>
  notifySupported() && Notification.permission === "granted" && localStorage.getItem(PREF) === "1";

/** Liga/desliga a preferência; pede permissão ao ligar. Retorna o novo estado. */
export async function toggleNotify() {
  if (!notifySupported()) return false;
  if (notifyEnabled()) { localStorage.removeItem(PREF); return false; }
  let perm = Notification.permission;
  if (perm !== "granted") perm = await Notification.requestPermission();
  if (perm === "granted") { localStorage.setItem(PREF, "1"); return true; }
  return false;
}

async function show(title, body, tag) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.showNotification) {
      await reg.showNotification(title, { body, tag, icon: "/icon-192.png", badge: "/icon-96.png", data: { url: "/" } });
      return;
    }
  } catch { /* cai no fallback */ }
  try { new Notification(title, { body, tag, icon: "/icon-192.png" }); } catch { /* sem permissão/suporte */ }
}

/**
 * Notifica numa transição de status relevante. Só dispara quando JÁ vimos o
 * pedido antes nesta sessão (prevStatus definido) — evita spam no login.
 */
export function notifyStatusChange(order, prevStatus) {
  if (!notifyEnabled() || !order || !prevStatus) return;
  const s = order.status;
  if (s === prevStatus || !NOTIFY_STATES.includes(s)) return;
  const num = order.numeroPedido || ("#" + (order.id || "").slice(-6).toUpperCase());
  show(`MrBur · ${num}`, MSG[s] || ORDER_STATUS_LABELS[s] || s, `order-${order.id}`);
}
