/* ═══════════════════════════════════════════════════════════════
   ORDER SERVICE — pedidos (collection orders)
   ═══════════════════════════════════════════════════════════════ */
import { addDoc, updateDoc, getDoc, getCollection, watchCollection, tsNow } from "../firebase/db.service.js";
import { adjustPoints } from "./points.service.js";
import { DELIVERY_FEE, POINTS_PER_BRL } from "../utils/constants.js";

/**
 * Cria um pedido a partir do carrinho.
 * @param {{uid,codename,items,address}} input  items: [{name,icon,price,qty,desc}]
 */
export async function createOrder({ uid, codename, items, address }) {
  const subtotal = items.reduce((a, it) => a + it.price * (it.qty || 1), 0);
  const total = subtotal + DELIVERY_FEE;
  const order = {
    userId: uid,
    codename: codename || "",
    status: "received",
    items,
    subtotal,
    deliveryFee: DELIVERY_FEE,
    total,
    pointsEarned: Math.round(total * POINTS_PER_BRL),
    pointsAwarded: false,
    address: address || {},
    createdAt: tsNow(),
    updatedAt: tsNow(),
  };
  const id = await addDoc("orders", order);
  return { id, ...order };
}

/** Pedidos do agente (realtime). */
export function watchUserOrders(uid, cb) {
  return watchCollection("orders", { where: [["userId", "==", uid]], orderBy: ["createdAt", "desc"] }, cb);
}

/** Todos os pedidos (admin, realtime). */
export function watchAllOrders(cb) {
  return watchCollection("orders", { orderBy: ["createdAt", "desc"] }, cb);
}

export const listUserOrders = (uid) =>
  getCollection("orders", { where: [["userId", "==", uid]], orderBy: ["createdAt", "desc"] });

/**
 * Atualiza o status do pedido. Ao marcar "delivered", credita os
 * méritos uma única vez (pontosAwarded evita crédito duplicado).
 */
export async function updateStatus(orderId, status) {
  await updateDoc(`orders/${orderId}`, { status, updatedAt: tsNow() });

  if (status === "delivered") {
    const order = await getDoc(`orders/${orderId}`);
    if (order && !order.pointsAwarded && order.userId) {
      await adjustPoints(order.userId, order.pointsEarned || 0, "Pedido entregue", orderId);
      await updateDoc(`orders/${orderId}`, { pointsAwarded: true });
    }
  }
}
