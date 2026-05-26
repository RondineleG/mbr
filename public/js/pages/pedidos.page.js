/* ═══════════════════════════════════════════════════════════════
   PEDIDOS PAGE — histórico + rastreamento realtime (timeline)
   Alimentado por store.orders (watchUserOrders em session.js).
   ═══════════════════════════════════════════════════════════════ */
import { setHtml, escapeHtml, onAction } from "../utils/dom.js";
import { toast, toastSuccess, toastError } from "../components/toast.js";
import { openChat } from "../components/chat.js";
import { getUnread, onUnreadChange, markRead } from "../components/chat-notifier.js";
import * as store from "../app/state.js";
import { money, dateShort } from "../utils/format.js";
import { ORDER_STATUS_LABELS, cancelOrder } from "../services/order.service.js";
import { getOrderStats } from "../services/order.service.js";
import { emptyState, withEmpty } from "../utils/loading.js";
import { navigate } from "../app/router.js";
import { modalConfirm } from "../components/modal.js";
import { CANCEL_WINDOW_MS } from "../utils/constants.js";

// criadoEm pode ser número (Date.now) ou Timestamp do Firestore.
const toMillis = (v) => v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === "number" ? v : 0));
const cancelRemaining = (o) => {
  const created = toMillis(o.criadoEm || o.createdAt);
  return created ? Math.max(0, created + CANCEL_WINDOW_MS - Date.now()) : 0;
};

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getStatusBadge(status) {
  const badges = {
    recebido: '<span class="badge badge-info">Recebido</span>',
    analisando: '<span class="badge badge-warning">Analisando</span>',
    aprovado: '<span class="badge badge-success">Aprovado</span>',
    producao: '<span class="badge badge-info">Em Produção</span>',
    enviado: '<span class="badge badge-info">Enviado</span>',
    entregue: '<span class="badge badge-success">Entregue</span>',
    cancelado: '<span class="badge badge-danger">Cancelado</span>'
  };
  return badges[status] || status;
}

function renderStats(stats) {
  if (!stats) return "";
  
  return `<div class="pedidos-stats">
    <div class="pedido-stat-card">
      <div class="pedido-stat-value">${stats.total}</div>
      <div class="pedido-stat-label">Total</div>
    </div>
    <div class="pedido-stat-card">
      <div class="pedido-stat-value">${stats.entregues}</div>
      <div class="pedido-stat-label">Entregues</div>
    </div>
    <div class="pedido-stat-card">
      <div class="pedido-stat-value">${stats.recebidos + stats.analisando}</div>
      <div class="pedido-stat-label">Pendentes</div>
    </div>
    <div class="pedido-stat-card">
      <div class="pedido-stat-value">${money(stats.valorTotal)}</div>
      <div class="pedido-stat-label">Valor Total</div>
    </div>
  </div>`;
}

function timeline(order) {
  if (!order.timeline || order.timeline.length === 0) return "";
  
  return `<div class="order-timeline">
    <div class="timeline-title">Timeline do Pedido</div>
    ${order.timeline.map((entry, index) => `
      <div class="timeline-entry">
        <div class="timeline-dot ${index === order.timeline.length - 1 ? 'active' : ''}"></div>
        <div class="timeline-content">
          <div class="timeline-status">${ORDER_STATUS_LABELS[entry.status] || entry.status}</div>
          <div class="timeline-time">${formatDate(entry.timestamp)}</div>
          ${entry.observacao ? `<div class="timeline-obs">${escapeHtml(entry.observacao)}</div>` : ""}
        </div>
      </div>
    `).join("")}
  </div>`;
}

function orderCard(o) {
  const itemsLine = (o.items || []).map((it) => `${it.qty || 1}× ${it.name}`).join(" · ");
  const showTimeline = o.status !== "cancelado";
  const canRepeat = o.status !== "cancelado" && o.items && o.items.length > 0;

  // Janela de cancelamento: só enquanto "recebido" e dentro de CANCEL_WINDOW_MS.
  const remaining = o.status === "recebido" ? cancelRemaining(o) : 0;
  const canCancel = remaining > 0;
  const secs = Math.ceil(remaining / 1000);

  const cancelBlock = canCancel ? `
    <div class="order-cancel">
      <button class="order-cancel-btn" data-action="cancel-order" data-order-id="${o.id}">✕ Cancelar pedido</button>
      <span class="order-cancel-timer">Cancelável por mais <b id="canceltimer-${o.id}">${secs}s</b></span>
    </div>` : (o.status === "recebido" ? `
    <div class="order-cancel"><span class="order-cancel-locked">🔒 Prazo de cancelamento encerrado · pedido em análise</span></div>` : "");

  return `<div class="order-card">
    <div class="order-card-head">
      <div>
        <div class="order-id">${o.numeroPedido || "#" + (o.id || "").slice(-6).toUpperCase()}</div>
        <div class="order-date">${formatDate(o.criadoEm || o.createdAt)}</div>
      </div>
      <div style="text-align:right">
        <div class="order-total">${money(o.total)}</div>
        <div class="order-badge" style="margin-top:4px">${getStatusBadge(o.status)}</div>
      </div>
    </div>
    <div class="order-items-line">${escapeHtml(itemsLine)}</div>
    ${cancelBlock}
    ${showTimeline ? timeline(o) : ""}
    ${(canRepeat || (o.agenteResponsavel && o.status !== "cancelado")) ? `
      <div class="order-actions">
        ${canRepeat ? `<button class="order-repeat-btn" data-action="repeat-order" data-order-id="${o.id}">🔄 Repetir Pedido</button>` : ""}
        ${(o.agenteResponsavel && o.status !== "cancelado") ? `<button class="order-repeat-btn" data-action="order-chat" data-order-id="${o.id}">💬 Falar com entregador${getUnread(o.id) ? ` <span class="chat-badge">${getUnread(o.id)}</span>` : ""}</button>` : ""}
      </div>
    ` : ""}
  </div>`;
}

export async function renderPedidos() {
  const orders = store.get("orders");
  const profile = store.get("profile");
  
  if (!orders || orders.length === 0) {
    setHtml("pedidosContent", emptyState(
      "📦",
      "Nenhuma operação ainda",
      "Seus pedidos aparecerão aqui em tempo real"
    ));
    return;
  }
  
  // Calcular estatísticas
  let stats = null;
  if (profile) {
    try {
      stats = await getOrderStats(profile.uid, profile.role === "agent" ? profile.uid : null);
    } catch (err) {
      console.error("Erro ao calcular estatísticas:", err);
    }
  }
  
  const content = withEmpty(
    renderStats(stats) + orders.map(orderCard).join(""),
    !orders || orders.length === 0,
    {
      icon: "📦",
      title: "Nenhuma operação ainda",
      description: "Seus pedidos aparecerão aqui em tempo real"
    }
  );
  
  setHtml("pedidosContent", content);
}

export function initPedidos() {
  // Realtime: qualquer mudança em orders re-renderiza (inclui troca de status pelo admin).
  store.subscribe("orders", renderPedidos);

  // Chat com o entregador (motoboy) do pedido.
  onAction("order-chat", (el) => {
    const profile = store.get("profile");
    markRead(el.dataset.orderId);
    if (profile) openChat(el.dataset.orderId, profile, "Entregador");
  });

  // Atualiza os badges de não-lidas ao vivo.
  onUnreadChange(() => { if (store.get("page") === "pedidos") renderPedidos(); });
  
  // Handler para repetir pedido
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="repeat-order"]');
    if (btn) {
      const orderId = btn.dataset.orderId;
      const orders = store.get("orders");
      const order = orders.find(o => o.id === orderId);
      
      if (order && order.items) {
        // Adicionar itens ao carrinho
        order.items.forEach(item => {
          store.cartAdd({
            key: `${item.name}-${Date.now()}-${Math.random()}`,
            name: item.name,
            icon: item.icon || '🍔',
            price: item.price,
            qty: item.qty || 1,
            desc: item.desc || ''
          });
        });
        
        toast("success", "🛒", "Itens adicionados à sacola");
        navigate("sacola");
      }
    }
  });

  // Cancelar pedido (somente dentro da janela de 120s).
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="cancel-order"]');
    if (!btn) return;
    const orderId = btn.dataset.orderId;
    const order = (store.get("orders") || []).find((o) => o.id === orderId);
    if (!order || cancelRemaining(order) <= 0) { toastError("Prazo de cancelamento encerrado"); renderPedidos(); return; }
    const ok = await modalConfirm({ title: "Cancelar pedido", message: "Tem certeza? Esta ação não pode ser desfeita.", confirmText: "Cancelar pedido", danger: true });
    if (!ok) return;
    btn.disabled = true;
    try { await cancelOrder(orderId); toast("success", "✓", "Pedido cancelado"); }
    catch (err) { console.error("Erro ao cancelar:", err); toastError("Não foi possível cancelar"); btn.disabled = false; }
  });

  // Timer ao vivo: atualiza a contagem e re-renderiza quando a janela expira.
  setInterval(() => {
    const orders = store.get("orders") || [];
    let expired = false;
    orders.forEach((o) => {
      if (o.status !== "recebido") return;
      const span = document.getElementById(`canceltimer-${o.id}`);
      if (!span) return;
      const rem = Math.ceil(cancelRemaining(o) / 1000);
      if (rem > 0) span.textContent = rem + "s";
      else expired = true;
    });
    if (expired) renderPedidos();
  }, 1000);
}
