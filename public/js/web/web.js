/* ═══════════════════════════════════════════════════════════════
   WEB — versão DESKTOP do app. A navegação espelha os módulos
   habilitados em Funcionalidades (por papel). Mobile fica intacto.
   ═══════════════════════════════════════════════════════════════ */
import { $, setHtml, escapeHtml } from "../utils/dom.js";
import * as store from "../app/state.js";
import * as auth from "../firebase/auth.service.js";
import { getProfile, listAgents } from "../services/user.service.js";
import { loadFeatures, isEnabled, loadWebEnabled } from "../services/features.service.js";
import { listProducts } from "../services/product.service.js";
import { listUserOrders, ORDER_STATUS_LABELS } from "../services/order.service.js";
import { listRewards } from "../services/reward.service.js";
import { getHistory } from "../services/points.service.js";
import { getMissionsWithProgress } from "../services/mission.service.js";
import { listInvites, getInviteStats } from "../services/invite.service.js";
import { money, dateShort, rankFromPoints, codenameInitials } from "../utils/format.js";
import { BUILD_STEPS, DELIVERY_FEE } from "../utils/constants.js";

const show = (id, on) => { const el = $("#" + id); if (el) el.style.display = on ? "" : "none"; };
let ME = null, FEATURES = {}, PRODUCTS = [];
const role = () => ME?.role || "agent";
const on = (key) => isEnabled(FEATURES, role(), key);

const CATS = [["dia","Lanche do Dia"],["mbox","MBox"],["acomp","Acompanhamentos"],["bebidas","Bebidas"],["sobremesas","Sobremesas"],["exclusivos","Exclusivos"]];
const prodCard = (p) => { const ex = p.exclusiveToPoints && p.pointsRequired > 0; return `<div class="web-card">
  <div class="web-card-emoji">${p.icon || "🍔"}</div>${p.tag ? `<span class="web-card-tag">${escapeHtml(p.tag)}</span>` : ""}
  <div class="web-card-name">${escapeHtml(p.name)}</div><div class="web-card-desc">${escapeHtml(p.description || "")}</div>
  <div class="web-card-price">${ex ? `⚡ ${p.pointsRequired} méritos` : money(p.price)}</div></div>`; };

// ───────── Renderizadores por módulo (retornam HTML; alguns async) ─────────
const sectionTitle = (t) => `<div class="web-section-title">${t}</div>`;

function renderInicio() {
  const r = rankFromPoints(ME.points || 0);
  const atalhos = MODULES.filter(m => on(m.key)).map(m =>
    `<button class="web-card web-shortcut" data-go="${m.key}"><div class="web-card-emoji">${m.icon}</div><div class="web-card-name">${m.label}</div></button>`).join("");
  return `
    <div class="web-hero"><h2>O clube secreto dos melhores lanches</h2>
      <p>Monte seu lanche, acumule méritos e acompanhe seus pedidos — agora na tela grande.</p></div>
    <div class="web-kpis">
      <div class="web-kpi"><div class="web-kpi-val">${ME.points || 0}</div><div class="web-kpi-lbl">Méritos</div></div>
      <div class="web-kpi"><div class="web-kpi-val">${escapeHtml(r.name)}</div><div class="web-kpi-lbl">Patente · Nível ${r.level}</div></div>
      <div class="web-kpi"><div class="web-kpi-val">${ME._ordersCount ?? "—"}</div><div class="web-kpi-lbl">Pedidos</div></div>
    </div>
    ${sectionTitle("Acessar")}<div class="web-grid">${atalhos}</div>`;
}

async function renderCardapio() {
  PRODUCTS = PRODUCTS.length ? PRODUCTS : (await listProducts({ activeOnly: true })) || [];
  const meritosOn = on("lojaMeritos");
  let html = "";
  for (const [k, label] of CATS) {
    if (k === "exclusivos" && !meritosOn) continue;
    const items = PRODUCTS.filter(p => p.category === k && (meritosOn || !p.exclusiveToPoints));
    if (items.length) html += sectionTitle(label) + `<div class="web-grid">${items.map(prodCard).join("")}</div>`;
  }
  return html || '<p style="color:var(--t2)">Cardápio vazio.</p>';
}

function renderMonte() {
  const steps = BUILD_STEPS.filter(s => s.items && s.items.length).map(s => `
    <div class="web-card" style="grid-column:span 1">
      <div class="web-card-name">${s.icon} ${escapeHtml(s.label)} <small style="color:var(--t3)">(máx ${s.max})</small></div>
      <div class="web-card-desc">${s.items.map(i => `${i.icon || "•"} ${escapeHtml(i.name)}${i.price ? " (+" + money(i.price) + ")" : ""}`).join("<br>")}</div>
    </div>`).join("");
  return `<p style="color:var(--t2);margin-bottom:14px">Monte seu lanche escolhendo os ingredientes de cada etapa (a montagem final é feita no app mobile).</p>
    <div class="web-grid">${steps}</div>`;
}

function renderSacola() {
  const cart = store.get("cart") || [];
  if (!cart.length) return '<p style="color:var(--t2)">Sua sacola está vazia. Adicione itens pelo Cardápio no app.</p>';
  const subtotal = cart.reduce((a, i) => a + (i.price || 0) * (i.qty || 1), 0);
  return `<div class="web-grid">${cart.map(i => `<div class="web-card">
      <div class="web-card-emoji">${i.icon || "🍔"}</div><div class="web-card-name">${i.qty || 1}× ${escapeHtml(i.name)}</div>
      ${i.desc ? `<div class="web-card-desc">${escapeHtml(i.desc)}</div>` : ""}
      <div class="web-card-price">${money((i.price || 0) * (i.qty || 1))}</div></div>`).join("")}</div>
    <div class="web-kpi" style="margin-top:18px;max-width:280px"><div class="web-kpi-val">${money(subtotal + DELIVERY_FEE)}</div><div class="web-kpi-lbl">Total (com entrega ${money(DELIVERY_FEE)})</div></div>`;
}

async function renderPedidos() {
  const orders = (await listUserOrders(ME.uid)) || [];
  ME._ordersCount = orders.length;
  if (!orders.length) return '<p style="color:var(--t2)">Você ainda não tem pedidos.</p>';
  return `<div class="web-grid">${orders.map(o => `<div class="web-card">
    <span class="web-card-tag">${escapeHtml(ORDER_STATUS_LABELS[o.status] || o.status)}</span>
    <div class="web-card-name">${escapeHtml(o.numeroPedido || "#" + (o.id || "").slice(-6).toUpperCase())}</div>
    <div class="web-card-desc">${(o.items || []).map(i => `${i.qty || 1}× ${escapeHtml(i.name)}`).join(", ")}<br><small style="color:var(--t3)">${dateShort(o.criadoEm)}</small></div>
    <div class="web-card-price">${money(o.total || 0)}</div></div>`).join("")}</div>`;
}

async function renderLoja() {
  const rewards = (await listRewards({ activeOnly: true })) || [];
  const pts = ME.points || 0;
  if (!rewards.length) return '<p style="color:var(--t2)">Nenhuma recompensa disponível.</p>';
  return `<div class="web-grid">${rewards.map(r => { const locked = pts < r.pointsRequired; return `<div class="web-card">
    <div class="web-card-emoji">${r.icon || "🎁"}</div><div class="web-card-name">${escapeHtml(r.name)}</div>
    <div class="web-card-desc">${escapeHtml(r.description || "")}</div>
    <div class="web-card-price">⚡ ${r.pointsRequired} ${locked ? `<small style="color:var(--t3)">(faltam ${r.pointsRequired - pts})</small>` : ""}</div></div>`; }).join("")}</div>`;
}

async function renderMissoes() {
  const ms = (await getMissionsWithProgress(ME.uid)) || [];
  if (!ms.length) return '<p style="color:var(--t2)">Nenhuma missão ativa.</p>';
  return `<div class="web-grid">${ms.map(m => `<div class="web-card">
    <div class="web-card-emoji">${m.icon || "🎯"}</div><div class="web-card-name">${escapeHtml(m.name)}</div>
    <div class="web-card-desc">${escapeHtml(m.description || "")} · ${m.completed ? "✅ concluída" : (m.progress || 0) + "%"}</div>
    <div class="web-card-price">+${m.reward}⚡</div></div>`).join("")}</div>`;
}

async function renderClube() {
  const r = rankFromPoints(ME.points || 0);
  let extrato = [];
  try { extrato = (await getHistory(ME.uid)) || []; } catch {}
  const ranking = (await listAgents().catch(() => [])).filter(a => a.role !== "admin").slice(0, 8);
  return `
    ${sectionTitle("Sua Patente")}
    <div class="web-card" style="max-width:520px"><div class="web-card-name">${escapeHtml(r.name)} · Nível ${r.level}</div>
      <div class="web-card-desc">${r.next ? `Faltam ${r.next.min - (ME.points || 0)} méritos para ${r.next.name}` : "Rank máximo da Ordem"}</div>
      <div class="web-card-price">${ME.points || 0} ⚡</div></div>
    ${sectionTitle("Ranking de Agentes")}
    <div class="web-grid">${ranking.map((a, i) => `<div class="web-card"><div class="web-card-name">${["🥇","🥈","🥉"][i] || (i+1)+"º"} ${escapeHtml(a.codename || "—")}</div><div class="web-card-price">${a.points || 0} ⚡</div></div>`).join("") || "—"}</div>
    ${sectionTitle("Extrato de Méritos")}
    <div class="web-grid">${extrato.slice(0, 9).map(h => `<div class="web-card"><div class="web-card-name" style="font-size:13px">${escapeHtml(h.reason || "Transação")}</div><div class="web-card-desc">${dateShort(h.createdAt)}</div><div class="web-card-price" style="color:${(h.delta||0) >= 0 ? "var(--ok)" : "var(--er)"}">${(h.delta||0) >= 0 ? "+" : ""}${h.delta || 0} ⚡</div></div>`).join("") || '<p style="color:var(--t2)">Sem movimentações.</p>'}</div>`;
}

async function renderConvites() {
  const invites = (await listInvites({ vinculadoA: ME.uid }).catch(() => [])) || [];
  const stats = await getInviteStats({ vinculadoA: ME.uid }).catch(() => null);
  const kpi = stats ? `<div class="web-kpis">
    <div class="web-kpi"><div class="web-kpi-val">${stats.totalEnviados}</div><div class="web-kpi-lbl">Enviados</div></div>
    <div class="web-kpi"><div class="web-kpi-val">${stats.totalUsados}</div><div class="web-kpi-lbl">Usados</div></div>
    <div class="web-kpi"><div class="web-kpi-val">${stats.totalAtivos}</div><div class="web-kpi-lbl">Ativos</div></div></div>` : "";
  return kpi + `<div class="web-grid">${invites.map(i => `<div class="web-card">
    <span class="web-card-tag">${escapeHtml(i.status || "ativo")}</span>
    <div class="web-card-name" style="font-family:var(--f-mono)">${escapeHtml(i.id)}</div>
    <div class="web-card-desc">Usos: ${i.totalUsos || 0}/${i.limiteUso || 1}</div></div>`).join("") || '<p style="color:var(--t2)">Nenhum convite vinculado a você.</p>'}</div>`;
}

async function renderBusca() {
  PRODUCTS = PRODUCTS.length ? PRODUCTS : (await listProducts({ activeOnly: true })) || [];
  setTimeout(() => {
    const inp = $("#webBuscaInput");
    if (inp) inp.oninput = () => {
      const q = inp.value.toLowerCase().trim();
      const res = PRODUCTS.filter(p => (p.name + " " + (p.description || "")).toLowerCase().includes(q));
      setHtml("webBuscaRes", res.map(prodCard).join("") || '<p style="color:var(--t2)">Nada encontrado.</p>');
    };
  }, 30);
  return `<input id="webBuscaInput" class="web-search" placeholder="🔍 Buscar no cardápio…" autocomplete="off">
    <div id="webBuscaRes" class="web-grid" style="margin-top:18px">${PRODUCTS.map(prodCard).join("")}</div>`;
}

function renderPerfil() {
  const a = ME.address || {};
  const end = [a.street, a.number, a.neighborhood, a.city].filter(Boolean).join(", ") || "—";
  return `<div class="web-card" style="max-width:560px">
    <div class="web-card-emoji">${escapeHtml(codenameInitials(ME.codename || ME.email))}</div>
    <div class="web-card-name">${escapeHtml(ME.codename || ME.name || "—")}</div>
    <div class="web-card-desc">E-mail: ${escapeHtml(ME.email || "—")}<br>Telefone: ${escapeHtml(ME.phone || "—")}<br>Endereço: ${escapeHtml(end)}<br>Papel: ${escapeHtml(ME.role || "agente")}</div>
    <div class="web-card-price">${ME.points || 0} ⚡ · ${escapeHtml(ME.rank || "")}</div></div>`;
}

// Todos os módulos possíveis (espelham Funcionalidades). `inicio` é sempre exibido.
const MODULES = [
  { key: "cardapio", label: "Cardápio", icon: "📋", render: renderCardapio },
  { key: "monteSeuLanche", label: "Monte Seu Lanche", icon: "🔧", render: renderMonte },
  { key: "sacola", label: "Sacola", icon: "🛒", render: renderSacola },
  { key: "pedidos", label: "Meus Pedidos", icon: "📦", render: renderPedidos },
  { key: "clube", label: "Clube", icon: "✨", render: renderClube },
  { key: "lojaMeritos", label: "Loja de Méritos", icon: "🎁", render: renderLoja },
  { key: "missoes", label: "Missões", icon: "🎯", render: renderMissoes },
  { key: "convites", label: "Convites", icon: "🎫", render: renderConvites },
  { key: "busca", label: "Busca", icon: "🔍", render: renderBusca },
  { key: "perfil", label: "Perfil", icon: "👤", render: renderPerfil },
];

async function go(key) {
  const item = key === "inicio" ? { label: "Início", render: renderInicio } : MODULES.find(m => m.key === key);
  if (!item) return;
  $("#webTitle").textContent = item.label;
  document.querySelectorAll(".web-navitem").forEach(b => b.classList.toggle("active", b.dataset.go === key));
  setHtml("webSection", '<div class="web-loading-inline" style="color:var(--t2);padding:20px">Carregando…</div>');
  try { setHtml("webSection", await item.render()); } catch (e) { console.error(e); setHtml("webSection", '<p style="color:var(--er)">Erro ao carregar.</p>'); }
}

async function renderWeb(profile) {
  ME = profile;
  show("webLoading", false); show("webApp", true);
  const nome = profile.codename || profile.email || "agente";
  $("#webAvatar").textContent = nome.charAt(0).toUpperCase();
  $("#webWho").textContent = nome;
  $("#webRole").textContent = profile.role === "admin" ? "administrador" : "agente";
  $("#webChip").textContent = `⚡ ${profile.points || 0} méritos`;
  if (profile.role === "admin") $("#webAdminLink").style.display = "";
  $("#webLogout").onclick = async () => { await auth.signOut(); window.location.replace("/"); };

  // Nav dinâmica: Início + módulos habilitados pro papel.
  const nav = [`<button class="web-navitem active" data-go="inicio"><span>🏠</span> Início</button>`]
    .concat(MODULES.filter(m => on(m.key)).map(m => `<button class="web-navitem" data-go="${m.key}"><span>${m.icon}</span> ${m.label}</button>`));
  setHtml("webNav", nav.join(""));
  document.querySelectorAll(".web-navitem").forEach(b => b.onclick = () => go(b.dataset.go));
  // atalhos do Início também navegam
  document.addEventListener("click", (e) => { const s = e.target.closest("[data-go]"); if (s && s.classList.contains("web-shortcut")) go(s.dataset.go); });

  go("inicio");
}

auth.onAuthChanged(async (user) => {
  if (!user) { window.location.replace("/"); return; }
  const profile = await getProfile(user.uid);
  if (!profile) { window.location.replace("/"); return; }
  const enabled = await loadWebEnabled();
  if (!enabled) { show("webLoading", false); show("webBlocked", true); return; }
  FEATURES = await loadFeatures().catch(() => ({}));
  renderWeb(profile);
});
