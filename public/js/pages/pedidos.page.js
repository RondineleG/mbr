/* ═══════════════════════════════════════════════════════════════
   PEDIDOS PAGE — histórico + rastreamento realtime (timeline)
   Alimentado por store.orders (watchUserOrders em session.js).
   ═══════════════════════════════════════════════════════════════ */
import { setHtml, escapeHtml, onAction } from "../utils/dom.js";
import { toast, toastSuccess, toastError } from "../components/toast.js";
import * as store from "../app/state.js";
import { money, dateShort } from "../utils/format.js";
import { ORDER_STATUS_LABELS, cancelOrder, canCancelOrder } from "../services/order.service.js";
import { getOrderStats } from "../services/order.service.js";
import { emptyState, withEmpty } from "../utils/loading.js";
import { navigate } from "../app/router.js";
import { modalConfirm } from "../components/modal.js";
import { DELIVERY_WINDOW, ORDER_CUTOFF_HOUR, MBOX_CUTOFF_HOUR } from "../utils/constants.js";
import { loadLeaflet } from "../utils/leaflet-loader.js";
import { haversineKm } from "../utils/geo.js";

// Velocidade urbana média (km/h) para estimar o tempo de chegada.
const AVG_SPEED_KMH = 22;
// Mapas Leaflet de rastreamento ativos, por pedido (recriados a cada render).
const _trackMaps = {};

// Bloco de rastreamento ao vivo: só para pedido "enviado" com destino e posição.
function trackingBlock(o) {
  if (o.status !== "enviado" || o.address?.lat == null) return "";
  const t = o.tracking;
  if (!t || t.lat == null) {
    return `<div class="order-track waiting">🛰️ Aguardando o entregador compartilhar a localização…</div>`;
  }
  const km = Math.round(haversineKm(t, o.address) * 10) / 10;
  const eta = Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60));
  const ago = Math.max(0, Math.round((Date.now() - (t.ts || 0)) / 1000));
  const agoTxt = ago < 60 ? `há ${ago}s` : `há ${Math.round(ago / 60)}min`;
  return `<div class="order-track">
    <div class="order-track-info">🛵 <b>Entregador a caminho</b> · ~${eta} min · ${km} km · atualizado ${agoTxt}</div>
    <div class="order-track-map" id="track-map-${o.id}"></div>
  </div>`;
}

// Monta/atualiza os mini-mapas após o render (lazy-load do Leaflet sob demanda).
async function mountTrackingMaps(orders) {
  const tracked = (orders || []).filter((o) =>
    o.status === "enviado" && o.tracking?.lat != null && o.address?.lat != null);
  // Limpa mapas de pedidos que não estão mais sendo rastreados.
  Object.keys(_trackMaps).forEach((id) => {
    if (!tracked.some((o) => o.id === id)) { _trackMaps[id].remove(); delete _trackMaps[id]; }
  });
  if (!tracked.length) return;
  let L;
  try { L = await loadLeaflet(); } catch { return; }
  const pin = (txt, bg) => L.divIcon({ className: "", iconSize: [30, 30],
    html: `<div class="track-pin" style="background:${bg}">${txt}</div>` });
  tracked.forEach((o) => {
    const el = document.getElementById(`track-map-${o.id}`);
    if (!el) return;
    if (_trackMaps[o.id]) _trackMaps[o.id].remove();   // recria no container novo
    const moto = [o.tracking.lat, o.tracking.lng], dest = [o.address.lat, o.address.lng];
    const map = L.map(el, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, dragging: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    L.marker(dest, { icon: pin("🏠", "#1a1206") }).addTo(map).bindPopup("Seu endereço");
    L.marker(moto, { icon: pin("🛵", "#C9A84C") }).addTo(map).bindPopup("Entregador");
    L.polyline([moto, dest], { color: "#C9A84C", weight: 3, opacity: .9, dashArray: "6 7" }).addTo(map);
    map.fitBounds(L.latLngBounds([moto, dest]).pad(0.4));
    setTimeout(() => map.invalidateSize(), 120);
    _trackMaps[o.id] = map;
  });
}

// criadoEm pode ser número (Date.now) ou Timestamp do Firestore.
const toMillis = (v) => v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === "number" ? v : 0));

// Rótulo do dia (hoje/amanhã/data) de um timestamp.
function diaLabel(ts) {
  if (!ts) return "—";
  const d = new Date(ts), h = new Date(); h.setHours(0,0,0,0);
  const dd = new Date(d); dd.setHours(0,0,0,0);
  const diff = Math.round((dd - h) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getStatusBadge(status) {
  const badges = {
    recebido: '<span class="badge badge-info">Recebido</span>',
    analisando: '<span class="badge badge-warning">Analisando</span>',
    aprovado: '<span class="badge badge-success">Aprovado</span>',
    producao: '<span class="badge badge-info">Em Produção</span>',
    enviado: '<span class="badge badge-info">Enviado</span>',
    entregue: '<span class="badge badge-success">Entregue</span>',
    cancelado: '<span class="badge badge-danger">Cancelado</span>'
  };
  return badges[status] || status;
}

function renderStats(stats) {
  if (!stats) return "";
  
  return `<div class="pedidos-stats">
    <div class="pedido-stat-card">
      <div class="pedido-stat-value">${stats.total}</div>
      <div class="pedido-stat-label">Total</div>
    </div>
    <div class="pedido-stat-card">
      <div class="pedido-stat-value">${stats.entregues}</div>
      <div class="pedido-stat-label">Entregues</div>
    </div>
    <div class="pedido-stat-card">
      <div class="pedido-stat-value">${stats.recebidos + stats.analisando}</div>
      <div class="pedido-stat-label">Pendentes</div>
    </div>
  </div>`;
}

function timeline(order) {
  if (!order.timeline || order.timeline.length === 0) return "";
  
  return `<div class="order-timeline">
    <div class="timeline-title">Timeline do Pedido · Total <span class="timeline-total">${money(order.total)}</span></div>
    ${order.timeline.map((entry, index) => {
      const isLast = index === order.timeline.length - 1;
      // Toda entrada da timeline é uma etapa já cumprida → marca com ✓ (verde);
      // a última é a etapa atual (dourado).
      return `
      <div class="timeline-entry">
        <div class="timeline-dot done ${isLast ? 'active' : ''}">✓</div>
        <div class="timeline-content">
          <div class="timeline-status">${ORDER_STATUS_LABELS[entry.status] || entry.status}</div>
          <div class="timeline-time">${formatDate(entry.timestamp)}</div>
          ${entry.observacao ? `<div class="timeline-obs">${escapeHtml(entry.observacao)}</div>` : ""}
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

function orderCard(o) {
  const itemsLine = (o.items || []).map((it) => `${it.qty || 1}× ${it.name}`).join(" · ");
  const showTimeline = o.status !== "cancelado";
  const canRepeat = o.status !== "cancelado" && o.items && o.items.length > 0;
  // Chat agora é pelo ícone fixo 💬 da topbar (lista de conversas), não por card.

  // MBox: a composição é SURPRESA — só é revelada após o corte de sexta 22h
  // (quando o pedido também deixa de ser cancelável). Antes disso, fica oculta.
  const mboxItem = (o.items || []).find((it) => it.mbox && it.composicao?.length);
  const mboxRevealed = mboxItem && o.cancelavelAte && Date.now() >= o.cancelavelAte;
  const mboxReveal = !mboxItem ? "" : (mboxRevealed
    ? `<div class="order-mbox-reveal">📦 <b>Conteúdo da ${escapeHtml(mboxItem.name)}:</b> ${mboxItem.composicao.map((c) => `${c.icon || ""} ${escapeHtml(c.name)}`).join(" · ")}</div>`
    : `<div class="order-mbox-reveal locked">🔒 <b>${escapeHtml(mboxItem.name)} — surpresa!</b> O conteúdo é revelado após sexta 22h (quando o pedido entra em produção).</div>`);

  // Cancelamento/alteração: até as 13h do dia de produção (ou sexta 22h p/ MBox).
  const podeCancelar = canCancelOrder(o);
  const limiteHora = o.tipo === "mbox" ? MBOX_CUTOFF_HOUR : ORDER_CUTOFF_HOUR;
  const cancelBlock = podeCancelar ? `
    <div class="order-cancel">
      <button class="order-cancel-btn" data-action="cancel-order" data-order-id="${o.id}">✕ Cancelar</button>
      <button class="order-repeat-btn" data-action="edit-order" data-order-id="${o.id}" style="width:auto;padding:9px 14px">✎ Alterar</button>
      <span class="order-cancel-timer">Até <b>${limiteHora}h de ${diaLabel(o.cancelavelAte)}</b></span>
    </div>` : (o.status !== "cancelado" && o.status !== "entregue" ? `
    <div class="order-cancel"><span class="order-cancel-locked">🔒 Prazo encerrado · pedido em produção (tudo fresco do dia)</span></div>` : "");

  // Entrega: dia (hoje/amanhã) + janela.
  const entregaInfo = o.dataEntrega ? `<div class="order-date">🛵 Entrega ${diaLabel(o.dataEntrega)} · ${DELIVERY_WINDOW}${o.agendado ? " · agendado" : ""}</div>` : "";

  return `<div class="order-card">
    <div class="order-card-head">
      <div>
        <div class="order-id">${o.numeroPedido || "#" + (o.id || "").slice(-6).toUpperCase()}</div>
        <div class="order-date">${formatDate(o.criadoEm || o.createdAt)}</div>
        ${entregaInfo}
      </div>
      <div style="text-align:right">
        <div class="order-total">${money(o.total)}</div>
        <div class="order-badge" style="margin-top:4px">${getStatusBadge(o.status)}</div>
      </div>
    </div>
    <div class="order-items-line">${escapeHtml(itemsLine)}</div>
    ${mboxReveal}
    ${cancelBlock}
    ${trackingBlock(o)}
    ${showTimeline ? timeline(o) : ""}
    ${canRepeat ? `
      <div class="order-actions">
        <button class="order-repeat-btn" data-action="repeat-order" data-order-id="${o.id}">🔄 Repetir Pedido</button>
      </div>
    ` : ""}
  </div>`;
}

export async function renderPedidos() {
  const orders = store.get("orders");
  const profile = store.get("profile");
  
  if (!orders || orders.length === 0) {
    setHtml("pedidosContent", emptyState(
      "📦",
      "Nenhuma operação ainda",
      "Seus pedidos aparecerão aqui em tempo real"
    ));
    return;
  }
  
  // Calcular estatísticas
  let stats = null;
  if (profile) {
    try {
      stats = await getOrderStats(profile.uid, profile.role === "agent" ? profile.uid : null);
    } catch (err) {
      console.error("Erro ao calcular estatísticas:", err);
    }
  }
  
  const content = withEmpty(
    renderStats(stats) + orders.map(orderCard).join(""),
    !orders || orders.length === 0,
    {
      icon: "📦",
      title: "Nenhuma operação ainda",
      description: "Seus pedidos aparecerão aqui em tempo real"
    }
  );
  
  setHtml("pedidosContent", content);
  mountTrackingMaps(orders);
}

export function initPedidos() {
  // Realtime: qualquer mudança em orders re-renderiza (inclui troca de status pelo admin).
  store.subscribe("orders", renderPedidos);

  // (Chat agora é pelo ícone fixo 💬 da topbar → components/chat-inbox.js)

  // Handler para repetir pedido
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="repeat-order"]');
    if (btn) {
      const orderId = btn.dataset.orderId;
      const orders = store.get("orders");
      const order = orders.find(o => o.id === orderId);
      
      if (order && order.items) {
        // Adicionar itens ao carrinho
        order.items.forEach(item => {
          store.cartAdd({
            key: `${item.name}-${Date.now()}-${Math.random()}`,
            name: item.name,
            icon: item.icon || '🍔',
            price: item.price,
            qty: item.qty || 1,
            desc: item.desc || ''
          });
        });
        
        toast("success", "🛒", "Itens adicionados à sacola");
        navigate("sacola");
      }
    }
  });

  // Cancelar pedido (até as 13h do dia de produção).
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="cancel-order"]');
    if (!btn) return;
    const order = (store.get("orders") || []).find((o) => o.id === btn.dataset.orderId);
    if (!canCancelOrder(order)) { toastError("Prazo encerrado — o pedido já está em produção"); renderPedidos(); return; }
    const ok = await modalConfirm({ title: "Cancelar pedido", message: "Tem certeza? Pedidos cancelados não podem ser reativados.", confirmText: "Cancelar pedido", danger: true });
    if (!ok) return;
    btn.disabled = true;
    try { await cancelOrder(order.id); toast("success", "✅", "Pedido cancelado"); }
    catch (err) { console.error("Erro ao cancelar:", err); toastError("Não foi possível cancelar"); btn.disabled = false; }
  });

  // Alterar pedido: reabre os itens na sacola; o pagamento do novo total é
  // refeito no checkout e o pedido anterior é substituído (cancelado).
  onAction("edit-order", async (el) => {
    const order = (store.get("orders") || []).find((o) => o.id === el.dataset.orderId);
    if (!canCancelOrder(order)) { toastError("Prazo de alteração encerrado"); renderPedidos(); return; }
    const ok = await modalConfirm({
      title: "Alterar pedido",
      message: "Ajuste os itens na sacola. O MESMO pedido será atualizado; se o total aumentar, você paga apenas a diferença.",
      confirmText: "Alterar pedido",
    });
    if (!ok) return;
    // Edição in-place: carrega os itens e marca qual pedido está sendo editado.
    store.cartClear();
    (order.items || []).forEach((it) => store.cartAdd({ key: `${it.name}-${Date.now()}-${Math.random()}`, name: it.name, icon: it.icon || "🍔", price: it.price, qty: it.qty || 1, desc: it.desc || "" }));
    store.set("editingOrderId", order.id);
    toast("success", "✎", "Editando o pedido — ajuste e salve");
    navigate("sacola");
  });

  // Re-renderiza periodicamente para refletir o corte das 13h (botões somem após o prazo).
  setInterval(() => { if (store.get("page") === "pedidos") renderPedidos(); }, 30000);
}
