/* ═══════════════════════════════════════════════════════════════
   ORDER SERVICE — pedidos (collection orders)
   Entidade Pedido: id, numeroPedido, cliente, agenteResponsavel, itens, 
   status, timeline, valor, pagamento, observacoes, anexos, criadoEm, atualizadoEm
   ═══════════════════════════════════════════════════════════════ */
import { addDoc, updateDoc, getDoc, getCollection, watchCollection, tsNow } from "../firebase/db.service.js";
import { adjustPoints } from "./points.service.js";
import { updateMissionProgress, calculateUserStats } from "./mission.service.js";
import { DELIVERY_FEE, POINTS_PER_BRL } from "../utils/constants.js";

// Status possíveis do pedido
export const ORDER_STATUS = {
  RECEIVED: "recebido",
  ANALYZING: "analisando",
  APPROVED: "aprovado",
  PRODUCTION: "producao",
  SENT: "enviado",
  DELIVERED: "entregue",
  CANCELLED: "cancelado"
};

// Labels para exibição
export const ORDER_STATUS_LABELS = {
  recebido: "Recebido",
  analisando: "Analisando",
  aprovado: "Aprovado",
  producao: "Em Produção",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado"
};

/**
 * Gera número único do pedido
 */
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${year}${month}-${random}`;
}

/**
 * Cria um pedido a partir do carrinho.
 * @param {{uid,codename,items,address,agenteResponsavel}} input  items: [{name,icon,price,qty,desc}]
 */
export async function createOrder({ uid, codename, items, address, agenteResponsavel = null }) {
  const subtotal = items.reduce((a, it) => a + it.price * (it.qty || 1), 0);
  const total = subtotal + DELIVERY_FEE;
  const numeroPedido = generateOrderNumber();
  
  const order = {
    numeroPedido,
    userId: uid,
    cliente: codename || "",
    agenteResponsavel: agenteResponsavel || null,
    status: ORDER_STATUS.RECEIVED,
    items: items.map(it => ({
      name: String(it.name || ""),
      icon: String(it.icon || ""),
      price: Number(it.price) || 0,
      qty: Number(it.qty) || 1,
      desc: String(it.desc || "")
    })),
    subtotal,
    deliveryFee: DELIVERY_FEE,
    total,
    pointsEarned: Math.round(total * POINTS_PER_BRL),
    pointsAwarded: false,
    address: address || {},
    pagamento: {
      metodo: "pendente",
      status: "pendente",
      valor: total
    },
    observacoes: "",
    anexos: [],
    timeline: [{
      status: ORDER_STATUS.RECEIVED,
      timestamp: Date.now(),
      observacao: "Pedido recebido"
    }],
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
  };
  const id = await addDoc("orders", order);
  
  // Atualizar progresso de missões automaticamente
  try {
    const userStats = await calculateUserStats(uid);
    await updateMissionProgress(uid, userStats);
  } catch (error) {
    console.error('Erro ao atualizar missões:', error);
    // Não interromper o fluxo do pedido se missões falharem
  }
  
  return { id, ...order };
}

/** Pedidos do agente (realtime). */
export function watchUserOrders(uid, cb) {
  return watchCollection("orders", { where: [["userId", "==", uid]], orderBy: ["criadoEm", "desc"] }, cb);
}

/** Pedidos vinculados a um agente específico (realtime). */
export function watchAgentOrders(agentId, cb) {
  return watchCollection("orders", { where: [["agenteResponsavel", "==", agentId]], orderBy: ["criadoEm", "desc"] }, cb);
}

/** Todos os pedidos (admin, realtime). */
export function watchAllOrders(cb) {
  return watchCollection("orders", { orderBy: ["criadoEm", "desc"] }, cb);
}

/** Atribui (ou remove) o motoboy/agente responsável pela entrega do pedido. */
export async function assignAgent(orderId, agentId) {
  await updateDoc(`orders/${orderId}`, { agenteResponsavel: agentId || null, atualizadoEm: Date.now() });
}

// Só `where` (sem orderBy) p/ não exigir índice composto; ordena no cliente por criadoEm desc.
const byCriadoEmDesc = (a, b) => (b.criadoEm || 0) - (a.criadoEm || 0);

export const listUserOrders = async (uid) =>
  (await getCollection("orders", { where: [["userId", "==", uid]] })).sort(byCriadoEmDesc);

export const listAgentOrders = async (agentId) =>
  (await getCollection("orders", { where: [["agenteResponsavel", "==", agentId]] })).sort(byCriadoEmDesc);

/**
 * Atualiza o status do pedido e adiciona entrada na timeline.
 * Ao marcar "entregue", credita os méritos uma única vez.
 */
export async function updateStatus(orderId, status, observacao = "") {
  const order = await getDoc(`orders/${orderId}`);
  if (!order) throw new Error("Pedido não encontrado");
  
  const timelineEntry = {
    status,
    timestamp: Date.now(),
    observacao: observacao || ORDER_STATUS_LABELS[status] || status
  };
  
  const updateData = {
    status,
    timeline: [...(order.timeline || []), timelineEntry],
    atualizadoEm: Date.now()
  };
  
  await updateDoc(`orders/${orderId}`, updateData);

  if (status === ORDER_STATUS.DELIVERED) {
    if (!order.pointsAwarded && order.userId) {
      // Crédito de méritos ao cliente. Pode falhar se quem entrega for o motoboy
      // (sem permissão de escrever no doc do cliente) — não deve quebrar a baixa
      // do status. O admin (ou a Fase 2) reconcilia o crédito.
      try {
        await adjustPoints(order.userId, order.pointsEarned || 0, "Pedido entregue", orderId);
        await updateDoc(`orders/${orderId}`, { pointsAwarded: true });
      } catch (err) {
        console.warn("[order] status atualizado, mas crédito de méritos adiado:", err?.message || err);
      }
    }
  }
}

/**
 * Adiciona observação interna ao pedido (admin)
 */
export async function addObservation(orderId, observacao) {
  const order = await getDoc(`orders/${orderId}`);
  if (!order) throw new Error("Pedido não encontrado");
  
  await updateDoc(`orders/${orderId}`, {
    observacoes: (order.observacoes || "") + `\n[${new Date().toLocaleString()}] ${observacao}`,
    atualizadoEm: tsNow()
  });
}

/**
 * Cancela um pedido
 */
export async function cancelOrder(orderId, motivo = "") {
  return updateStatus(orderId, ORDER_STATUS.CANCELLED, motivo || "Pedido cancelado");
}

/**
 * Obtém estatísticas de pedidos para dashboard
 */
export async function getOrderStats(userId = null, agentId = null) {
  let orders;
  if (userId) {
    orders = await listUserOrders(userId);
  } else if (agentId) {
    orders = await listAgentOrders(agentId);
  } else {
    orders = await getCollection("orders", { orderBy: ["criadoEm", "desc"] });
  }
  
  return {
    total: orders.length,
    recebidos: orders.filter(o => o.status === ORDER_STATUS.RECEIVED).length,
    analisando: orders.filter(o => o.status === ORDER_STATUS.ANALYZING).length,
    aprovados: orders.filter(o => o.status === ORDER_STATUS.APPROVED).length,
    producao: orders.filter(o => o.status === ORDER_STATUS.PRODUCTION).length,
    enviados: orders.filter(o => o.status === ORDER_STATUS.SENT).length,
    entregues: orders.filter(o => o.status === ORDER_STATUS.DELIVERED).length,
    cancelados: orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length,
    valorTotal: orders.reduce((acc, o) => acc + (o.total || 0), 0)
  };
}
