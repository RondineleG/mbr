/* ═══════════════════════════════════════════════════════════════
   CLUBE PAGE — recompensas (resgate), missões, ranking e extrato
   Sistema real de gamificação com progresso dinâmico
   ═══════════════════════════════════════════════════════════════ */
import { $, $$, onAction, setHtml, escapeHtml, enableDragScroll } from "../utils/dom.js";
import * as store from "../app/state.js";
import { redeem, listRewards } from "../services/reward.service.js";
import { getHistory } from "../services/points.service.js";
import { listAgents } from "../services/user.service.js";
import { getMissionsWithProgress, claimMissionReward, updateMissionProgress, calculateUserStats } from "../services/mission.service.js";
import { codenameInitials, rankLabel, dateShort } from "../utils/format.js";
import { modalConfirm, modalCustom } from "../components/modal.js";
import { toast, toastSuccess, toastError } from "../components/toast.js";
import { skeletonList, skeletonCards, emptyState, withLoading, withEmpty, loadingState } from "../utils/loading.js";
import { isEnabled } from "../services/features.service.js";
import { listLanches, getLanche, toggleStar, addLancheComment, listLancheComments, topForkedThisWeek } from "../services/lanche.service.js";
import { loadBuildSteps } from "../services/buildsteps.service.js";
import { navigate } from "../app/router.js";

let tab = "recompensas";
let category = "all"; // all, benefits, physical, experiences, status
let missions = [];
let isLoadingMissions = false;

/** Cards de recompensa (reutilizado pela Home). */
export function renderRewardCards(rewards, userPoints) {
  return rewards.map((r) => {
    const locked = userPoints < r.pointsRequired;
    const outOfStock = r.type === 'physical' && r.stock !== null && r.stock <= 0;
    
    let btn = '';
    if (outOfStock) {
      btn = `<button class="reward-card-btn locked">🚫 Esgotado</button>`;
    } else if (locked) {
      btn = `<button class="reward-card-btn locked">🔒 Faltam ${r.pointsRequired - userPoints}</button>`;
    } else {
      btn = `<button class="reward-card-btn" data-action="redeem" data-id="${r.id}">RESGATAR</button>`;
    }
    
    // Stock indicator for physical items.
    // `!= null` cobre null E undefined (estoque não definido não vira "undefined disponíveis").
    const stockIndicator = r.type === 'physical' && r.stock != null
      ? `<div class="reward-stock">📦 ${r.stock} disponíveis</div>`
      : '';
    
    return `<div class="reward-card">
      <div class="reward-card-icon">${r.icon || "🎁"}</div>
      <div class="reward-card-name">${escapeHtml(r.name)}</div>
      <div class="reward-card-desc">${escapeHtml(r.description || "")}</div>
      ${stockIndicator}
      <div class="reward-card-footer">
        <div class="reward-card-cost">⚡ ${r.pointsRequired}</div>
        ${btn}
      </div>
    </div>`;
  }).join("");
}

function renderMissions() {
  if (!missions || missions.length === 0) {
    return emptyState("🎯", "Nenhuma missão disponível", "As missões aparecerão aqui quando estiverem ativas");
  }
  
  return withLoading(
    withEmpty(
      missions.map((m) => {
        const progressPercent = m.progress || 0;
        const isCompleted = m.completed || false;
        const isLocked = m.locked || false;
        
        let statusClass = "active";
        let statusText = "Em andamento";
        let actionButton = "";
        
        if (isLocked) {
          statusClass = "locked";
          statusText = "Bloqueada";
        } else if (isCompleted) {
          statusClass = "complete";
          statusText = "Concluída";
          actionButton = `<button class="mission-claim-btn" data-action="claim-mission" data-id="${m.id}">Resgatar +${m.reward}⚡</button>`;
        } else {
          statusClass = "active";
          statusText = "Em andamento";
        }
        
        return `
          <div class="mission-card ${statusClass}">
            <span class="mission-icon">${m.icon || "🎯"}</span>
            <div class="mission-info">
              <div class="mission-name">${escapeHtml(m.name)}</div>
              <div class="mission-desc">${escapeHtml(m.description)}</div>
              <div class="mission-bar"><div class="mission-bar-fill" style="width:${progressPercent}%"></div></div>
              <div class="mission-progress-text">${progressPercent}%</div>
            </div>
            <div class="mission-reward">
              <div class="mission-reward-val" style="color:${isCompleted ? "var(--success)" : "var(--gold)"}">+${m.reward}⚡</div>
              <div class="mission-reward-pct">${statusText}</div>
            </div>
            ${actionButton}
          </div>
        `;
      }).join(""),
      !missions || missions.length === 0,
      {
        icon: "🎯",
        title: "Nenhuma missão disponível",
        description: "As missões aparecerão aqui quando estiverem ativas"
      }
    ),
    isLoadingMissions,
    "Carregando missões..."
  );
}

async function renderRanking() {
  setHtml("clubeDynamic", loadingState("Carregando ranking..."));
  const me = store.get("profile");
  const agents = (await listAgents()).filter((a) => a.role !== "admin").slice(0, 20);
  
  const content = withEmpty(
    agents.map((a, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}`;
      return `<div class="rank-row ${a.uid === me?.uid ? "me" : ""}">
        <div class="rank-pos ${i < 3 ? "top" : ""}">${medal}</div>
        <div class="rank-avatar">${codenameInitials(a.codename)}</div>
        <div class="rank-info"><div class="rank-name">${escapeHtml(a.codename)}</div><div class="rank-tier">${rankLabel(a.points)}</div></div>
        <div class="rank-pts">${a.points || 0} ⚡</div>
      </div>`;
    }).join(""),
    !agents || agents.length === 0,
    {
      icon: "🏆",
      title: "Nenhum agente no ranking",
      description: "O ranking será atualizado quando houver agentes"
    }
  );
  
  setHtml("clubeDynamic", `<div class="section-title">Ranking de Agentes <span class="section-subtitle">CAPÍTULO GÊNESIS</span></div>${content}`);
}

async function renderHistory() {
  setHtml("clubeDynamic", loadingState("Carregando extrato..."));
  const me = store.get("profile");
  const items = await getHistory(me.uid);
  
  const content = withEmpty(
    items.map((h) => `
      <div class="history-row">
        <div><div class="history-reason">${escapeHtml(h.reason)}</div><div class="history-date">${dateShort(h.createdAt)}</div></div>
        <div class="history-delta ${h.delta >= 0 ? "pos" : "neg"}">${h.delta >= 0 ? "+" : ""}${h.delta} ⚡</div>
      </div>`).join(""),
    !items || items.length === 0,
    {
      icon: "📊",
      title: "Nenhuma transação",
      description: "Seu extrato aparecerá aqui quando você ganhar ou gastar méritos"
    }
  );
  
  setHtml("clubeDynamic", `<div class="section-title">Extrato de Méritos</div>${content}`);
}

function renderRewardsTab() {
  const rewards = store.get("rewards");
  const profile = store.get("profile");
  const pts = profile?.points || 0;
  
  // Filtrar por categoria
  const filteredRewards = category === "all" 
    ? rewards 
    : rewards.filter(r => r.category === category);
  
  const rewardsContent = withEmpty(
    filteredRewards.length ? renderRewardCards(filteredRewards, pts) : "",
    !filteredRewards || filteredRewards.length === 0,
    {
      icon: "🎁",
      title: "Nenhuma recompensa nesta categoria",
      description: "Selecione outra categoria ou aguarde novas recompensas"
    }
  );
  
  // Category filter buttons
  const categoryFilters = `
    <div class="category-filters">
      <button class="category-filter ${category === 'all' ? 'active' : ''}" data-action="filter-category" data-category="all">Todas</button>
      <button class="category-filter ${category === 'benefits' ? 'active' : ''}" data-action="filter-category" data-category="benefits">Benefícios</button>
      <button class="category-filter ${category === 'physical' ? 'active' : ''}" data-action="filter-category" data-category="physical">Produtos</button>
      <button class="category-filter ${category === 'experiences' ? 'active' : ''}" data-action="filter-category" data-category="experiences">Experiências</button>
      <button class="category-filter ${category === 'status' ? 'active' : ''}" data-action="filter-category" data-category="status">Status</button>
    </div>
  `;
  
  // Loja de Méritos pode ser desligada pelo admin (por papel).
  const lojaOn = isEnabled(store.get("features") || {}, profile?.role || "agent", "lojaMeritos");
  const lojaBlock = lojaOn ? `
    <div class="section-title">Loja da Ordem</div>
    ${categoryFilters}
    <div class="rewards-scroll">${rewardsContent}</div>` : "";

  setHtml("clubeDynamic", `
    <div class="clube-balance">
      <div class="balance-card">
        <div class="balance-icon">⚡</div>
        <div class="balance-info">
          <div class="balance-label">Méritos</div>
          <div class="balance-value">${pts}</div>
        </div>
      </div>
    </div>
    ${lojaBlock}
    <div class="section-title">Missões Ativas</div>
    ${renderMissions()}`);

  // Arrastar-para-o-lado na loja (mostra todos os itens, não só os 2 visíveis).
  if (lojaOn) enableDragScroll($(".rewards-scroll"));
}

export function renderClube() {
  if (tab === "recompensas") renderRewardsTab();
  else if (tab === "missoes") setHtml("clubeDynamic", `<div class="section-title">Missões Ativas</div>${renderMissions()}`);
  else if (tab === "ranking") renderRanking();
  else if (tab === "historico") renderHistory();
  else if (tab === "criacoes") renderCriacoes();
}

/* ─── Criações (lanches gerados) — dossiê + forks + estrelas + comentários ─── */
function lancheCard(l) {
  const me = store.get("profile");
  const starred = (l.starredBy || []).includes(me?.uid);
  const ings = (l.ingredientes || []).map(escapeHtml).join(" · ");
  return `<div class="lanche-card" data-action="lanche-open" data-id="${l.id}">
    <div class="lanche-card-head">
      <div class="lanche-name">${escapeHtml(l.nome || l.id)}</div>
      <div class="lanche-by">por ${escapeHtml(l.criadoPorNome || "agente")}</div>
    </div>
    <div class="lanche-ings">${ings}</div>
    <div class="lanche-stats">
      <button class="lanche-stat ${starred ? "on" : ""}" data-action="lanche-star" data-id="${l.id}">${starred ? "★" : "☆"} ${l.stars || 0}</button>
      <span class="lanche-stat">🍴 ${l.forks || 0} forks</span>
      <button class="lanche-stat fork" data-action="lanche-fork" data-id="${l.id}">🍴 Fork</button>
    </div>
  </div>`;
}

async function renderCriacoes() {
  setHtml("clubeDynamic", loadingState("Carregando criações..."));
  let lanches = [], top = [];
  try { [lanches, top] = await Promise.all([listLanches(), topForkedThisWeek(3)]); } catch { lanches = []; top = []; }
  if (!lanches.length) {
    setHtml("clubeDynamic", `<div class="section-title">Criações da Ordem</div>${emptyState("🍔", "Nenhuma criação ainda", "Monte um lanche inédito no Cardápio e seja o primeiro a registrá-lo (+50⚡)")}`);
    return;
  }
  const medal = ["🥇", "🥈", "🥉"];
  const rank = top.length ? `
    <div class="lanche-rank">
      <div class="lanche-rank-title">🏆 Mais forkados da semana</div>
      ${top.map((l, i) => `<div class="lanche-rank-item">
        <span class="lanche-rank-pos">${medal[i] || (i + 1) + "º"}</span>
        <b>${escapeHtml(l.nome)}</b><small>por ${escapeHtml(l.criadoPorNome || "agente")}</small>
        <span class="lanche-rank-forks">🍴 ${l.forksWeek}</span></div>`).join("")}
    </div>` : "";
  setHtml("clubeDynamic", `<div class="section-title">Criações da Ordem</div>${rank}<div class="lanche-list">${lanches.map(lancheCard).join("")}</div>`);
}

const commentHtml = (c) => `<div class="lc-comment"><div class="lc-comment-head"><b>${escapeHtml(c.nome || "agente")}</b> <small>${dateShort(c.criadoEm)}</small></div><div>${escapeHtml(c.texto)}</div></div>`;

// Fork: adiciona o lanche IDÊNTICO à sacola (mesma composição → fork garantido
// no checkout) e vai para a sacola. Recalcula o preço pelos ingredientes atuais.
async function forkLanche(l) {
  let basePrice = 29.9; const priceByName = {};
  try {
    const cfg = await loadBuildSteps();
    basePrice = cfg.basePrice ?? 29.9;
    (cfg.steps || []).forEach((s) => (s.items || []).forEach((it) => { priceByName[it.name] = it.price || 0; }));
  } catch { /* usa preço-base padrão */ }
  let total = basePrice;
  (l.ingredientes || []).forEach((n) => { total += priceByName[n] || 0; });
  store.cartAdd({ custom: true, name: l.nome, icon: "🔧", price: total, qty: 1, desc: (l.ingredientes || []).join(", "), combo: l.ingredientes || [] });
  toastSuccess(`🍴 Fork de ${l.nome} na sacola!`);
  navigate("sacola");
}

async function openLancheModal(id) {
  const me = store.get("profile");
  const l = await getLanche(id);
  if (!l) return;
  const comments = await listLancheComments(id).catch(() => []);
  const starred = (l.starredBy || []).includes(me?.uid);
  const ings = (l.ingredientes || []).map(escapeHtml).join(" · ");
  const dlg = modalCustom(`
    <div class="modal-title" style="font-family:var(--f-mono)">${escapeHtml(l.nome || id)}</div>
    <div class="lc-by">criado por <b>${escapeHtml(l.criadoPorNome || "agente")}</b></div>
    <div class="lc-ings">${ings}</div>
    <div class="lc-stats">
      <button class="modal-btn ghost" id="lc-star">${starred ? "★" : "☆"} <span id="lc-stars">${l.stars || 0}</span></button>
      <span class="lc-fork">🍴 ${l.forks || 0} forks</span>
    </div>
    <div class="modal-label">COMENTÁRIOS</div>
    <div class="lc-comments" id="lc-comments">${comments.length ? comments.map(commentHtml).join("") : '<div class="lc-empty">Sem comentários ainda. Seja o primeiro.</div>'}</div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <input class="modal-input" id="lc-input" placeholder="Comentar…" maxlength="500" style="flex:1">
      <button class="modal-btn primary" id="lc-send">Enviar</button>
    </div>
    <div class="modal-actions"><button class="modal-btn ghost" id="lc-close">Fechar</button><button class="modal-btn primary" id="lc-fork">🍴 Fork — pedir este lanche</button></div>`);
  const el = dlg.el;
  el.querySelector("#lc-close").onclick = dlg.close;
  el.querySelector("#lc-fork").onclick = () => { dlg.close(); forkLanche(l); };
  el.querySelector("#lc-star").onclick = async () => {
    if (!me) return;
    const on = await toggleStar(id, me.uid);
    const fresh = await getLanche(id);
    const btn = el.querySelector("#lc-star");
    btn.innerHTML = `${on ? "★" : "☆"} <span id="lc-stars">${fresh?.stars || 0}</span>`;
  };
  el.querySelector("#lc-send").onclick = async () => {
    const inp = el.querySelector("#lc-input");
    const txt = (inp.value || "").trim();
    if (!txt || !me) return;
    try {
      await addLancheComment(id, me.uid, me.codename, txt);
      inp.value = "";
      const cs = await listLancheComments(id);
      el.querySelector("#lc-comments").innerHTML = cs.map(commentHtml).join("");
    } catch { toastError("Não foi possível comentar agora"); }
  };
}

async function loadMissions() {
  const me = store.get("profile");
  if (!me) { isLoadingMissions = false; return; }
  isLoadingMissions = true;
  if (tab === "missoes" || tab === "recompensas") renderClube();

  // 1) Carrega e RENDERIZA as missões imediatamente (não depende de escrita).
  try {
    missions = await getMissionsWithProgress(me.uid);
  } catch (err) {
    console.error("Erro ao carregar missões:", err);
  } finally {
    isLoadingMissions = false;
    if (tab === "missoes" || tab === "recompensas") renderClube();
  }

  // 2) Atualiza o progresso em segundo plano (best-effort): se a escrita travar
  //    ou for bloqueada, a lista já está na tela e não fica presa.
  try {
    const userStats = await calculateUserStats(me.uid);
    await updateMissionProgress(me.uid, {
      signupCompleted: me.signupCompleted || false,
      ordersCount: userStats.ordersCount,
      points: me.points || 0,
      invitesUsed: me.invitesUsed || 0,
      weekDays: userStats.weekDays,
      mboxCount: userStats.mboxCount
    });
    missions = await getMissionsWithProgress(me.uid);
    if (tab === "missoes" || tab === "recompensas") renderClube();
  } catch (err) {
    console.warn("Progresso de missões não atualizado (best-effort):", err?.message || err);
  }
}

async function doRedeem(id) {
  const reward = store.get("rewards").find((r) => r.id === id);
  const me = store.get("profile");
  if (!reward || !me) return;
  const ok = await modalConfirm({
    title: "Resgatar " + reward.name,
    message: `Confirmar resgate por ${reward.pointsRequired} méritos? Seu saldo: ${me.points} ⚡.`,
    confirmText: "Resgatar",
  });
  if (!ok) return;
  try {
    await redeem(me.uid, reward);
    toast("success", "🎁", `Recompensa desbloqueada: ${reward.name}!`);
    renderClube(); // saldo atualiza via watchProfile
  } catch (err) {
    if (String(err.message).includes("INSUFFICIENT")) toastError("Méritos insuficientes para este resgate");
    else if (String(err.message).includes("OUT_OF_STOCK")) toastError("Esta recompensa está esgotada");
    else toastError("Não foi possível resgatar agora");
  }
}

async function doClaimMission(missionId) {
  const mission = missions.find((m) => m.id === missionId);
  const me = store.get("profile");
  if (!mission || !me) return;
  
  const ok = await modalConfirm({
    title: "Resgatar Recompensa",
    message: `Confirmar resgate de ${mission.reward} méritos pela missão "${mission.name}"?`,
    confirmText: "Resgatar",
  });
  
  if (!ok) return;
  
  try {
    await claimMissionReward(me.uid, missionId);
    toastSuccess(`🎯 Recompensa resgatada: +${mission.reward} ⚡`);
    renderClube();
  } catch (err) {
    console.error("Erro ao resgatar missão:", err);
    toastError("Não foi possível resgatar a recompensa");
  }
}

// Marca a aba ativa nos botões do topo do Clube.
function setActiveTab(name) {
  $$(".clube-action").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
}

export function initClube() {
  onAction("clube-help", () => {
    const dlg = modalCustom(`
      <div class="modal-title">Como funciona o Clube</div>
      <div class="clube-help">
        <p><b>⚡ Méritos</b> são seus pontos. Você ganha a cada pedido entregue, ao criar lanches e ao completar missões, e troca por recompensas em <i>Resgatar</i>.</p>
        <p><b>🎖️ Patente</b> é o seu nível na Ordem: sobe conforme você acumula méritos.</p>
        <p><b>🏆 Missões</b> são desafios que dão méritos extras ao concluir.</p>
        <p><b>🍔 Criações</b>: monte um lanche inédito e ele vira sua criação. Outros podem "forkar" e favoritar, e o 1º a criar uma combinação ganha bônus.</p>
        <p><b>👑 Ranking</b> mostra os agentes com mais méritos na semana.</p>
      </div>
      <div class="modal-actions"><button class="modal-btn primary" id="clubeHelpOk" type="button">Entendi</button></div>`);
    dlg.el.querySelector("#clubeHelpOk").onclick = () => dlg.close();
  });
  onAction("clube-tab", (el) => {
    tab = el.dataset.tab;
    setActiveTab(tab);
    renderClube();
    // Carrega missões sob demanda (no init o profile ainda pode não existir).
    if ((tab === "missoes" || tab === "recompensas") && !missions.length) loadMissions();
  });
  // Criações: abrir dossiê (modal), estrelar e forkar pelo card.
  onAction("lanche-open", (el) => openLancheModal(el.dataset.id));
  onAction("lanche-fork", async (el) => {
    const l = await getLanche(el.dataset.id);
    if (l) forkLanche(l);
  });
  onAction("lanche-star", async (el) => {
    const me = store.get("profile");
    if (!me) return;
    try { await toggleStar(el.dataset.id, me.uid); if (tab === "criacoes") renderCriacoes(); }
    catch { toastError("Não foi possível estrelar agora"); }
  });
  // Abre o Clube já numa aba específica (usado pela sidebar e atalhos da Home,
  // p/ que "Missões" leve sempre ao mesmo lugar que o menu interno).
  onAction("clube-open", (el) => {
    tab = el.dataset.tab || "recompensas";
    setActiveTab(tab);
    import("../app/router.js").then((m) => m.navigate("clube"));
    if ((tab === "missoes" || tab === "recompensas") && !missions.length) loadMissions();
  });
  onAction("redeem", (el) => doRedeem(el.dataset.id));
  onAction("claim-mission", (el) => doClaimMission(el.dataset.id));
  onAction("filter-category", (el) => { category = el.dataset.category; renderClube(); });
  store.subscribe("rewards", () => { if (store.get("page") === "clube") renderClube(); });
  store.subscribe("profile", () => { if (store.get("page") === "clube" && (tab === "recompensas")) renderRewardsTab(); });
  store.subscribe("missionProgress", () => { if (store.get("page") === "clube" && (tab === "missoes" || tab === "recompensas")) renderClube(); });
  
  // Carregar missões e recompensas
  loadMissions();
  if (!store.get("rewards").length) listRewards().then((r) => store.set("rewards", r)).catch(() => {});
}
