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
import { syncChatNotifiers, getUnread, onUnreadChange } from "../components/chat-notifier.js";
import { money } from "../utils/format.js";
import { DELIVERY_MERITOS, DELIVERY_FEE, STORE } from "../utils/constants.js";
import { tspNearestNeighbor, googleMapsRouteUrl } from "../utils/geo.js";
import { toast, toastError } from "../components/toast.js";

let me = null;
let unsub = null;
let orders = [];
let MAP = null, LAYER = null;

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
        <button class="admin-btn sm ghost" data-action="moto-chat" data-id="${o.id}">💬 Chat${getUnread(o.id) ? ` <span class="chat-badge">${getUnread(o.id)}</span>` : ""}</button>
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
  const mapsUrl = googleMapsRouteUrl(STORE, order.map((idx) => ({ lat: pts[idx].lat, lng: pts[idx].lng })));
  setHtml("motoRouteList",
    `<div class="moto-route-total">📍 ${pts.length} entrega(s) · <b>${totalKm} km</b> no total (ida e volta à sede)</div>` +
    `<a class="admin-btn sm" href="${mapsUrl}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;margin-bottom:10px">🧭 Abrir rota no Google Maps</a>` +
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
let shareOn = false, geoWatch = null, simTimer = null, lastWrite = 0, simPos = null;

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
  btn.textContent = `📡 Localização: ${shareOn ? "ON" : "OFF"}`;
  btn.classList.toggle("active", shareOn);
}

function startShare() {
  if (shareOn) return;
  shareOn = true;
  localStorage.setItem(SHARE_KEY, "1");
  updateShareBtn();
  if (navigator.geolocation) {
    geoWatch = navigator.geolocation.watchPosition(
      (p) => pushPos(p.coords.latitude, p.coords.longitude),
      () => startSim(),                     // negou/sem sinal → simula
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
    );
  } else {
    startSim();
  }
  toast("success", "📡", "Compartilhando sua localização nas entregas");
}

function stopShare() {
  shareOn = false;
  localStorage.removeItem(SHARE_KEY);
  if (geoWatch != null) { navigator.geolocation.clearWatch(geoWatch); geoWatch = null; }
  if (simTimer) { clearInterval(simTimer); simTimer = null; }
  simPos = null;
  updateShareBtn();
  toast("info", "📴", "Localização desativada");
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
    // Avisa o motoboy de novas mensagens dos clientes nas entregas atribuídas.
    syncChatNotifiers(orders.filter((o) => o.status !== "cancelado").map((o) => o.id), profile.uid);
  });
}

onAction("moto-sent", (el) => setStatus(el.dataset.id, ORDER_STATUS.SENT));
onAction("moto-delivered", (el) => setStatus(el.dataset.id, ORDER_STATUS.DELIVERED));
onAction("moto-chat", (el) => { if (me) openChat(el.dataset.id, me, "Cliente"); });
onAction("moto-share", () => { shareOn ? stopShare() : startShare(); });
onUnreadChange(() => render()); // atualiza os badges de não-lidas ao vivo
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
