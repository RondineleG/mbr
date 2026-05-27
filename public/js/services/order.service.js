/* ═══════════════════════════════════════════════════════════════
   ORDER SERVICE — pedidos (collection orders)
   Entidade Pedido: id, numeroPedido, cliente, agenteResponsavel, itens, 
   status, timeline, valor, pagamento, observacoes, anexos, criadoEm, atualizadoEm
   ═══════════════════════════════════════════════════════════════ */
import { addDoc, updateDoc, getDoc, getCollection, watchCollection, tsNow } from "../firebase/db.service.js";
import { adjustPoints } from "./points.service.js";
import { updateMissionProgress, calculateUserStats } from "./mission.service.js";
import { DELIVERY_FEE, POINTS_PER_BRL, ORDER_CUTOFF_HOUR } from "../utils/constants.js";
import { deliveryFeeFor } from "../utils/geo.js";
import { mboxSchedule } from "./specials.service.js";

// Normaliza um item do carrinho para persistência (omite flags ausentes —
// Firestore rejeita undefined). Carrega méritos-off (Lanche do Dia) e a MBox.
function normItem(it) {
  const o = { name: String(it.name || ""), icon: String(it.icon || ""), price: Number(it.price) || 0, qty: Number(it.qty) || 1, desc: String(it.desc || "") };
  if (it.noMeritos) o.noMeritos = true;
  if (it.mbox) { o.mbox = true; o.composicao = it.composicao || []; }
  return o;
}
// Subtotal elegível a méritos (exclui itens noMeritos, como o Lanche do Dia).
const meritEligible = (items) => items.reduce((a, it) => a + (it.noMeritos ? 0 : (Number(it.price) || 0) * (it.qty || 1)), 0);

/**
 * Regra de negócio: pedidos aceitos até as 13h são produzidos/entregues no mesmo
 * dia; após as 13h entram para o PRÓXIMO dia. O cliente pode alterar/cancelar
 * até as 13h do dia de produção (depois disso já está sendo feito, fresco).
 */
export function productionInfo(now = Date.now()) {
  const d = new Date(now);
  const cutoffToday = new Date(d); cutoffToday.setHours(ORDER_CUTOFF_HOUR, 0, 0, 0);
  const agendado = d.getTime() >= cutoffToday.getTime(); // após o corte → próximo dia
  const prod = new Date(d);
  if (agendado) prod.setDate(prod.getDate() + 1);
  prod.setHours(0, 0, 0, 0);
  const cancelavelAte = new Date(prod); cancelavelAte.setHours(ORDER_CUTOFF_HOUR, 0, 0, 0);
  return { agendado, dataEntrega: prod.getTime(), cancelavelAte: cancelavelAte.getTime() };
}

/** O cliente ainda pode alterar/cancelar este pedido? (antes do corte das 13h) */
export function canCancelOrder(order, now = Date.now()) {
  if (!order || order.status === "cancelado" || order.status === "entregue") return false;
  const limit = order.cancelavelAte || 0;
  return limit ? now < limit : false;
}

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
export async function createOrder({ uid, codename, items, address, agenteResponsavel = null, payment = null }) {
  const subtotal = items.reduce((a, it) => a + it.price * (it.qty || 1), 0);
  const fee = deliveryFeeFor(address);          // R$5 + R$0,50/km da sede ao cliente
  const total = subtotal + fee;
  const numeroPedido = generateOrderNumber();
  // MBox tem agendamento próprio (sábado, corte sexta 22h); demais seguem o corte das 13h.
  const hasMbox = items.some((it) => it.mbox);
  const { agendado, dataEntrega, cancelavelAte } = hasMbox ? mboxSchedule() : productionInfo();
  // Méritos só sobre o que é elegível (exclui Lanche do Dia) e nunca se pago com méritos.
  const pointsEarned = payment?.metodo === "meritos" ? 0 : Math.round(meritEligible(items) * POINTS_PER_BRL);

  const order = {
    numeroPedido,
    userId: uid,
    cliente: codename || "",
    agenteResponsavel: agenteResponsavel || null,
    status: ORDER_STATUS.RECEIVED,
    items: items.map(normItem),
    tipo: hasMbox ? "mbox" : "normal",
    subtotal,
    deliveryFee: fee,
    total,
    pointsEarned,
    pointsAwarded: false,
    address: address || {},
    // Agendamento (corte das 13h, ou regra da MBox aos sábados).
    agendado,
    dataEntrega,
    cancelavelAte,
    pagamento: payment
      ? { metodo: payment.metodo, status: payment.status || "pago", valor: total, pagoEm: Date.now() }
      : { metodo: "pendente", status: "pendente", valor: total },
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

/**
 * Edição IN-PLACE: altera os itens do pedido (mesmo número), recalcula total e
 * frete. Se veio `payment`, registra a nova cobrança (diferença paga no checkout).
 */
export async function updateOrderItems(orderId, items, payment = null) {
  const order = await getDoc(`orders/${orderId}`);
  if (!order) throw new Error("Pedido não encontrado");
  if (!canCancelOrder(order)) throw new Error("Prazo de alteração encerrado");
  const subtotal = items.reduce((a, it) => a + (it.price || 0) * (it.qty || 1), 0);
  const fee = deliveryFeeFor(order.address);
  const total = subtotal + fee;
  const update = {
    items: items.map(normItem),
    subtotal, deliveryFee: fee, total,
    pointsEarned: order.pagamento?.metodo === "meritos" ? 0 : Math.round(meritEligible(items) * POINTS_PER_BRL),
    pagamento: payment
      ? { metodo: payment.metodo, status: "pago", valor: total, pagoEm: Date.now() }
      : { ...(order.pagamento || {}), valor: total },
    atualizadoEm: Date.now(),
    timeline: [...(order.timeline || []), { status: order.status, timestamp: Date.now(), observacao: "Pedido alterado pelo cliente" }],
  };
  await updateDoc(`orders/${orderId}`, update);
  return { id: orderId, ...order, ...update };
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

// Pedidos sendo creditados agora (evita corrida/duplo-crédito no realtime).
const _awarding = new Set();

/**
 * Reconciliação de méritos: credita o dono quando um pedido foi entregue mas
 * ficou sem crédito (ex.: quem finalizou foi o motoboy, que não pode escrever
 * no doc do cliente). Só o próprio dono roda isto (tem permissão no seu doc).
 */
export async function reconcileOrderPoints(order, currentUid) {
  if (!order || order.status !== ORDER_STATUS.DELIVERED) return;
  if (order.pointsAwarded || !order.userId || order.userId !== currentUid) return;
  if (_awarding.has(order.id)) return;
  _awarding.add(order.id);
  try {
    await adjustPoints(order.userId, order.pointsEarned || 0, "Pedido entregue", order.id);
    await updateDoc(`orders/${order.id}`, { pointsAwarded: true });
  } catch (err) {
    console.warn("[order] reconciliação de méritos falhou:", err?.message || err);
  } finally {
    _awarding.delete(order.id);
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
