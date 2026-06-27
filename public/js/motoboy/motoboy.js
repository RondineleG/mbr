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
import { openInbox } from "../components/chat-inbox.js";
import { syncChatNotifiers, onUnreadChange, totalUnread } from "../components/chat-notifier.js";
import { modalConfirm } from "../components/modal.js";
import { money } from "../utils/format.js";
import { DELIVERY_MERITOS, DELIVERY_FEE, STORE } from "../utils/constants.js";
import { tspNearestNeighbor } from "../utils/geo.js";
import { geocode } from "../services/geocode.service.js";
import { toast, toastError } from "../components/toast.js";

let me = null;
let unsub = null;
let orders = [];
let MAP = null, LAYER = null;

const ACTIVE = ["aprovado", "producao", "enviado"];
const addrStr = (a) => !a ? "" : [a.street, a.neighborhood, a.city].filter(Boolean).join(", ");
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
        ${o.address?.lat != null ? `<button class="admin-btn sm ghost" data-action="moto-focus" data-id="${o.id}">🗺️ Rota</button>` : ""}
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
  renderRoute(active);
}

// Roteirização (PCV) das entregas ativas: menor trajeto da sede, visitando
// cada cliente uma vez e voltando à sede. Mapa Leaflet + lista ordenada.
function renderRoute(active) {
  const wrap = $("#motoRouteWrap");
  const L = window.L;
  const pts = active.filter((o) => o.address && o.address.lat != null)
    .map((o) => ({ lat: o.address.lat, lng: o.address.lng, o }));
  if (!pts.length || !L) { if (wrap) wrap.style.display = "none"; return; }
  wrap.style.display = "";

  const { order, legs, totalKm } = tspNearestNeighbor(STORE, pts.map((p) => ({ lat: p.lat, lng: p.lng })));

  // Lista numerada na ordem do trajeto.
  const lista = order.map((idx, i) => {
    const p = pts[idx], o = p.o;
    const addr = [o.address.street, o.address.number, o.address.neighborhood].filter(Boolean).join(", ");
    return `<div class="moto-route-item"><span class="moto-route-num">${i + 1}</span>
      <div style="flex:1"><b>${escapeHtml(o.numeroPedido || o.id)}</b> · ${escapeHtml(o.cliente || "")}<br>
      <small>${escapeHtml(addr || "—")} · ${legs[i]} km</small></div>
      <button class="admin-btn sm" data-action="moto-delivered" data-id="${o.id}">✅ Entregue</button></div>`;
  }).join("");
  setHtml("motoRouteList",
    `<div class="moto-route-total">📍 ${pts.length} entrega(s) · <b>${totalKm} km</b> no total (ida e volta à sede) · veja a rota no mapa acima ↑</div>` +
    lista);

  // Mapa Leaflet.
  if (!MAP) {
    MAP = L.map("motoMap", { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(MAP);
  }
  if (LAYER) LAYER.remove();
  LAYER = L.layerGroup().addTo(MAP);
  const pin = (txt, cls) => L.divIcon({ className: "", html: `<div class="moto-pin ${cls}">${txt}</div>`, iconSize: [28, 28] });
  L.marker([STORE.lat, STORE.lng], { icon: pin("🔥", "store") }).addTo(LAYER).bindPopup("Sede MrBur");
  const path = [[STORE.lat, STORE.lng]];
  order.forEach((idx, i) => {
    const p = pts[idx];
    path.push([p.lat, p.lng]);
    L.marker([p.lat, p.lng], { icon: pin(i + 1, "") }).addTo(LAYER).bindPopup(`${i + 1}. ${p.o.cliente || ""}`);
  });
  path.push([STORE.lat, STORE.lng]);
  L.polyline(path, { color: "#C9A84C", weight: 3, opacity: .9 }).addTo(LAYER);
  MAP.fitBounds(L.latLngBounds(path).pad(0.25));
  setTimeout(() => MAP.invalidateSize(), 150);
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

/* ── Compartilhamento de localização em tempo real ──────────────────
   Publica a posição do motoboy em orders/{id}.tracking para cada entrega
   "enviado". O cliente já recebe o pedido em realtime e desenha o mapa.
   Usa GPS real (watchPosition); sem GPS/permissão, simula o trajeto
   sede → cliente (útil no modo DEMO). Escreve no máximo 1×/4s.        */
const SHARE_KEY = "moto-share";
const WRITE_MS = 4000;
let shareOn = false, shareMode = "off", geoWatch = null, simTimer = null, lastWrite = 0, simPos = null;

const sentIds = () => orders.filter((o) => o.status === ORDER_STATUS.SENT).map((o) => o.id);

async function pushPos(lat, lng) {
  if (!shareOn) return;
  const ids = sentIds();
  if (!ids.length) return;
  const now = Date.now();
  if (now - lastWrite < WRITE_MS) return;
  lastWrite = now;
  const tracking = { lat, lng, ts: now };
  await Promise.all(ids.map((id) => updateDoc(`orders/${id}`, { tracking }).catch(() => {})));
}

// Fallback sem GPS: avança em direção ao 1º destino "enviado" a cada tick.
function startSim() {
  if (simTimer) return;
  shareMode = "sim";
  updateShareBtn();
  toast("info", "📍", "GPS indisponível. Simulando trajeto para demonstração.");
  simTimer = setInterval(() => {
    const o = orders.find((x) => x.status === ORDER_STATUS.SENT && x.address?.lat != null);
    if (!o) return;
    if (!simPos) simPos = { lat: STORE.lat, lng: STORE.lng };
    simPos.lat += (o.address.lat - simPos.lat) * 0.12;
    simPos.lng += (o.address.lng - simPos.lng) * 0.12;
    pushPos(simPos.lat, simPos.lng);
  }, WRITE_MS);
}

function updateShareBtn() {
  const btn = $("#motoShareBtn");
  if (!btn) return;
  const label = !shareOn ? "OFF" : shareMode === "sim" ? "Simulação" : shareMode === "gps" ? "GPS ativo" : "Ativando...";
  btn.textContent = `📡 Localização: ${label}`;
  btn.classList.toggle("active", shareOn && shareMode !== "sim");
  btn.classList.toggle("simulated", shareOn && shareMode === "sim");
}

function startShare() {
  if (shareOn) return;
  shareOn = true;
  shareMode = "pending";
  localStorage.setItem(SHARE_KEY, "1");
  updateShareBtn();
  if (navigator.geolocation) {
    geoWatch = navigator.geolocation.watchPosition(
      (p) => {
        if (simTimer) { clearInterval(simTimer); simTimer = null; simPos = null; }
        if (shareMode !== "gps") {
          shareMode = "gps";
          updateShareBtn();
          toast("success", "📡", "GPS ativo nas entregas");
        }
        pushPos(p.coords.latitude, p.coords.longitude);
      },
      () => startSim(),                     // negou/sem sinal → simula
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
    );
  } else {
    startSim();
  }
  toast("info", "📡", "Ativando localização nas entregas");
}

function stopShare() {
  shareOn = false;
  shareMode = "off";
  localStorage.removeItem(SHARE_KEY);
  if (geoWatch != null) { navigator.geolocation.clearWatch(geoWatch); geoWatch = null; }
  if (simTimer) { clearInterval(simTimer); simTimer = null; }
  simPos = null;
  updateShareBtn();
  toast("info", "📴", "Localização desativada");
}

// Pedidos antigos podem ter endereço sem coordenada (geocode falhou no checkout
// ou o cliente cadastrou antes do fix). Sem lat não há rota/mapa/rastreio — então
// geocodificamos sob demanda e gravamos no pedido. 1 tentativa por pedido.
const geoTried = new Set();
async function backfillCoords(list) {
  const pend = (list || []).filter((o) =>
    !geoTried.has(o.id) && ACTIVE.includes(o.status) &&
    o.address && o.address.lat == null && (o.address.street || o.address.cep || o.address.city));
  for (const o of pend) {
    geoTried.add(o.id);
    try {
      const c = await geocode(o.address);
      if (c) await updateDoc(`orders/${o.id}`, { address: { ...o.address, ...c } }); // realtime redesenha o mapa
    } catch { /* segue sem coords */ }
  }
}

function enter(profile) {
  me = profile;
  $("#motoLoading").style.display = "none";
  $("#motoShell").style.display = "block";
  $("#motoWho").textContent = profile.codename || profile.email;
  updateShareBtn();
  if (localStorage.getItem(SHARE_KEY) === "1") startShare(); // restaura preferência
  unsub?.();
  unsub = watchAgentOrders(profile.uid, (list) => {
    orders = list || [];
    render();
    backfillCoords(orders);   // completa coordenadas faltantes → popula rota/mapa
    // Avisa o motoboy de novas mensagens: do cliente (cm) e da plataforma (mp).
    const threads = [];
    for (const o of orders.filter((o) => o.status !== "cancelado")) {
      threads.push({ orderId: o.id, channel: "cm" }, { orderId: o.id, channel: "mp" });
    }
    syncChatNotifiers(threads, profile.uid);
  });
}

// Erro/timeout no acesso: troca o spinner por uma ação de retry em vez de girar pra sempre.
function showAccessError(msg) {
  const l = $("#motoLoading");
  if (!l) return;
  l.innerHTML = `<div class="al-text">⚠️ ${escapeHtml(msg || "Não foi possível carregar a Central de Entregas")}</div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="admin-btn sm" id="motoRetry">Tentar novamente</button>
      <button class="admin-btn sm ghost" id="motoBack">Voltar ao app</button>
    </div>`;
  $("#motoRetry")?.addEventListener("click", () => location.reload());
  $("#motoBack")?.addEventListener("click", () => location.replace("/"));
}

onAction("moto-sent", (el) => setStatus(el.dataset.id, ORDER_STATUS.SENT));
onAction("moto-delivered", async (el) => {
  const ok = await modalConfirm({
    title: "Confirmar entrega?",
    message: "O pedido será marcado como ENTREGUE e os méritos serão creditados. Não dá para desfazer.",
    confirmText: "Confirmar entrega",
  });
  if (ok) setStatus(el.dataset.id, ORDER_STATUS.DELIVERED);
});
onAction("moto-inbox", () => { if (me) openInbox(orders, me, "motoboy"); });
// "Rota" agora foca a entrega no mapa do próprio app (sem abrir o Google Maps).
onAction("moto-focus", (el) => {
  const o = orders.find((x) => x.id === el.dataset.id);
  if (!o?.address?.lat || !MAP) { toastError("Sem localização para este pedido"); return; }
  $("#motoRouteWrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
  MAP.setView([o.address.lat, o.address.lng], 16);
  setTimeout(() => MAP.invalidateSize(), 250);
});
onAction("moto-share", () => { shareOn ? stopShare() : startShare(); });
onUnreadChange(() => {
  render();
  const b = document.getElementById("motoChatBadge");
  if (b) { const n = totalUnread(); b.textContent = n; b.style.display = n > 0 ? "" : "none"; }
});
onAction("moto-logout", async () => { await auth.signOut(); window.location.replace("/"); });
onAction("moto-theme", () => {
  const cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", cur);
  localStorage.setItem("admin-theme", cur);
});

// Rede lenta/sem resposta não pode deixar o spinner girando indefinidamente.
let accessTimer = setTimeout(() => {
  const l = $("#motoLoading");
  if (l && l.style.display !== "none") showAccessError("A verificação de acesso está demorando. Verifique sua conexão.");
}, 12000);

auth.onAuthChanged(async (user) => {
  if (!user) { window.location.replace("/"); return; }
  try {
    const profile = await getProfile(user.uid);
    clearTimeout(accessTimer);
    if (profile?.motoboy) enter(profile);
    else window.location.replace("/"); // sem permissão de entregas
  } catch (err) {
    clearTimeout(accessTimer);
    console.error("[motoboy] falha ao verificar acesso:", err);
    showAccessError("Não foi possível verificar seu acesso. Tente novamente.");
  }
});
