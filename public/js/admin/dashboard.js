/* ═══════════════════════════════════════════════════════════════
   ADMIN · DASHBOARD — KPIs do dia (realtime)
   ═══════════════════════════════════════════════════════════════ */
import { setHtml } from "../utils/dom.js";
import { getOrders, subscribeOrders } from "./admin-store.js";
import { listAgents } from "../services/user.service.js";
import { money, toDate } from "../utils/format.js";

let customerCount = 0;

const isToday = (value) => {
  const d = toDate(value); if (!d) return false;
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};

export function renderDashboard() {
  const orders = getOrders();
  const today = orders.filter((o) => isToday(o.createdAt));
  const revenue = orders.filter((o) => o.status === "delivered").reduce((a, o) => a + (o.total || 0), 0);
  const pending = orders.filter((o) => ["received", "preparing", "out_for_delivery"].includes(o.status)).length;

  setHtml("dashKpis", `
    <div class="kpi"><div class="kpi-icon">📥</div><div class="kpi-val">${today.length}</div><div class="kpi-label">Pedidos hoje</div></div>
    <div class="kpi"><div class="kpi-icon">💰</div><div class="kpi-val">${money(revenue)}</div><div class="kpi-label">Faturamento (entregue)</div></div>
    <div class="kpi"><div class="kpi-icon">⏳</div><div class="kpi-val">${pending}</div><div class="kpi-label">Pedidos pendentes</div></div>
    <div class="kpi"><div class="kpi-icon">🕵️</div><div class="kpi-val">${customerCount}</div><div class="kpi-label">Agentes cadastrados</div></div>`);
}

export function initDashboard() {
  subscribeOrders(() => { if (document.getElementById("section-dashboard")?.classList.contains("active")) renderDashboard(); });
  listAgents().then((a) => { customerCount = a.filter((u) => u.role !== "admin").length; renderDashboard(); }).catch(() => {});
}
