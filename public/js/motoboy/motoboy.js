/* ═══════════════════════════════════════════════════════════════
   MOTOBOY — central de entregas (acesso: agente com motoboy:true)
   Login único: sem sessão/sem permissão → redireciona para "/".
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "./../utils/dom.js";
import * as auth from "../firebase/auth.service.js";
import { getProfile } from "../services/user.service.js";
import { watchAgentOrders, updateStatus, ORDER_STATUS, ORDER_STATUS_LABELS } from "../services/order.service.js";
import { updateDoc } from "../firebase/db.service.js";
import { adjustPoints } from "../services/points.service.js";
import { openChat } from "../components/chat.js";
import { syncChatNotifiers } from "../components/chat-notifier.js";
import { money } from "../utils/format.js";
import { DELIVERY_MERITOS, DELIVERY_FEE } from "../utils/constants.js";
import { toast, toastError } from "../components/toast.js";

let me = null;
let unsub = null;
let orders = [];

const ACTIVE = ["aprovado", "producao", "enviado"];
const addrStr = (a) => !a ? "" : [a.street, a.neighborhood, a.city].filter(Boolean).join(", ");
const mapUrl = (a) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addrStr(a) || "MrBur");
// O motoboy NÃO recebe o valor do pedido — ele recebe a taxa de entrega que o
// PRÓPRIO APP paga por entrega (+ méritos). Não há dinheiro do cliente a coletar.
const deliveryPay = (o) => o?.deliveryFee ?? DELIVERY_FEE;

function card(o) {
  const itens = (o.items || []).map((i) => `${i.qty || 1}× ${escapeHtml(i.name)}`).join(", ");
  const isSent = o.status === ORDER_STATUS.SENT;
  const action = o.status === ORDER_STATUS.DELIVERED ? "" : (isSent
    ? `<button class="admin-btn sm" data-action="moto-delivered" data-id="${o.id}">✅ Entregue</button>`
    : `<button class="admin-btn sm" data-action="moto-sent" data-id="${o.id}">🛵 Saiu para entrega</button>`);
  return `
    <div class="admin-item moto-card">
      <div class="admin-item-content" style="flex:1">
        <div class="admin-item-title">${escapeHtml(o.numeroPedido || o.id)} · ${escapeHtml(o.cliente || "cliente")}</div>
        <div class="admin-item-sub">${itens || "—"}</div>
        <div class="admin-item-sub">📍 ${escapeHtml(addrStr(o.address) || "Endereço não informado")}</div>
        <div class="admin-item-meta">
          <span class="admin-tag">${ORDER_STATUS_LABELS[o.status] || o.status}</span>
          <span class="admin-tag">Pedido ${money(o.total || 0)}</span>
          <span class="admin-tag" style="color:var(--G)">Você ganha ${money(deliveryPay(o))} + ${DELIVERY_MERITOS}⚡</span>
        </div>
      </div>
      <div class="admin-item-actions" style="flex-direction:column;gap:8px">
        <a class="admin-btn sm ghost" href="${mapUrl(o.address)}" target="_blank" rel="noopener">🗺️ Rota</a>
        <button class="admin-btn sm ghost" data-action="moto-chat" data-id="${o.id}">💬 Chat</button>
        ${action}
      </div>
    </div>`;
}

function render() {
  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const done = orders.filter((o) => o.status === ORDER_STATUS.DELIVERED).slice(0, 20);
  // Ganhos pagos pelo app: taxa de entrega de cada entrega concluída.
  const ganhos = done.reduce((s, o) => s + deliveryPay(o), 0);

  setHtml("motoSummary", `
    <div class="moto-kpis">
      <div class="moto-kpi"><div class="moto-kpi-val">${active.length}</div><div class="moto-kpi-lbl">Em rota</div></div>
      <div class="moto-kpi"><div class="moto-kpi-val" style="color:var(--G)">${money(ganhos)}</div><div class="moto-kpi-lbl">Ganhos (entregas)</div></div>
      <div class="moto-kpi"><div class="moto-kpi-val">${done.length}</div><div class="moto-kpi-lbl">Concluídas</div></div>
    </div>`);

  setHtml("motoActive", active.length ? active.map(card).join("") : '<div class="admin-empty">Nenhuma entrega em rota agora.</div>');
  setHtml("motoDone", done.length ? done.map(card).join("") : '<div class="admin-empty">Nada concluído ainda.</div>');
}

// Entrega concluída credita méritos ao MOTOBOY (missão especial), uma única vez.
async function rewardMotoboy(id) {
  const o = orders.find((x) => x.id === id);
  if (!o || o.motoboyRewarded) return;
  try {
    await adjustPoints(me.uid, DELIVERY_MERITOS, "Entrega concluída", id);
    await updateDoc(`orders/${id}`, { motoboyRewarded: true });
    toast("success", "⚡", `+${DELIVERY_MERITOS} méritos pela entrega`);
  } catch (err) {
    console.warn("Recompensa do motoboy adiada:", err?.message || err);
  }
}

async function setStatus(id, status) {
  try {
    await updateStatus(id, status);
    if (status === ORDER_STATUS.DELIVERED) await rewardMotoboy(id);
    toast("success", status === ORDER_STATUS.DELIVERED ? "✅" : "🛵", "Status atualizado");
  } catch (err) {
    console.error(err);
    toastError("Não foi possível atualizar o status");
  }
}

function enter(profile) {
  me = profile;
  $("#motoLoading").style.display = "none";
  $("#motoShell").style.display = "block";
  $("#motoWho").textContent = profile.codename || profile.email;
  unsub?.();
  unsub = watchAgentOrders(profile.uid, (list) => {
    orders = list || [];
    render();
    // Avisa o motoboy de novas mensagens dos clientes nas entregas atribuídas.
    syncChatNotifiers(orders.filter((o) => o.status !== "cancelado").map((o) => o.id), profile.uid);
  });
}

onAction("moto-sent", (el) => setStatus(el.dataset.id, ORDER_STATUS.SENT));
onAction("moto-delivered", (el) => setStatus(el.dataset.id, ORDER_STATUS.DELIVERED));
onAction("moto-chat", (el) => { if (me) openChat(el.dataset.id, me, "Cliente"); });
onAction("moto-logout", async () => { await auth.signOut(); window.location.replace("/"); });
onAction("moto-theme", () => {
  const cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", cur);
  localStorage.setItem("admin-theme", cur);
});

auth.onAuthChanged(async (user) => {
  if (!user) { window.location.replace("/"); return; }
  const profile = await getProfile(user.uid);
  if (profile?.motoboy) enter(profile);
  else window.location.replace("/"); // sem permissão de entregas
});
