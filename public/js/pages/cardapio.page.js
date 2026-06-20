/* ═══════════════════════════════════════════════════════════════
   CARDÁPIO PAGE — "Monte Seu Lanche" (wizard) + categorias (Firestore)
   ═══════════════════════════════════════════════════════════════ */
import { $, $$, onAction, setHtml, show, escapeHtml } from "../utils/dom.js";
import * as store from "../app/state.js";
import { BUILD_STEPS, BUILD_BASE_PRICE } from "../utils/constants.js";
import { watchBuildSteps } from "../services/buildsteps.service.js";
import { watchLancheDia, dailyForToday, watchMbox, mboxRemainingForNext } from "../services/specials.service.js";
import { money } from "../utils/format.js";
import { skeletonList } from "../components/skeleton.js";
import { toast, toastInfo, toastError } from "../components/toast.js";
import { isEnabled, watchMenuTabs, isTabEnabled } from "../services/features.service.js";
import { gerarNomeLanche, isCreationCombo } from "../services/lanche.service.js";

// Ingredientes e preço-base do montador: começam com o padrão e são
// substituídos ao vivo pelo que o admin cadastra (config/montar no Firestore).
let STEPS = BUILD_STEPS;
let basePrice = BUILD_BASE_PRICE;
let currentStep = 0;
// Etapas visíveis ao cliente: ignora as desativadas pelo admin (a revisão fica).
const visible = () => STEPS.filter((s) => !s.disabled);
// Itens inclusos já vêm pré-selecionados: Pão (Brioche), Carne (Smash 90g),
// Extra (Cheddar) e Molho (Molho Secreto). Salada é toda adicional (não vem marcada).
function defaultSelections() {
  const sel = {};
  const first = (id) => { const s = STEPS.find((s) => s.id === id); return s && !s.disabled ? s.items?.[0] : null; };
  for (const id of ["pao", "carnes", "queijos", "molhos"]) {
    const it = first(id);
    if (it) sel[id] = [it];
  }
  return sel;
}
let selections = defaultSelections(); // stepId -> [items]
let cat = "monte";
let lancheDiaCfg = null; // config do Lanche do Dia (admin)
let mboxCfg = null;      // config da MBox (admin)
let mboxStock = null;    // { sat, remaining, total } — estoque do próximo sábado
let menuTabsCfg = {};    // abas do cardápio ligadas/desligadas (admin)

/* ─── Wizard ─── */
function renderStepTabs() {
  const V = visible();
  setHtml("stepTabs", V.map((s, i) =>
    `<button class="step-tab ${i === currentStep ? "active" : ""}" data-action="build-step" data-step="${i}">
      <span class="step-tab-icon">${s.icon}</span><span class="step-tab-label">${s.label}</span>
    </button>`).join(""));
  setHtml("stepDots", V.map((_, i) => {
    let cls = "step-dot"; if (i === currentStep) cls += " active"; else if (i < currentStep) cls += " completed";
    return `<div class="${cls}" data-action="build-step" data-step="${i}"></div>`;
  }).join(""));
  show($("#stepBackBtn"), currentStep > 0);
  // Na revisão, as ações ficam dentro do resumo (montar outro / ir pra sacola);
  // o botão do rodapé some para não duplicar.
  const isReview = currentStep === V.length - 1;
  show($("#stepBtn"), !isReview);
  if (!isReview) { $("#stepBtn").textContent = "Próximo →"; $("#stepBtn").dataset.action = "build-next"; }
  $(".step-tab.active")?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function renderStepContent() {
  const step = visible()[currentStep];
  if (!step || step.id === "finalizar") return renderReview();
  const sel = selections[step.id] || [];
  setHtml("stepContent", `
    <div class="menu-section-header">
      <div class="menu-section-title">Escolha — ${escapeHtml(step.label)}</div>
      <span class="menu-section-max">Máx: ${step.max}</span>
    </div>
    <div class="menu-items">${step.items.map((item, i) => {
      const on = sel.some((s) => s.name === item.name);
      return `<div class="menu-item ${on ? "selected" : ""}" data-action="build-toggle" data-step="${step.id}" data-idx="${i}">
        <span class="menu-item-icon">${item.icon}</span>
        <div class="menu-item-info"><div class="menu-item-name">${escapeHtml(item.name)}</div><div class="menu-item-desc">${escapeHtml(item.desc)}</div></div>
        ${item.price > 0
          ? `<span class="menu-item-price">+ ${money(item.price)}</span>`
          : `<span class="menu-item-price included">incluído</span>`}
        <div class="menu-item-check">${on ? "✓" : ""}</div>
      </div>`;
    }).join("")}</div>`);
}

function renderReview() {
  let extras = 0;
  let body = `<div style="padding:16px"><div class="menu-section-header"><div class="menu-section-title">Resumo do seu Lanche</div></div>`;
  visible().forEach((s) => {
    if (s.id === "finalizar") return;
    const sel = selections[s.id] || [];
    if (!sel.length) return;
    body += `<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-size:10px;letter-spacing:2px;color:var(--text-dim);font-family:var(--f-mono);margin-bottom:6px">${s.label.toUpperCase()}</div>`;
    sel.forEach((it) => {
      extras += it.price || 0;
      body += `<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="font-size:13px">${it.icon} ${escapeHtml(it.name)}</span><span style="font-size:12px;color:var(--gold);font-family:var(--f-mono)">${it.price > 0 ? "+ " + money(it.price) : "incluso"}</span></div>`;
    });
    body += `</div>`;
  });
  const total = basePrice + extras;
  body += `<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:14px;font-weight:700">TOTAL</span>
      <span style="font-size:22px;font-weight:900;color:var(--gold);font-family:var(--f-mono)">${money(total)}</span></div>
    <div style="font-size:11px;color:var(--success);font-weight:700;text-align:right;margin-top:4px;font-family:var(--f-mono)">+${Math.round(total)}⚡ méritos</div>
    <div style="font-size:11px;text-align:right;margin-top:4px;color:var(--text-dim)">${isCreationCombo(currentParts(), STEPS)
      ? "🔧 Combinação inédita — concorre a forks, estrelas e +50⚡ se você for o 1º a criar"
      : "🍔 Lanche clássico — sem forks/estrelas"}</div>
    <div class="step-buttons" style="flex-direction:column;gap:10px;margin-top:16px">
      <button class="step-btn" data-action="build-add-go">Adicionar e ir pra Sacola 🛒</button>
      <button class="step-btn-back" style="width:100%;flex:1" data-action="build-add-continue">Adicionar e montar outro 🔄</button>
    </div></div>`;
  setHtml("stepContent", body);
}

function toggleItem(stepId, idx) {
  const step = STEPS.find((s) => s.id === stepId);
  const item = step.items[idx];
  selections[stepId] ||= [];
  const sel = selections[stepId];
  const i = sel.findIndex((s) => s.name === item.name);
  if (i >= 0) {
    // Carne é obrigatória: não deixa remover a última.
    if (stepId === "carnes" && sel.length === 1) { toastInfo("Selecione ao menos 1 carne"); return; }
    sel.splice(i, 1);
  } else { if (sel.length >= step.max) sel.shift(); sel.push(item); }
  renderStepContent();
}

// Composição atual (nomes dos ingredientes escolhidos, em todas as etapas visíveis).
function currentParts() {
  const parts = [];
  visible().forEach((s) => { if (s.id !== "finalizar") (selections[s.id] || []).forEach((it) => parts.push(it.name)); });
  return parts;
}

// Adiciona o lanche montado à sacola e reseta o wizard para um novo lanche.
// Só vira CRIAÇÃO (codinome + forks/estrelas + méritos de criador) se a
// composição diferir do básico padrão; o básico entra como lanche comum.
function addBuildToCart() {
  let total = basePrice;
  const parts = [];
  visible().forEach((s) => (selections[s.id] || []).forEach((it) => { total += it.price || 0; parts.push(it.name); }));
  if (isCreationCombo(parts, STEPS)) {
    const nome = gerarNomeLanche(parts);
    store.cartAdd({ custom: true, name: nome, icon: "🔧", price: total, qty: 1, desc: parts.join(", "), combo: parts });
    toast("success", "🔧", `${nome} adicionado! ${money(total)}`);
  } else {
    store.cartAdd({ name: "Clássico MrBur", icon: "🍔", price: total, qty: 1, desc: parts.join(", ") });
    toast("success", "🍔", `Clássico MrBur adicionado! ${money(total)}`);
  }
  selections = defaultSelections(); currentStep = 0; renderWizard();
}

// Adiciona e volta ao início para montar outro lanche.
function buildAddAndContinue() { addBuildToCart(); }

// Adiciona e segue para a sacola.
function buildAddAndGoToCart() {
  addBuildToCart();
  import("../app/router.js").then((m) => m.navigate("sacola"));
}

function renderWizard() { renderStepTabs(); renderStepContent(); }

/* ─── Categorias de produtos (Firestore) ─── */
function prontoCard(p) {
  return `<div class="pronto-card ${p.category === "mbox" ? "mbox" : ""}">
    ${p.tag ? `<div class="pronto-tag ${p.category === "mbox" ? "sabado" : "limitado"}">${escapeHtml(p.tag)}</div>` : ""}
    <div class="pronto-top">
      <div class="pronto-emoji">${p.icon || "🍔"}</div>
      <div class="pronto-info"><div class="pronto-name">${escapeHtml(p.name)}</div><div class="pronto-desc">${escapeHtml(p.description || "")}</div></div>
    </div>
    <div class="pronto-footer">
      <div><div class="pronto-price">${money(p.price)}</div><div class="pronto-merits${p.noMeritos ? " dim" : ""}">${p.noMeritos ? "sem méritos" : `+${Math.round(p.price)}⚡ méritos`}</div></div>
      <button class="pronto-add-btn" data-action="add-product" data-id="${p.id}">ADICIONAR</button>
    </div></div>`;
}

function menuItem(p) {
  // Se for item exclusivo de pontos, mostrar preço em méritos
  if (p.exclusiveToPoints && p.pointsRequired > 0) {
    return `<div class="menu-item points-item" data-action="buy-points" data-id="${p.id}">
      <span class="menu-item-icon">${p.icon || "🍔"}</span>
      <div class="menu-item-info">
        <div class="menu-item-name">${escapeHtml(p.name)}</div>
        <div class="menu-item-desc">${escapeHtml(p.description || "")}</div>
        <div class="menu-item-points-badge">⚡ ${p.pointsRequired} méritos</div>
      </div>
      <button class="menu-item-points-btn">COMPRAR</button>
    </div>`;
  }
  
  return `<div class="menu-item" data-action="add-product" data-id="${p.id}">
    <span class="menu-item-icon">${p.icon || "🍔"}</span>
    <div class="menu-item-info"><div class="menu-item-name">${escapeHtml(p.name)}</div><div class="menu-item-desc">${escapeHtml(p.description || "")}</div></div>
    <span class="menu-item-price">${money(p.price)}</span>
  </div>`;
}

// Card do Lanche do Dia (somente o de HOJE). Preço fixo, sem méritos.
function dailyCard() {
  const d = lancheDiaCfg ? dailyForToday(lancheDiaCfg) : null;
  if (!d) return "";
  const comp = (d.composicao || []).map((c) => `${c.icon || ""} ${escapeHtml(c.name)}`).join(" · ");
  return `<div class="pronto-card daily">
    <div class="pronto-tag limitado">HOJE</div>
    <div class="pronto-top">
      <div class="pronto-emoji">${d.icon || "🍔"}</div>
      <div class="pronto-info"><div class="pronto-name">${escapeHtml(d.name || "Lanche do Dia")}</div><div class="pronto-desc">${escapeHtml(d.desc || "")}</div></div>
    </div>
    <div class="pronto-comp">${comp}</div>
    <div class="pronto-footer">
      <div><div class="pronto-price">${money(d.price)}</div><div class="pronto-merits dim">sem méritos</div></div>
      <button class="pronto-add-btn" data-action="add-daily">ADICIONAR</button>
    </div></div>`;
}

// Estoque do próximo sábado (banner + bloqueio).
function mboxStockLine() {
  if (!mboxStock) return "";
  const dia = new Date(mboxStock.sat).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  if (mboxStock.remaining <= 0) return `<div class="mbox-stock out">🚫 MBox esgotada para sábado ${dia}</div>`;
  return `<div class="mbox-stock">🗓️ Sábado ${dia} · <b>${mboxStock.remaining}</b> de ${mboxStock.total} MBox disponíveis</div>`;
}

// Card da MBox — teaser: o conteúdo NÃO é revelado até fechar o pedido.
function mboxCard() {
  const m = mboxCfg;
  if (!m || !m.composicao?.length) return "";
  const sold = mboxStock && mboxStock.remaining <= 0;
  return `<div class="pronto-card mbox">
    <div class="pronto-tag sabado">SÁBADO</div>
    <div class="pronto-top">
      <div class="pronto-emoji">${m.icon || "📦"}</div>
      <div class="pronto-info"><div class="pronto-name">${escapeHtml(m.name || "MBox")}</div><div class="pronto-desc">${escapeHtml(m.desc || "Surpresa do chef — você descobre ao receber!")}</div></div>
    </div>
    <div class="pronto-comp dim">🔒 Conteúdo revelado só ao fechar o pedido</div>
    <div class="pronto-footer">
      <div><div class="pronto-price">${money(m.price)}</div><div class="pronto-merits">+${Math.round(m.price)}⚡ méritos</div></div>
      <button class="pronto-add-btn" data-action="add-mbox" ${sold ? "disabled" : ""}>${sold ? "ESGOTADO" : "ADICIONAR"}</button>
    </div></div>`;
}

async function refreshMboxStock() {
  try { mboxStock = await mboxRemainingForNext(); } catch { mboxStock = null; }
  if (store.get("page") === "cardapio") renderCategories();
}

function renderCategories() {
  const products = store.get("products");
  const profile = store.get("profile");
  const missionProgress = store.get("missionProgress") || { completed: [], claimed: [] };
  
  // Itens exclusivos por méritos só aparecem se a Loja de Méritos estiver ativa pro papel.
  const meritosOn = isEnabled(store.get("features") || {}, profile?.role || "agent", "lojaMeritos");
  const byCat = (c) => products.filter((p) =>
    p.category === c && p.active !== false && (meritosOn || !p.exclusiveToPoints));
  const loading = products.length === 0;

  const diaHtml = dailyCard() + byCat("dia").map(prontoCard).join("");
  setHtml("catDia", loading ? skeletonList(2) : (diaHtml || '<div class="empty-state">📋 Sem lanche do dia hoje</div>'));
  const mboxHtml = mboxStockLine() + mboxCard() + byCat("mbox").map(prontoCard).join("");
  setHtml("catMbox", loading ? skeletonList(2) : (mboxHtml || '<div class="empty-state">📦</div>'));
  setHtml("catAcomp", loading ? skeletonList(3) : `<div class="menu-items">${byCat("acomp").map(menuItem).join("")}</div>`);
  setHtml("catBebidas", loading ? skeletonList(3) : `<div class="menu-items">${byCat("bebidas").map(menuItem).join("")}</div>`);
  setHtml("catSobremesas", loading ? skeletonList(3) : `<div class="menu-items">${byCat("sobremesas").map(menuItem).join("")}</div>`);
  
  // Exclusive items - check if user has required missions/points
  const exclusiveItems = byCat("exclusivos");
  const unlockedExclusive = exclusiveItems.filter(p => {
    if (p.requiresMission && !missionProgress.completed.includes(p.requiresMission)) {
      return false;
    }
    if (p.requiresPoints && (profile?.points || 0) < p.requiresPoints) {
      return false;
    }
    return true;
  });
  
  setHtml("catExclusivos", loading ? skeletonList(3) : 
    (unlockedExclusive.length ? unlockedExclusive.map(menuItem).join("") : 
    '<div class="empty-state">🔒 Complete missões para desbloquear itens exclusivos</div>'));
}

export function showCat(next) {
  if (!tabVisible(next)) next = ALL_CATS.find(tabVisible) || "dia";
  cat = next;
  ALL_CATS.forEach((c) => show($("#cat-" + c), c === next));
  $$(".cat-btn").forEach((b) => b.classList.toggle("active", b.dataset.cat === next));
}

function addDaily() {
  const d = lancheDiaCfg ? dailyForToday(lancheDiaCfg) : null;
  if (!d) return;
  const desc = (d.composicao || []).map((c) => c.name).join(", ");
  store.cartAdd({ name: `${d.name || "Lanche do Dia"} (Lanche do Dia)`, icon: d.icon || "🍔", price: d.price, qty: 1, desc, noMeritos: true });
  toastInfo(d.icon || "🍔", `${d.name || "Lanche do Dia"} adicionado à sacola`);
}

function addMbox() {
  const m = mboxCfg;
  if (!m || !m.composicao?.length) return;
  if (mboxStock && mboxStock.remaining < 1) return toastError("MBox esgotada para este sábado");
  // composição vai junto, mas fica oculta até o pedido ser fechado.
  store.cartAdd({ name: m.name || "MBox", icon: m.icon || "📦", price: m.price, qty: 1, desc: m.desc || "Caixa surpresa", mbox: true, mboxUnits: 1, composicao: m.composicao });
  toastInfo(m.icon || "📦", `${m.name || "MBox"} adicionada à sacola · entrega no sábado`);
}

function addProduct(id) {
  const p = store.get("products").find((x) => x.id === id);
  if (!p) return;
  
  // Não permitir adicionar itens exclusivos de pontos ao carrinho normal
  if (p.exclusiveToPoints && p.pointsRequired > 0) {
    toastError("Este item só pode ser comprado com méritos");
    return;
  }
  
  // Produtos MBox (ex.: Dupla) consomem do estoque do sábado (Dupla = 2 unidades).
  if (p.agendaMbox) {
    const need = p.mboxUnits || 1;
    if (mboxStock && mboxStock.remaining < need) return toastError("MBox esgotada para este sábado");
  }
  store.cartAdd({
    productId: p.id, name: p.name, icon: p.icon || "🍔", price: p.price, qty: 1, desc: "",
    ...(p.noMeritos ? { noMeritos: true } : {}),                   // combo do dia não credita méritos
    ...(p.agendaMbox ? { mbox: true, mboxUnits: p.mboxUnits || 1 } : {}), // agenda sábado + consome estoque
  });
  toastInfo(p.icon || "🛒", `${p.name} adicionado à sacola`);
}

async function buyWithPoints(id) {
  const profile = store.get("profile");
  const p = store.get("products").find((x) => x.id === id);
  
  if (!p) return;
  if (!profile) {
    toastError("Faça login para comprar com méritos");
    return;
  }
  
  if (!p.exclusiveToPoints || p.pointsRequired <= 0) {
    toastError("Este item não está disponível para compra com méritos");
    return;
  }
  
  const userPoints = profile.points || 0;
  if (userPoints < p.pointsRequired) {
    toastError(`Você precisa de ${p.pointsRequired} méritos. Tem ${userPoints}.`);
    return;
  }
  
  try {
    const { buyWithPoints: buyProduct } = await import("../services/product.service.js");
    await buyProduct(profile.uid, p);
    toast("success", "🎉", `${p.name} comprado com ${p.pointsRequired} méritos!`);
    
    // Atualizar perfil localmente
    profile.points = userPoints - p.pointsRequired;
    store.set("profile", profile);
  } catch (err) {
    console.error("Erro ao comprar com pontos:", err);
    const errorMsg = err?.message || "";
    
    if (errorMsg.includes("INSUFFICIENT_POINTS")) {
      toastError("Saldo insuficiente de méritos");
    } else if (errorMsg.includes("OUT_OF_STOCK")) {
      toastError("Item fora de estoque");
    } else {
      toastError("Não foi possível completar a compra");
    }
  }
}

/** "Monte Seu Lanche" habilitado para o papel do usuário? */
function monteEnabled() {
  const profile = store.get("profile");
  return isEnabled(store.get("features") || {}, profile?.role || "agent", "monteSeuLanche");
}

/** Loja de Méritos ativa pro papel? (controla itens exclusivos por méritos) */
function meritosEnabled() {
  const profile = store.get("profile");
  return isEnabled(store.get("features") || {}, profile?.role || "agent", "lojaMeritos");
}

const ALL_CATS = ["monte", "dia", "mbox", "acomp", "bebidas", "sobremesas", "exclusivos"];

/** Uma aba está visível? Combina o toggle de abas (admin) com os gates de papel. */
function tabVisible(c) {
  if (!isTabEnabled(menuTabsCfg, c)) return false;   // desligada pelo admin (config/menuTabs)
  if (c === "monte") return monteEnabled();           // ainda respeita o feature flag por papel
  if (c === "exclusivos") return meritosEnabled();    // exclusivos depende da loja de méritos
  return true;
}

/** Esconde abas desativadas (admin) ou bloqueadas por papel; troca a atual se preciso. */
function applyCardapioGates() {
  ALL_CATS.forEach((c) => {
    const btn = document.querySelector(`[data-cat="${c}"]`);
    if (btn) btn.style.display = tabVisible(c) ? "" : "none";
  });
  if (!tabVisible(cat)) {
    const first = ALL_CATS.find(tabVisible);
    if (first) showCat(first);
  }
}

export function renderCardapio() { renderWizard(); renderCategories(); applyCardapioGates(); refreshMboxStock(); }

export function initCardapio() {
  onAction("cardapio-cat", (el) => showCat(el.dataset.cat));
  onAction("build-step", (el) => { currentStep = +el.dataset.step; renderWizard(); });
  onAction("build-toggle", (el) => toggleItem(el.dataset.step, +el.dataset.idx));
  onAction("build-next", () => { if (currentStep < visible().length - 1) { currentStep++; renderWizard(); } });
  onAction("build-prev", () => { if (currentStep > 0) { currentStep--; renderWizard(); } });
  onAction("build-add-continue", () => buildAddAndContinue());
  onAction("build-add-go", () => buildAddAndGoToCart());
  onAction("add-product", (el) => addProduct(el.dataset.id));
  onAction("add-daily", () => addDaily());
  onAction("add-mbox", () => addMbox());
  onAction("buy-points", (el) => buyWithPoints(el.dataset.id));
  store.subscribe("products", renderCategories);
  store.subscribe("missionProgress", () => {
    if (store.get("page") === "cardapio") renderCategories();
  });
  store.subscribe("features", () => {
    if (store.get("page") === "cardapio") { renderCategories(); applyCardapioGates(); }
  });

  // Ingredientes vêm do Firestore (cadastrados pelo admin). Ao mudar, reinicia
  // o wizard com as opções novas e re-renderiza se a página estiver aberta.
  watchBuildSteps(({ steps, basePrice: bp }) => {
    STEPS = steps;
    basePrice = bp;
    selections = defaultSelections();
    currentStep = 0;
    if (store.get("page") === "cardapio") renderWizard();
  });

  // Lanche do Dia e MBox (configurados pelo admin) — ao vivo.
  watchLancheDia((cfg) => { lancheDiaCfg = cfg; if (store.get("page") === "cardapio") renderCategories(); });
  watchMbox((cfg) => { mboxCfg = cfg; if (store.get("page") === "cardapio") renderCategories(); });
  // Estoque do sábado muda quando pedidos mudam (novo/cancelado).
  store.subscribe("orders", () => { if (store.get("page") === "cardapio") refreshMboxStock(); });

  // Abas do cardápio ligadas/desligadas pelo admin (ao vivo).
  watchMenuTabs((cfg) => {
    menuTabsCfg = cfg;
    if (store.get("page") === "cardapio") applyCardapioGates();
  });
}
