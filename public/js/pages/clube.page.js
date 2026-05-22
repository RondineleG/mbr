/* ═══════════════════════════════════════════════════════════════
   CLUBE PAGE — recompensas (resgate), missões, ranking e extrato
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "../utils/dom.js";
import * as store from "../app/state.js";
import { redeem, listRewards } from "../services/reward.service.js";
import { getHistory } from "../services/points.service.js";
import { listAgents } from "../services/user.service.js";
import { codenameInitials, rankLabel, dateShort } from "../utils/format.js";
import { modalConfirm } from "../components/modal.js";
import { toast, toastSuccess, toastError } from "../components/toast.js";
import { skeletonList, skeletonCards } from "../components/skeleton.js";

const MISSIONS = [
  { icon: "🎯", name: "Primeira Mordida", desc: "Faça seu primeiro pedido", reward: 100, progress: 100, status: "complete" },
  { icon: "📸", name: "Crítico Gastronômico", desc: "Envie review com foto de 3 pedidos", reward: 150, progress: 66, status: "active" },
  { icon: "🤝", name: "Recrutador", desc: "Efetive 3 convites este mês", reward: 300, progress: 33, status: "active" },
  { icon: "🔥", name: "Fidelidade Inabalável", desc: "Peça 4 semanas consecutivas", reward: 200, progress: 75, status: "active" },
  { icon: "📦", name: "Explorador MBox", desc: "Peça 4 MBox seguidas", reward: 500, progress: 0, status: "locked" },
  { icon: "🔍", name: "Decodificador", desc: "Adivinhe 3 ingredientes do MBox", reward: 100, progress: 0, status: "locked" },
];

let tab = "recompensas";

/** Cards de recompensa (reutilizado pela Home). */
export function renderRewardCards(rewards, userPoints) {
  return rewards.map((r) => {
    const locked = userPoints < r.pointsRequired;
    const btn = locked
      ? `<button class="reward-card-btn locked">🔒 Faltam ${r.pointsRequired - userPoints}</button>`
      : `<button class="reward-card-btn" data-action="redeem" data-id="${r.id}">RESGATAR</button>`;
    return `<div class="reward-card">
      <div class="reward-card-icon">${r.icon || "🎁"}</div>
      <div class="reward-card-name">${escapeHtml(r.name)}</div>
      <div class="reward-card-desc">${escapeHtml(r.description || "")}</div>
      <div class="reward-card-footer"><div class="reward-card-cost">Ⓜ ${r.pointsRequired}</div>${btn}</div>
    </div>`;
  }).join("");
}

function renderMissions() {
  return MISSIONS.map((m) => `
    <div class="mission-card ${m.status}">
      <span class="mission-icon">${m.icon}</span>
      <div class="mission-info">
        <div class="mission-name">${m.status === "locked" ? "🔒 " : ""}${escapeHtml(m.name)}</div>
        <div class="mission-desc">${escapeHtml(m.desc)}</div>
        <div class="mission-bar"><div class="mission-bar-fill" style="width:${m.progress}%"></div></div>
      </div>
      <div class="mission-reward">
        <div class="mission-reward-val" style="color:${m.status === "complete" ? "var(--success)" : "var(--gold)"}">+${m.reward}⚡</div>
        <div class="mission-reward-pct">${m.progress}%</div>
      </div>
    </div>`).join("");
}

async function renderRanking() {
  setHtml("clubeDynamic", `<div class="section-title">Ranking de Agentes</div>${skeletonList(4)}`);
  const me = store.get("profile");
  const agents = (await listAgents()).filter((a) => a.role !== "admin").slice(0, 20);
  const rows = agents.map((a, i) => {
    const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}`;
    return `<div class="rank-row ${a.uid === me?.uid ? "me" : ""}">
      <div class="rank-pos ${i < 3 ? "top" : ""}">${medal}</div>
      <div class="rank-avatar">${codenameInitials(a.codename)}</div>
      <div class="rank-info"><div class="rank-name">${escapeHtml(a.codename)}</div><div class="rank-tier">${rankLabel(a.points)}</div></div>
      <div class="rank-pts">${a.points || 0} ⚡</div>
    </div>`;
  }).join("");
  setHtml("clubeDynamic", `<div class="section-title">Ranking de Agentes <span class="section-subtitle">CAPÍTULO GÊNESIS</span></div>${rows || '<div class="empty-state">🏆</div>'}`);
}

async function renderHistory() {
  setHtml("clubeDynamic", `<div class="section-title">Extrato de Méritos</div>${skeletonList(4)}`);
  const me = store.get("profile");
  const items = await getHistory(me.uid);
  const rows = items.map((h) => `
    <div class="history-row">
      <div><div class="history-reason">${escapeHtml(h.reason)}</div><div class="history-date">${dateShort(h.createdAt)}</div></div>
      <div class="history-delta ${h.delta >= 0 ? "pos" : "neg"}">${h.delta >= 0 ? "+" : ""}${h.delta} ⚡</div>
    </div>`).join("");
  setHtml("clubeDynamic", `<div class="section-title">Extrato de Méritos</div>${rows || '<div class="empty-state">📊</div>'}`);
}

function renderRewardsTab() {
  const rewards = store.get("rewards");
  const pts = store.get("profile")?.points || 0;
  setHtml("clubeDynamic", `
    <div class="section-title">Recompensas Disponíveis <span class="section-subtitle">${pts} ⚡ DISPONÍVEIS</span></div>
    <div class="rewards-scroll">${rewards.length ? renderRewardCards(rewards, pts) : skeletonCards(3)}</div>
    <div class="section-title">Missões Ativas</div>
    ${renderMissions()}`);
}

export function renderClube() {
  if (tab === "recompensas") renderRewardsTab();
  else if (tab === "missoes") setHtml("clubeDynamic", `<div class="section-title">Missões Ativas</div>${renderMissions()}`);
  else if (tab === "ranking") renderRanking();
  else if (tab === "historico") renderHistory();
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
    else toastError("Não foi possível resgatar agora");
  }
}

export function initClube() {
  onAction("clube-tab", (el) => { tab = el.dataset.tab; renderClube(); });
  onAction("redeem", (el) => doRedeem(el.dataset.id));
  store.subscribe("rewards", () => { if (store.get("page") === "clube") renderClube(); });
  store.subscribe("profile", () => { if (store.get("page") === "clube" && (tab === "recompensas")) renderRewardsTab(); });
  // Recarrega recompensas caso ainda não tenham vindo.
  if (!store.get("rewards").length) listRewards().then((r) => store.set("rewards", r)).catch(() => {});
}
