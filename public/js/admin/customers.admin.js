/* ═══════════════════════════════════════════════════════════════
   ADMIN · CLIENTES — ranking, pontos e histórico do agente
   ═══════════════════════════════════════════════════════════════ */
import { onAction, setHtml, escapeHtml } from "../utils/dom.js";
import { listAgents } from "../services/user.service.js";
import { getHistory } from "../services/points.service.js";
import { listUserOrders } from "../services/order.service.js";
import { codenameInitials, rankLabel, money, dateShort } from "../utils/format.js";
import { modalCustom } from "../components/modal.js";
import { skeletonList } from "../components/skeleton.js";

let cache = [];

async function load() {
  setHtml("customersList", skeletonList(5));
  cache = (await listAgents()).filter((a) => a.role !== "admin");
  setHtml("customersList", cache.length ? cache.map((a, i) => `
    <div class="data-row">
      <div class="data-thumb">${codenameInitials(a.codename)}</div>
      <div class="data-main">
        <div class="data-name">#${i + 1} · ${escapeHtml(a.codename)}</div>
        <div class="data-meta">${escapeHtml(a.name || "")} · ${rankLabel(a.points)}</div>
      </div>
      <div class="data-price">${a.points || 0} ⚡</div>
      <div class="data-actions"><button class="admin-btn sm" data-action="cust-view" data-id="${a.uid}">Dossiê</button></div>
    </div>`).join("") : '<div class="empty-state">🕵️</div>');
}

async function viewCustomer(uid) {
  const a = cache.find((x) => x.uid === uid);
  if (!a) return;
  const m = modalCustom(`<div class="modal-title">${escapeHtml(a.codename)}</div><div class="modal-message">Carregando dossiê...</div>`);
  const [history, orders] = await Promise.all([getHistory(uid), listUserOrders(uid)]);
  m.el.innerHTML = `
    <div class="modal-title">${escapeHtml(a.codename)} <span style="font-size:11px;color:var(--text-dim)">🔒</span></div>
    <div class="modal-message">${escapeHtml(a.name || "")} · ${escapeHtml(a.email || "")}<br>${rankLabel(a.points)} · <b style="color:var(--gold)">${a.points || 0} ⚡</b></div>
    <div class="modal-label">PEDIDOS (${orders.length})</div>
    ${orders.slice(0, 5).map((o) => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><span>#${(o.id || "").slice(-6).toUpperCase()} · ${dateShort(o.createdAt)}</span><span style="color:var(--gold);font-family:var(--f-mono)">${money(o.total)}</span></div>`).join("") || '<div style="font-size:12px;color:var(--text-dim)">Nenhum pedido</div>'}
    <div class="modal-label">EXTRATO DE MÉRITOS</div>
    ${history.slice(0, 6).map((h) => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><span>${escapeHtml(h.reason)}</span><span style="color:${h.delta >= 0 ? "var(--success)" : "var(--danger)"};font-family:var(--f-mono)">${h.delta >= 0 ? "+" : ""}${h.delta}</span></div>`).join("") || '<div style="font-size:12px;color:var(--text-dim)">Sem movimentações</div>'}
    <div class="modal-actions"><button class="modal-btn primary" id="cclose">Fechar</button></div>`;
  m.el.querySelector("#cclose").onclick = () => document.querySelector(".modal-overlay").classList.remove("show");
}

export function renderCustomers() { load(); }
export function initCustomers() { onAction("cust-view", (el) => viewCustomer(el.dataset.id)); }
