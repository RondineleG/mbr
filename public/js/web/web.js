/* ═══════════════════════════════════════════════════════════════
   WEB — versão desktop do app. Acesso SOMENTE admin; pode ser ligada/
   desligada pelo próprio admin (config/webPage).
   ═══════════════════════════════════════════════════════════════ */
import { $, setHtml, escapeHtml } from "../utils/dom.js";
import * as auth from "../firebase/auth.service.js";
import { getProfile } from "../services/user.service.js";
import { loadWebEnabled } from "../services/features.service.js";
import { listProducts } from "../services/product.service.js";
import { listUserOrders, ORDER_STATUS_LABELS } from "../services/order.service.js";
import { money, dateShort } from "../utils/format.js";

const show = (id, on) => { const el = $("#" + id); if (el) el.style.display = on ? "" : "none"; };

function card(p) {
  const exclusivo = p.exclusiveToPoints && p.pointsRequired > 0;
  return `
    <div class="web-card">
      <div class="web-card-emoji">${p.icon || "🍔"}</div>
      ${p.tag ? `<span class="web-card-tag">${escapeHtml(p.tag)}</span>` : ""}
      <div class="web-card-name">${escapeHtml(p.name)}</div>
      <div class="web-card-desc">${escapeHtml(p.description || "")}</div>
      <div class="web-card-price">${exclusivo ? `⚡ ${p.pointsRequired} méritos` : money(p.price)}</div>
    </div>`;
}

async function renderWeb(profile) {
  $("#webWho").textContent = profile.codename || profile.email;
  show("webLoading", false);
  show("webShell", true);

  const CATS = [["dia", "Lanche do Dia"], ["mbox", "MBox"], ["acomp", "Acompanhamentos"], ["bebidas", "Bebidas"], ["sobremesas", "Sobremesas"]];
  setHtml("webNav", CATS.map(([k, l]) => `<a href="#cat-${k}">${l}</a>`).join("") + `<a href="#pedidos">Meus Pedidos</a>`);
  renderPedidos(profile);

  try {
    const products = (await listProducts({ activeOnly: true })) || [];
    if (!products.length) { setHtml("webGrid", '<p style="color:var(--t2)">Nenhum produto no cardápio.</p>'); return; }
    // Agrupa por categoria, em seções largas.
    let html = "";
    for (const [k, label] of CATS) {
      const items = products.filter((p) => p.category === k);
      if (!items.length) continue;
      html += `<h2 class="web-section-title" id="cat-${k}" style="grid-column:1/-1;margin-top:8px">${label}</h2>`;
      html += items.map(card).join("");
    }
    setHtml("webGrid", html || products.map(card).join(""));
  } catch (err) {
    console.error("Erro ao carregar cardápio:", err);
    setHtml("webGrid", '<p style="color:var(--er)">Erro ao carregar o cardápio.</p>');
  }
}

// Pedidos do usuário (admin ou agente) na versão web.
function orderCard(o) {
  const itens = (o.items || []).map((i) => `${i.qty || 1}× ${escapeHtml(i.name)}`).join(", ");
  return `
    <div class="web-card">
      <span class="web-card-tag">${escapeHtml(ORDER_STATUS_LABELS[o.status] || o.status)}</span>
      <div class="web-card-name">${escapeHtml(o.numeroPedido || "#" + (o.id || "").slice(-6).toUpperCase())}</div>
      <div class="web-card-desc">${itens || "—"}<br><small style="color:var(--t3)">${dateShort(o.criadoEm)}</small></div>
      <div class="web-card-price">${money(o.total || 0)}</div>
    </div>`;
}
async function renderPedidos(profile) {
  const main = document.querySelector(".web-main");
  if (!main) return;
  const sec = document.createElement("div");
  sec.innerHTML = `<div class="web-section-title" id="pedidos" style="margin-top:48px">Meus Pedidos</div><div id="webPedidos" class="web-grid"></div>`;
  main.appendChild(sec);
  try {
    const orders = (await listUserOrders(profile.uid)) || [];
    setHtml("webPedidos", orders.length ? orders.map(orderCard).join("") : '<p style="color:var(--t2)">Você ainda não tem pedidos.</p>');
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    setHtml("webPedidos", '<p style="color:var(--er)">Erro ao carregar pedidos.</p>');
  }
}

auth.onAuthChanged(async (user) => {
  if (!user) { window.location.replace("/"); return; }            // sem sessão → login único
  const profile = await getProfile(user.uid);
  if (!profile) { window.location.replace("/"); return; }
  const enabled = await loadWebEnabled();
  if (!enabled) { show("webLoading", false); show("webBlocked", true); return; } // desativada pelo admin
  renderWeb(profile);                                              // admin e agentes podem ver quando habilitada
});
