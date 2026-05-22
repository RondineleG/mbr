/* ═══════════════════════════════════════════════════════════════
   PEDIDOS PAGE — histórico + rastreamento realtime (timeline)
   Alimentado por store.orders (watchUserOrders em session.js).
   ═══════════════════════════════════════════════════════════════ */
import { setHtml, escapeHtml } from "../utils/dom.js";
import * as store from "../app/state.js";
import { money, dateShort } from "../utils/format.js";
import { ORDER_STATUS_LABELS } from "../services/order.service.js";
import { getOrderStats } from "../services/order.service.js";
import { emptyState, withEmpty } from "../utils/loading.js";
import { navigate } from "../app/router.js";
import { toast, toastSuccess, toastError } from "../components/toast.js";

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
    ${showTimeline ? timeline(o) : ""}
    ${canRepeat ? `
      <div class="order-actions">
        <button class="order-repeat-btn" data-action="repeat-order" data-order-id="${o.id}">
          🔄 Repetir Pedido
        </button>
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
        
        toastSuccess("🛒", "Itens adicionados à sacola");
        navigate("sacola");
      }
    }
  });
}
