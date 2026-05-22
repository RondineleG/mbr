/* ═══════════════════════════════════════════════════════════════
   PEDIDOS PAGE — histórico + rastreamento realtime (timeline)
   Alimentado por store.orders (watchUserOrders em session.js).
   ═══════════════════════════════════════════════════════════════ */
import { setHtml, escapeHtml } from "../utils/dom.js";
import * as store from "../app/state.js";
import { money, dateShort } from "../utils/format.js";
import { ORDER_STATUS, ORDER_FLOW } from "../utils/constants.js";

function timeline(status) {
  if (status === "cancelled") return "";
  const currentStep = ORDER_STATUS[status]?.step ?? 0;
  return `<div class="timeline">${ORDER_FLOW.map((s, i) => {
    const meta = ORDER_STATUS[s];
    const cls = i < currentStep ? "done" : i === currentStep ? "current" : "";
    return `<div class="timeline-step ${cls}"><div class="timeline-line"></div><div class="timeline-dot">${meta.icon}</div><div class="timeline-label">${meta.label}</div></div>`;
  }).join("")}</div>`;
}

function orderCard(o) {
  const meta = ORDER_STATUS[o.status] || ORDER_STATUS.received;
  const badgeCls = o.status === "delivered" ? "delivered" : o.status === "cancelled" ? "cancelled" : "";
  const itemsLine = (o.items || []).map((it) => `${it.qty || 1}× ${it.name}`).join(" · ");
  return `<div class="order-card">
    <div class="order-card-head">
      <div>
        <div class="order-id">#${(o.id || "").slice(-6).toUpperCase()}</div>
        <div class="order-date">${dateShort(o.createdAt)}</div>
      </div>
      <div style="text-align:right">
        <div class="order-total">${money(o.total)}</div>
        <div class="order-badge ${badgeCls}" style="margin-top:4px">${meta.icon} ${meta.label}</div>
      </div>
    </div>
    <div class="order-items-line">${escapeHtml(itemsLine)}</div>
    ${timeline(o.status)}
  </div>`;
}

export function renderPedidos() {
  const orders = store.get("orders");
  if (!orders.length) {
    setHtml("pedidosContent", `<div class="sacola-empty"><div class="sacola-empty-icon">📦</div><div class="sacola-empty-title">Nenhuma operação ainda</div><div class="sacola-empty-sub">Seus pedidos aparecerão aqui em tempo real</div></div>`);
    return;
  }
  setHtml("pedidosContent", orders.map(orderCard).join(""));
}

export function initPedidos() {
  // Realtime: qualquer mudança em orders re-renderiza (inclui troca de status pelo admin).
  store.subscribe("orders", renderPedidos);
}
