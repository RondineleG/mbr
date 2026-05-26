/* ═══════════════════════════════════════════════════════════════
   WEB — versão DESKTOP do app (sidebar + seções). Admin e agentes,
   quando habilitada pelo admin (config/webPage). Mobile fica intacto.
   ═══════════════════════════════════════════════════════════════ */
import { $, setHtml, escapeHtml } from "../utils/dom.js";
import * as auth from "../firebase/auth.service.js";
import { getProfile } from "../services/user.service.js";
import { loadWebEnabled } from "../services/features.service.js";
import { listProducts } from "../services/product.service.js";
import { listUserOrders, ORDER_STATUS_LABELS } from "../services/order.service.js";
import { money, dateShort } from "../utils/format.js";

const show = (id, on) => { const el = $("#" + id); if (el) el.style.display = on ? "" : "none"; };
const CATS = [["dia", "Lanche do Dia"], ["mbox", "MBox"], ["acomp", "Acompanhamentos"], ["bebidas", "Bebidas"], ["sobremesas", "Sobremesas"]];

function prodCard(p) {
  const ex = p.exclusiveToPoints && p.pointsRequired > 0;
  return `<div class="web-card">
    <div class="web-card-emoji">${p.icon || "🍔"}</div>
    ${p.tag ? `<span class="web-card-tag">${escapeHtml(p.tag)}</span>` : ""}
    <div class="web-card-name">${escapeHtml(p.name)}</div>
    <div class="web-card-desc">${escapeHtml(p.description || "")}</div>
    <div class="web-card-price">${ex ? `⚡ ${p.pointsRequired} méritos` : money(p.price)}</div>
  </div>`;
}
function orderCard(o) {
  const itens = (o.items || []).map((i) => `${i.qty || 1}× ${escapeHtml(i.name)}`).join(", ");
  return `<div class="web-card">
    <span class="web-card-tag">${escapeHtml(ORDER_STATUS_LABELS[o.status] || o.status)}</span>
    <div class="web-card-name">${escapeHtml(o.numeroPedido || "#" + (o.id || "").slice(-6).toUpperCase())}</div>
    <div class="web-card-desc">${itens || "—"}<br><small style="color:var(--t3)">${dateShort(o.criadoEm)}</small></div>
    <div class="web-card-price">${money(o.total || 0)}</div>
  </div>`;
}

function setSection(sec) {
  document.querySelectorAll(".web-sec").forEach((s) => s.style.display = "none");
  const el = document.getElementById("sec-" + sec); if (el) el.style.display = "";
  document.querySelectorAll(".web-navitem").forEach((b) => b.classList.toggle("active", b.dataset.sec === sec));
  $("#webTitle").textContent = ({ inicio: "Início", cardapio: "Cardápio", pedidos: "Meus Pedidos" })[sec] || "";
}

async function renderWeb(profile) {
  show("webLoading", false); show("webApp", true);
  const nome = profile.codename || profile.email || "agente";
  $("#webAvatar").textContent = nome.charAt(0).toUpperCase();
  $("#webWho").textContent = nome;
  $("#webRole").textContent = profile.role === "admin" ? "administrador" : "agente";
  $("#webChip").textContent = `⚡ ${profile.points || 0} méritos`;
  if (profile.role === "admin") $("#webAdminLink").style.display = "";

  // navegação entre seções
  document.querySelectorAll(".web-navitem").forEach((b) => b.onclick = () => setSection(b.dataset.sec));
  $("#webLogout").onclick = async () => { await auth.signOut(); window.location.replace("/"); };

  // Cardápio + destaques
  try {
    const products = (await listProducts({ activeOnly: true })) || [];
    let html = "";
    for (const [k, label] of CATS) {
      const items = products.filter((p) => p.category === k);
      if (!items.length) continue;
      html += `<div class="web-section-title">${label}</div><div class="web-grid">${items.map(prodCard).join("")}</div>`;
    }
    setHtml("webGrid", html || '<p style="color:var(--t2)">Cardápio vazio.</p>');
    const dest = products.filter((p) => p.featured) .concat(products).slice(0, 4);
    setHtml("webDestaques", dest.map(prodCard).join(""));
  } catch (e) { console.error(e); setHtml("webGrid", '<p style="color:var(--er)">Erro ao carregar o cardápio.</p>'); }

  // Pedidos + KPIs
  try {
    const orders = (await listUserOrders(profile.uid)) || [];
    setHtml("webPedidos", orders.length ? orders.map(orderCard).join("") : '<p style="color:var(--t2)">Você ainda não tem pedidos.</p>');
    const entregues = orders.filter((o) => o.status === "entregue").length;
    setHtml("webKpis", `
      <div class="web-kpi"><div class="web-kpi-val">${profile.points || 0}</div><div class="web-kpi-lbl">Méritos</div></div>
      <div class="web-kpi"><div class="web-kpi-val">${escapeHtml(profile.rank || "—")}</div><div class="web-kpi-lbl">Patente</div></div>
      <div class="web-kpi"><div class="web-kpi-val">${orders.length}</div><div class="web-kpi-lbl">Pedidos</div></div>
      <div class="web-kpi"><div class="web-kpi-val">${entregues}</div><div class="web-kpi-lbl">Entregues</div></div>`);
  } catch (e) { console.error(e); }

  setSection("inicio");
}

auth.onAuthChanged(async (user) => {
  if (!user) { window.location.replace("/"); return; }
  const profile = await getProfile(user.uid);
  if (!profile) { window.location.replace("/"); return; }
  const enabled = await loadWebEnabled();
  if (!enabled) { show("webLoading", false); show("webBlocked", true); return; }
  renderWeb(profile);
});
