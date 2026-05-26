/* ═══════════════════════════════════════════════════════════════
   ADMIN · PEDIDOS — lista realtime + troca de status + detalhes
   Trocar status reflete instantaneamente na tela do cliente.
   ═══════════════════════════════════════════════════════════════ */
import { onAction, onChange, setHtml, escapeHtml } from "../utils/dom.js";
import { getOrders, subscribeOrders, startOrdersWatch } from "./admin-store.js";
import { updateStatus, assignAgent, ORDER_STATUS, ORDER_STATUS_LABELS } from "../services/order.service.js";
import { listAgents } from "../services/user.service.js";
import { money, dateShort, toDate } from "../utils/format.js";
import { modalCustom } from "../components/modal.js";
import { toastSuccess, toastError, toastInfo } from "../components/toast.js";
import { CANCEL_WINDOW_MS } from "../utils/constants.js";

const toMillis = (v) => v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === "number" ? v : 0));
// ms restantes em que o admin AINDA não pode aceitar (só vale p/ "recebido").
function lockRemaining(o) {
  if (o.status !== "recebido") return 0;
  const created = toMillis(o.criadoEm);
  return created ? Math.max(0, created + CANCEL_WINDOW_MS - Date.now()) : 0;
}

export { startOrdersWatch };

let filter = "all";
let motoboys = []; // agentes com motoboy:true (para atribuição inline)

const ORDER_FLOW = ["recebido", "analisando", "aprovado", "producao", "enviado", "entregue"];

const STATUS_ICON = {
  recebido: "📥", analisando: "🔍", aprovado: "✅",
  producao: "🍳", enviado: "🛵", entregue: "📦", cancelado: "❌",
};
const STATUS_COLOR = {
  recebido: "#8A8A8A", analisando: "#C9A84C", aprovado: "#3D7034",
  producao: "#B06820", enviado: "#3478C9", entregue: "#2E8B57", cancelado: "#8C2E2E",
};

function row(o) {
  const icon = STATUS_ICON[o.status] || "📦";
  const color = STATUS_COLOR[o.status] || "#C9A84C";
  const opts = [...ORDER_FLOW, "cancelado"].map((s) =>
    `<option value="${s}" ${o.status === s ? "selected" : ""}>${ORDER_STATUS_LABELS[s] || s}</option>`).join("");
  const qty = (o.items || []).reduce((a, i) => a + (i.qty || 1), 0);
  // Durante a janela de 120s o admin não pode aceitar: mostra cadeado + contagem.
  const lock = lockRemaining(o);
  const action = lock > 0
    ? `<span class="status-lock" id="adminlock-${o.id}">🔒 aceitar em ${Math.ceil(lock / 1000)}s</span>`
    : `<select class="status-select" data-action="order-status" data-id="${o.id}" style="border-color:${color}66;color:${color}">${opts}</select>`;
  return `<div class="data-row">
    <div class="data-thumb" style="background:${color}1f;border-color:${color}55;color:${color};font-size:20px">${icon}</div>
    <div class="data-main">
      <div class="data-name">#${(o.id || "").slice(-6).toUpperCase()} · ${escapeHtml(o.cliente || o.codename || "agente")}</div>
      <div class="data-meta">${dateShort(o.criadoEm)} · ${qty} ${qty === 1 ? "item" : "itens"} · ${money(o.total)}</div>
    </div>
    <div class="data-actions">
      <button class="admin-btn sm ghost" data-action="order-view" data-id="${o.id}">Detalhes</button>
      ${action}
      ${motoboys.length ? `<select class="status-select" data-action="order-assign" data-id="${o.id}" title="Atribuir motoboy">
        <option value="">🛵 sem motoboy</option>
        ${motoboys.map((mb) => `<option value="${mb.uid}" ${o.agenteResponsavel === mb.uid ? "selected" : ""}>🛵 ${escapeHtml(mb.codename || mb.email)}</option>`).join("")}
      </select>` : ""}
    </div>
  </div>`;
}

// Rótulo do dia: "Hoje", "Ontem" ou "qua · 24/05".
function dayLabel(value) {
  const d = toDate(value);
  if (!d) return "Sem data";
  const t = new Date();
  const y = new Date(t); y.setDate(t.getDate() - 1);
  const same = (a, b) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (same(d, t)) return "Hoje";
  if (same(d, y)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function renderOrders() {
  // Mais novos primeiro (por criadoEm desc).
  let orders = [...getOrders()].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  if (filter !== "all") orders = orders.filter((o) => o.status === filter);
  if (!orders.length) { setHtml("ordersList", '<div class="empty-state">📦</div>'); return; }

  // Agrupa por dia (mantendo a ordem já decrescente).
  const groups = [];
  for (const o of orders) {
    const label = dayLabel(o.criadoEm);
    let g = groups.find((x) => x.label === label);
    if (!g) { g = { label, list: [] }; groups.push(g); }
    g.list.push(o);
  }
  const html = groups.map((g) =>
    `<div class="orders-day"><span>${g.label}</span><b>${g.list.length} ${g.list.length === 1 ? "pedido" : "pedidos"}</b></div>${g.list.map(row).join("")}`
  ).join("");
  setHtml("ordersList", html);
}

async function viewOrder(id) {
  const o = getOrders().find((x) => x.id === id);
  if (!o) return;
  const motoboys = (await listAgents()).filter((a) => a.motoboy);
  const motoOpts = `<option value="">— não atribuído —</option>` + motoboys.map((m) =>
    `<option value="${m.uid}" ${o.agenteResponsavel === m.uid ? "selected" : ""}>${escapeHtml(m.codename || m.email)}</option>`).join("");
  const items = (o.items || []).map((i) => {
    // desc = ingredientes do "Monte Seu Lanche" (ou descrição do produto).
    const ing = i.desc ? `<div style="font-size:11px;color:var(--text-muted);margin-top:3px;line-height:1.4">🧩 ${escapeHtml(i.desc)}</div>` : "";
    return `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <span>${i.icon || ""} ${i.qty || 1}× ${escapeHtml(i.name)}</span>
        <span style="color:var(--gold);font-family:var(--f-mono);white-space:nowrap">${money(i.price * (i.qty || 1))}</span>
      </div>${ing}</div>`;
  }).join("");
  const addr = [o.address?.street, o.address?.number, o.address?.neighborhood].filter(Boolean).join(", ");
  const m = modalCustom(`
    <div class="modal-title">Pedido #${(o.id || "").slice(-6).toUpperCase()}</div>
    <div class="modal-message">Cliente: <b>${escapeHtml(o.cliente || o.codename || "—")}</b><br>Endereço: ${escapeHtml(addr || "—")}</div>
    <div style="margin:12px 0">${items}</div>
    <div style="display:flex;justify-content:space-between;font-weight:800;color:var(--gold);font-family:var(--f-mono)"><span>TOTAL</span><span>${money(o.total)}</span></div>
    <div class="modal-label" style="margin-top:14px">MOTOBOY / ENTREGA</div>
    <select class="modal-select" id="moto-assign">${motoOpts}</select>
    ${motoboys.length ? "" : '<div style="font-size:11px;color:var(--text-dim);margin-top:6px">Nenhum motoboy cadastrado. Promova um agente em "Agentes".</div>'}
    <div class="modal-actions"><button class="modal-btn primary" id="vclose">Fechar</button></div>`);
  m.el.querySelector("#moto-assign").onchange = async (e) => {
    try { await assignAgent(o.id, e.target.value); toastSuccess(e.target.value ? "Motoboy atribuído" : "Atribuição removida"); }
    catch { toastError("Falha ao atribuir motoboy"); }
  };
  m.el.querySelector("#vclose").onclick = () => document.querySelector(".modal-overlay").classList.remove("show");
}

async function loadMotoboys() {
  try { motoboys = (await listAgents()).filter((a) => a.motoboy); renderOrders(); }
  catch (e) { console.warn("Falha ao carregar motoboys:", e?.message || e); }
}

export function initOrders() {
  subscribeOrders(() => { if (document.getElementById("section-pedidos")?.classList.contains("active")) renderOrders(); });
  loadMotoboys();

  // Atribuir/remover motoboy direto na linha do pedido.
  onChange("order-assign", async (el) => {
    try { await assignAgent(el.dataset.id, el.value); toastSuccess(el.value ? "Motoboy atribuído" : "Atribuição removida"); }
    catch { toastError("Falha ao atribuir motoboy"); }
  });
  onAction("order-filter", (el) => {
    filter = el.dataset.status;
    // O visual ativo é o botão SEM .ghost (dourado); inativos ficam .ghost (apagado).
    document.querySelectorAll('[data-action="order-filter"]').forEach((b) => {
      const on = b === el;
      b.classList.toggle("active", on);
      b.classList.toggle("ghost", !on);
    });
    renderOrders();
  });
  onAction("order-view", (el) => viewOrder(el.dataset.id));
  onChange("order-status", async (el) => {
    // Defesa: não permite aceitar antes da janela de 120s.
    const o = getOrders().find((x) => x.id === el.dataset.id);
    if (o && lockRemaining(o) > 0) {
      toastInfo(`Aguarde ${Math.ceil(lockRemaining(o) / 1000)}s para aceitar este pedido`);
      renderOrders();
      return;
    }
    try { await updateStatus(el.dataset.id, el.value); toastSuccess("Status atualizado → " + (ORDER_STATUS_LABELS[el.value] || el.value)); }
    catch { toastError("Falha ao atualizar status"); }
  });

  // Timer ao vivo: atualiza a contagem dos cadeados e re-renderiza ao liberar.
  setInterval(() => {
    if (!document.getElementById("section-pedidos")?.classList.contains("active")) return;
    let released = false;
    getOrders().forEach((o) => {
      const el = document.getElementById(`adminlock-${o.id}`);
      if (!el) return;
      const rem = lockRemaining(o);
      if (rem > 0) el.textContent = `🔒 aceitar em ${Math.ceil(rem / 1000)}s`;
      else released = true;
    });
    if (released) renderOrders();
  }, 1000);
}
