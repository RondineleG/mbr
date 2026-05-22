/* ═══════════════════════════════════════════════════════════════
   ADMIN · CLIENTES — ranking, pontos e histórico do agente
   ═══════════════════════════════════════════════════════════════ */
import { onAction, setHtml, escapeHtml } from "../utils/dom.js";
import { listAgents } from "../services/user.service.js";
import { getHistory, getMetiqosHistory } from "../services/points.service.js";
import { listUserOrders } from "../services/order.service.js";
import { codenameInitials, rankLabel, money, dateShort } from "../utils/format.js";
import { modalCustom } from "../components/modal.js";
import { skeletonList } from "../components/skeleton.js";

let cache = [];

async function load() {
  setHtml("customersList", skeletonList(5));
  cache = (await listAgents()).filter((a) => a.role !== "admin");
  
  // Sort by points descending
  cache.sort((a, b) => (b.points || 0) - (a.points || 0));
  
  setHtml("customersList", cache.length ? cache.map((a, i) => `
    <div class="admin-item">
      <div class="admin-item-main">
        <div class="admin-item-icon">${codenameInitials(a.codename)}</div>
        <div class="admin-item-content">
          <div class="admin-item-title">#${i + 1} · ${escapeHtml(a.codename)}</div>
          <div class="admin-item-sub">${escapeHtml(a.name || "")} · ${escapeHtml(a.email || "")}</div>
          <div class="admin-item-meta">
            <span class="admin-tag">${rankLabel(a.points)}</span>
            <span class="admin-tag">⚡ ${a.points || 0}</span>
            <span class="admin-tag">💰 ${a.metiqos || 0}</span>
            <span class="admin-tag">🎫 ${a.invitesAvailable || 0}</span>
          </div>
        </div>
      </div>
      <div class="admin-item-actions">
        <button class="admin-btn sm" data-action="cust-view" data-id="${a.uid}">Dossiê</button>
      </div>
    </div>`).join("") : '<div class="admin-empty">🕵️ Nenhum agente encontrado</div>');
}

async function viewCustomer(uid) {
  const a = cache.find((x) => x.uid === uid);
  if (!a) return;
  const m = modalCustom(`<div class="modal-title">${escapeHtml(a.codename)}</div><div class="modal-message">Carregando dossiê...</div>`);
  const [history, metiqosHistory, orders] = await Promise.all([
    getHistory(uid), 
    getMetiqosHistory(uid),
    listUserOrders(uid)
  ]);
  
  // Calculate metrics
  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;
  
  m.el.innerHTML = `
    <div class="modal-title">${escapeHtml(a.codename)} <span style="font-size:11px;color:var(--text-dim)">🔒</span></div>
    <div class="modal-message">
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px">
        <div style="background:var(--bg-elevated);padding:12px;border-radius:var(--radius)">
          <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px">MÉRITOS</div>
          <div style="font-size:20px;font-weight:800;color:var(--gold);font-family:var(--f-mono)">${a.points || 0} ⚡</div>
        </div>
        <div style="background:var(--bg-elevated);padding:12px;border-radius:var(--radius)">
          <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px">METIQOS</div>
          <div style="font-size:20px;font-weight:800;color:var(--gold);font-family:var(--f-mono)">${a.metiqos || 0} 💰</div>
        </div>
        <div style="background:var(--bg-elevated);padding:12px;border-radius:var(--radius)">
          <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px">PEDIDOS</div>
          <div style="font-size:20px;font-weight:800;color:var(--text);font-family:var(--f-mono)">${orders.length}</div>
        </div>
        <div style="background:var(--bg-elevated);padding:12px;border-radius:var(--radius)">
          <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px">CONVITES</div>
          <div style="font-size:20px;font-weight:800;color:var(--text);font-family:var(--f-mono)">${a.invitesAvailable || 0}</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">${escapeHtml(a.name || "")} · ${escapeHtml(a.email || "")}</div>
      <div style="font-size:12px;color:var(--text-muted)">${rankLabel(a.points)} · Cadastrado em ${dateShort(a.createdAt)}</div>
    </div>
    <div class="modal-label">MÉTRICAS</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
      <div style="text-align:center;padding:8px;background:var(--bg-elevated);border-radius:var(--radius)">
        <div style="font-size:10px;color:var(--text-dim)">TOTAL GASTO</div>
        <div style="font-size:14px;font-weight:700;color:var(--gold);font-family:var(--f-mono)">${money(totalSpent)}</div>
      </div>
      <div style="text-align:center;padding:8px;background:var(--bg-elevated);border-radius:var(--radius)">
        <div style="font-size:10px;color:var(--text-dim)">TICKET MÉDIO</div>
        <div style="font-size:14px;font-weight:700;color:var(--gold);font-family:var(--f-mono)">${money(avgOrderValue)}</div>
      </div>
      <div style="text-align:center;padding:8px;background:var(--bg-elevated);border-radius:var(--radius)">
        <div style="font-size:10px;color:var(--text-dim)">CONCLUÍDOS</div>
        <div style="font-size:14px;font-weight:700;color:var(--success);font-family:var(--f-mono)">${completedOrders}</div>
      </div>
    </div>
    <div class="modal-label">PEDIDOS RECENTES (${orders.length})</div>
    ${orders.slice(0, 5).map((o) => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)"><span>#${(o.id || "").slice(-6).toUpperCase()} · ${dateShort(o.createdAt)} · ${o.status}</span><span style="color:var(--gold);font-family:var(--f-mono)">${money(o.total)}</span></div>`).join("") || '<div style="font-size:12px;color:var(--text-dim);padding:8px 0">Nenhum pedido</div>'}
    <div class="modal-label">EXTRATO DE MÉRITOS</div>
    ${history.slice(0, 6).map((h) => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)"><span>${escapeHtml(h.reason)}</span><span style="color:${h.delta >= 0 ? "var(--success)" : "var(--danger)"};font-family:var(--f-mono)">${h.delta >= 0 ? "+" : ""}${h.delta}</span></div>`).join("") || '<div style="font-size:12px;color:var(--text-dim);padding:8px 0">Sem movimentações</div>'}
    <div class="modal-label">EXTRATO DE METIQOS</div>
    ${metiqosHistory.slice(0, 6).map((h) => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)"><span>${escapeHtml(h.reason)}</span><span style="color:${h.delta >= 0 ? "var(--success)" : "var(--danger)"};font-family:var(--f-mono)">${h.delta >= 0 ? "+" : ""}${h.delta}</span></div>`).join("") || '<div style="font-size:12px;color:var(--text-dim);padding:8px 0">Sem movimentações</div>'}
    <div class="modal-actions"><button class="modal-btn primary" id="cclose">Fechar</button></div>`;
  m.el.querySelector("#cclose").onclick = () => document.querySelector(".modal-overlay").classList.remove("show");
}

export function renderCustomers() { load(); }
export function initCustomers() { onAction("cust-view", (el) => viewCustomer(el.dataset.id)); }
