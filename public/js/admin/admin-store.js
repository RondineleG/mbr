/* ═══════════════════════════════════════════════════════════════
   ADMIN STORE — pedidos em tempo real compartilhados entre seções
   ═══════════════════════════════════════════════════════════════ */
import { watchAllOrders } from "../services/order.service.js";

let orders = [];
const subs = new Set();
let unsub = null;

export const getOrders = () => orders;
export function subscribeOrders(fn) { subs.add(fn); fn(orders); return () => subs.delete(fn); }

export function startOrdersWatch() {
  if (unsub) return;
  unsub = watchAllOrders((list) => {
    orders = list;
    subs.forEach((fn) => fn(orders));
  });
}
