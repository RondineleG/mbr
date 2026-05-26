/* ═══════════════════════════════════════════════════════════════
   MOTOBOY — central de entregas (acesso: agente com motoboy:true)
   Login único: sem sessão/sem permissão → redireciona para "/".
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "./../utils/dom.js";
import * as auth from "../firebase/auth.service.js";
import { getProfile } from "../services/user.service.js";
import { watchAgentOrders, updateStatus, ORDER_STATUS, ORDER_STATUS_LABELS } from "../services/order.service.js";
import { money } from "../utils/format.js";
import { toast, toastError } from "../components/toast.js";

let me = null;
let unsub = null;
let orders = [];

const ACTIVE = ["aprovado", "producao", "enviado"];
const addrStr = (a) => !a ? "" : [a.street, a.neighborhood, a.city].filter(Boolean).join(", ");
const mapUrl = (a) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addrStr(a) || "MrBur");
// "A receber" = pagamento ainda pendente (dinheiro/pix na entrega).
const aReceber = (o) => o?.pagamento?.status === "pendente" ? (o.pagamento.valor ?? o.total ?? 0) : 0;

function card(o) {
  const itens = (o.items || []).map((i) => `${i.qty || 1}× ${escapeHtml(i.name)}`).join(", ");
  const receber = aReceber(o);
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
          <span class="admin-tag">Total ${money(o.total || 0)}</span>
          ${receber > 0 ? `<span class="admin-tag" style="color:var(--G)">A receber ${money(receber)} (${escapeHtml(o.pagamento?.metodo || "?")})</span>` : `<span class="admin-tag">Pago</span>`}
        </div>
      </div>
      <div class="admin-item-actions" style="flex-direction:column;gap:8px">
        <a class="admin-btn sm ghost" href="${mapUrl(o.address)}" target="_blank" rel="noopener">🗺️ Rota</a>
        ${action}
      </div>
    </div>`;
}

function render() {
  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const done = orders.filter((o) => o.status === ORDER_STATUS.DELIVERED).slice(0, 20);
  const totalReceber = active.reduce((s, o) => s + aReceber(o), 0);

  setHtml("motoSummary", `
    <div class="moto-kpis">
      <div class="moto-kpi"><div class="moto-kpi-val">${active.length}</div><div class="moto-kpi-lbl">Em rota</div></div>
      <div class="moto-kpi"><div class="moto-kpi-val" style="color:var(--G)">${money(totalReceber)}</div><div class="moto-kpi-lbl">A receber</div></div>
      <div class="moto-kpi"><div class="moto-kpi-val">${done.length}</div><div class="moto-kpi-lbl">Concluídas</div></div>
    </div>`);

  setHtml("motoActive", active.length ? active.map(card).join("") : '<div class="admin-empty">Nenhuma entrega em rota agora.</div>');
  setHtml("motoDone", done.length ? done.map(card).join("") : '<div class="admin-empty">Nada concluído ainda.</div>');
}

async function setStatus(id, status) {
  try {
    await updateStatus(id, status);
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
  unsub = watchAgentOrders(profile.uid, (list) => { orders = list || []; render(); });
}

onAction("moto-sent", (el) => setStatus(el.dataset.id, ORDER_STATUS.SENT));
onAction("moto-delivered", (el) => setStatus(el.dataset.id, ORDER_STATUS.DELIVERED));
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
