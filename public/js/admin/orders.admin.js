/* ═══════════════════════════════════════════════════════════════
   ADMIN · PEDIDOS — lista realtime + troca de status + detalhes
   Trocar status reflete instantaneamente na tela do cliente.
   ═══════════════════════════════════════════════════════════════ */
import { onAction, onChange, setHtml, escapeHtml } from "../utils/dom.js";
import { getOrders, subscribeOrders, startOrdersWatch } from "./admin-store.js";
import { updateStatus } from "../services/order.service.js";
import { ORDER_STATUS, ORDER_FLOW } from "../utils/constants.js";
import { money, dateShort } from "../utils/format.js";
import { modalCustom } from "../components/modal.js";
import { toastSuccess, toastError } from "../components/toast.js";

export { startOrdersWatch };

let filter = "all";

function row(o) {
  const meta = ORDER_STATUS[o.status] || ORDER_STATUS.received;
  const opts = [...ORDER_FLOW, "cancelled"].map((s) =>
    `<option value="${s}" ${o.status === s ? "selected" : ""}>${ORDER_STATUS[s].icon} ${ORDER_STATUS[s].label}</option>`).join("");
  return `<div class="data-row">
    <div class="data-thumb">${meta.icon}</div>
    <div class="data-main">
      <div class="data-name">#${(o.id || "").slice(-6).toUpperCase()} · ${escapeHtml(o.codename || "agente")}</div>
      <div class="data-meta">${dateShort(o.createdAt)} · ${(o.items || []).reduce((a, i) => a + (i.qty || 1), 0)} itens · ${money(o.total)}</div>
    </div>
    <div class="data-actions">
      <button class="admin-btn sm ghost" data-action="order-view" data-id="${o.id}">Detalhes</button>
      <select class="status-select" data-action="order-status" data-id="${o.id}">${opts}</select>
    </div>
  </div>`;
}

export function renderOrders() {
  let orders = getOrders();
  if (filter !== "all") orders = orders.filter((o) => o.status === filter);
  setHtml("ordersList", orders.length ? orders.map(row).join("") : '<div class="empty-state">📦</div>');
}

function viewOrder(id) {
  const o = getOrders().find((x) => x.id === id);
  if (!o) return;
  const items = (o.items || []).map((i) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span>${i.icon || ""} ${i.qty || 1}× ${escapeHtml(i.name)}</span><span style="color:var(--gold);font-family:var(--f-mono)">${money(i.price * (i.qty || 1))}</span></div>`).join("");
  const addr = [o.address?.street, o.address?.number, o.address?.neighborhood].filter(Boolean).join(", ");
  modalCustom(`
    <div class="modal-title">Pedido #${(o.id || "").slice(-6).toUpperCase()}</div>
    <div class="modal-message">Agente: <b>${escapeHtml(o.codename || "—")}</b><br>Endereço: ${escapeHtml(addr || "—")}</div>
    <div style="margin:12px 0">${items}</div>
    <div style="display:flex;justify-content:space-between;font-weight:800;color:var(--gold);font-family:var(--f-mono)"><span>TOTAL</span><span>${money(o.total)}</span></div>
    <div class="modal-actions"><button class="modal-btn primary" id="vclose">Fechar</button></div>`).el.querySelector("#vclose").onclick = () => document.querySelector(".modal-overlay").classList.remove("show");
}

export function initOrders() {
  subscribeOrders(() => { if (document.getElementById("section-pedidos")?.classList.contains("active")) renderOrders(); });
  onAction("order-filter", (el) => {
    filter = el.dataset.status;
    document.querySelectorAll('[data-action="order-filter"]').forEach((b) => b.classList.toggle("active", b === el));
    renderOrders();
  });
  onAction("order-view", (el) => viewOrder(el.dataset.id));
  onChange("order-status", async (el) => {
    try { await updateStatus(el.dataset.id, el.value); toastSuccess("Status atualizado → " + ORDER_STATUS[el.value].label); }
    catch { toastError("Falha ao atualizar status"); }
  });
}
