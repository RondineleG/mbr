/* ═══════════════════════════════════════════════════════════════
   ADMIN · PEDIDOS — lista realtime + troca de status + detalhes
   Trocar status reflete instantaneamente na tela do cliente.
   ═══════════════════════════════════════════════════════════════ */
import { onAction, onChange, setHtml, escapeHtml } from "../utils/dom.js";
import { getOrders, subscribeOrders, startOrdersWatch } from "./admin-store.js";
import { updateStatus, assignAgent, ORDER_STATUS, ORDER_STATUS_LABELS } from "../services/order.service.js";
import { listAgents } from "../services/user.service.js";
import { money, dateShort, toDate, toMillis } from "../utils/format.js";
import { modalCustom, modalConfirm } from "../components/modal.js";
import { toastSuccess, toastError, toastInfo } from "../components/toast.js";
import { CANCEL_WINDOW_MS } from "../utils/constants.js";
import { openConversation } from "../components/chat.js";
import { syncChatNotifiers, onUnreadChange, unreadForOrder } from "../components/chat-notifier.js";

// Perfil do admin corrente (definido no login) — é a "plataforma" no chat.
let me = null;
export function setAdminProfile(p) { me = p; }

// O admin só aceita/produz após o corte das 13h (até lá o cliente pode alterar/cancelar).
function lockRemaining(o) {
  if (o.status !== "recebido") return 0;
  if (o.clienteAprovado) return 0; // cliente aprovou → liberado para produzir na hora
  const limit = o.cancelavelAte || 0; // pedidos antigos sem corte → liberados
  return limit ? Math.max(0, limit - Date.now()) : 0;
}
function diaLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts), h = new Date(); h.setHours(0,0,0,0); const dd = new Date(d); dd.setHours(0,0,0,0);
  const diff = Math.round((dd - h) / 86400000);
  return diff === 0 ? "hoje" : diff === 1 ? "amanhã" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export { startOrdersWatch };

let filter = "all";
let search = "";   // busca por cliente / nº do pedido
let motoboys = []; // agentes com motoboy:true (para atribuição inline)

const ORDER_FLOW = ["recebido", "analisando", "aprovado", "producao", "enviado", "entregue"];
// Motoboy só pode ser atribuído quando o pedido já está pronto (aprovado em diante).
const CAN_ASSIGN = ["aprovado", "producao", "enviado"];

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
    ? `<span class="status-lock" id="adminlock-${o.id}">🔒 produzir a partir das ${new Date(o.cancelavelAte).getHours()}h de ${diaLabel(o.cancelavelAte)}</span>`
    : `<select class="status-select" data-action="order-status" data-id="${o.id}" style="border-color:${color}66;color:${color}">${opts}</select>`;
  return `<div class="data-row">
    <div class="data-thumb" style="background:${color}1f;border-color:${color}55;color:${color};font-size:20px">${icon}</div>
    <div class="data-main">
      <div class="data-name">#${(o.id || "").slice(-6).toUpperCase()} · ${escapeHtml(o.cliente || o.codename || "agente")}${o.clienteAprovado ? ` <span class="status-lock" style="color:#3D7034;border-color:#3D703455" title="Cliente aprovou — liberado para produção">✅ aprovado</span>` : ""}</div>
      <div class="data-meta">${dateShort(o.criadoEm)} · ${qty} ${qty === 1 ? "item" : "itens"} · ${money(o.total)}</div>
    </div>
    <div class="data-actions">
      <button class="admin-btn sm ghost" data-action="order-view" data-id="${o.id}">Detalhes</button>
      ${action}
      ${motoboys.length && CAN_ASSIGN.includes(o.status)
        ? `<select class="status-select" data-action="order-assign" data-id="${o.id}" title="Atribuir motoboy">
        <option value="">🛵 sem motoboy</option>
        ${motoboys.map((mb) => `<option value="${mb.uid}" ${o.agenteResponsavel === mb.uid ? "selected" : ""}>🛵 ${escapeHtml(mb.codename || mb.email)}</option>`).join("")}
      </select>`
        : (motoboys.length ? `<span class="status-lock" title="Atribua o motoboy após aprovar o pedido">🛵 após aprovação</span>` : "")}
      <button class="admin-btn sm ghost" data-action="order-chat" data-id="${o.id}" title="Conversas do pedido (Cliente / Motoboy)">💬 Chat${unreadForOrder(o.id, ["cp", "mp"]) ? ` <span class="chat-badge">${unreadForOrder(o.id, ["cp", "mp"])}</span>` : ""}</button>
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

// Pedidos visíveis (aplicando filtro de status + busca), mais novos primeiro.
function visibleOrders() {
  let orders = [...getOrders()].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  if (filter !== "all") orders = orders.filter((o) => o.status === filter);
  if (search) {
    const q = search.toLowerCase();
    orders = orders.filter((o) =>
      (o.cliente || "").toLowerCase().includes(q) ||
      (o.codename || "").toLowerCase().includes(q) ||
      (o.numeroPedido || "").toLowerCase().includes(q) ||
      (o.id || "").toLowerCase().includes(q));
  }
  return orders;
}

export function renderOrders() {
  const orders = visibleOrders();
  if (!orders.length) {
    setHtml("ordersList", `<div class="empty-state">${search ? "🔍 Nenhum pedido para “" + escapeHtml(search) + "”" : "📦"}</div>`);
    return;
  }

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
  m.el.querySelector("#vclose").onclick = () => m.close();
}

async function loadMotoboys() {
  try { motoboys = (await listAgents()).filter((a) => a.motoboy); renderOrders(); }
  catch (e) { console.warn("Falha ao carregar motoboys:", e?.message || e); }
}

// A plataforma observa as conversas (cp/mp) dos pedidos recentes E dos que estão
// VISÍVEIS no momento (filtro/busca) — assim o badge de não-lida nunca falta no
// que o admin vê. 1 listener por pedido (dedup por id), limitado.
function syncAdminChat() {
  if (!me) return;
  const recent = [...getOrders()]
    .filter((o) => o.status !== "cancelado")
    .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0))
    .slice(0, 40);
  const seen = new Set();
  const pool = [...visibleOrders(), ...recent].filter((o) => {
    if (!o || seen.has(o.id)) return false; seen.add(o.id); return true;
  }).slice(0, 60);
  const threads = [];
  for (const o of pool) {
    threads.push({ orderId: o.id, channel: "cp" });
    if (o.agenteResponsavel) threads.push({ orderId: o.id, channel: "mp" });
  }
  syncChatNotifiers(threads, me.uid);
}

export function initOrders() {
  subscribeOrders(() => {
    syncAdminChat(); // notificações de chat valem mesmo fora da aba Pedidos
    if (document.getElementById("section-pedidos")?.classList.contains("active")) renderOrders();
  });
  loadMotoboys();

  // Chat da plataforma: abas Cliente (cp) e Motoboy (mp) no mesmo modal.
  onAction("order-chat", (el) => {
    if (!me) return;
    const o = getOrders().find((x) => x.id === el.dataset.id);
    if (o) openConversation(o, me, "admin");
  });
  onUnreadChange(() => { if (document.getElementById("section-pedidos")?.classList.contains("active")) renderOrders(); });

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
    syncAdminChat(); // passa a observar as conversas do filtro atual
  });
  onAction("order-view", (el) => viewOrder(el.dataset.id));
  // Busca por cliente / nº do pedido (filtra a lista ao digitar).
  const si = document.getElementById("ordersSearch");
  if (si) si.addEventListener("input", () => { search = si.value.trim(); renderOrders(); syncAdminChat(); });
  onChange("order-status", async (el) => {
    // Defesa: não produzir antes do corte das 13h (cliente ainda pode alterar/cancelar).
    const o = getOrders().find((x) => x.id === el.dataset.id);
    if (o && lockRemaining(o) > 0) {
      toastInfo(`Pedido liberado para produção às ${new Date(o.cancelavelAte).getHours()}h de ${diaLabel(o.cancelavelAte)}`);
      renderOrders();
      return;
    }
    // Confirma ações arriscadas: cancelar o pedido ou voltar o status.
    const target = el.value;
    const curIdx = ORDER_FLOW.indexOf(o?.status);
    const tgtIdx = ORDER_FLOW.indexOf(target);
    const risky = target === "cancelado" || (curIdx > -1 && tgtIdx > -1 && tgtIdx < curIdx);
    if (risky) {
      const ok = await modalConfirm({
        title: target === "cancelado" ? "Cancelar pedido?" : "Voltar o status?",
        message: target === "cancelado"
          ? "O pedido será marcado como CANCELADO."
          : `Voltar de "${ORDER_STATUS_LABELS[o.status] || o.status}" para "${ORDER_STATUS_LABELS[target] || target}"?`,
        confirmText: "Confirmar",
        danger: target === "cancelado",
      });
      if (!ok) { renderOrders(); return; } // re-render reverte o <select> visualmente
    }
    try { await updateStatus(el.dataset.id, target); toastSuccess("Status atualizado → " + (ORDER_STATUS_LABELS[target] || target)); }
    catch { toastError("Falha ao atualizar status"); renderOrders(); } // re-render reverte o <select> ao valor real
  });

  // Re-renderiza periodicamente para liberar os cadeados quando o corte das 13h passa.
  setInterval(() => {
    if (document.getElementById("section-pedidos")?.classList.contains("active") &&
        getOrders().some((o) => lockRemaining(o) > 0)) renderOrders();
  }, 30000);
}
