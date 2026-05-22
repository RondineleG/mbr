/* ═══════════════════════════════════════════════════════════════
   HOME PAGE — status, progresso de rank, atalhos e recompensas
   ═══════════════════════════════════════════════════════════════ */
import { setHtml } from "../utils/dom.js";
import * as store from "../app/state.js";
import { rankFromPoints, money } from "../utils/format.js";
import { skeletonCards } from "../components/skeleton.js";
import { renderRewardCards } from "./clube.page.js";

function renderRankProgress() {
  const p = store.get("profile");
  if (!p) return;
  const r = rankFromPoints(p.points);
  const nextTxt = r.next
    ? `Faltam ${r.next.min - r.points} méritos para ${r.next.name}`
    : "Rank máximo da Ordem alcançado";
  setHtml("homeRankProgress", `
    <div class="rank-progress-top">
      <span class="rank-progress-rank">${r.name} · Nível ${r.level}</span>
      <span class="rank-progress-pts">${r.points} ⚡</span>
    </div>
    <div class="rank-progress-bar"><div class="rank-progress-fill" style="width:${r.progress}%"></div></div>
    <div class="rank-progress-next">${nextTxt}</div>`);
}

function renderRewards() {
  const rewards = store.get("rewards");
  const el = document.getElementById("homeRewardsScroll");
  if (!el) return;
  if (!rewards.length) { el.innerHTML = skeletonCards(3); return; }
  el.innerHTML = renderRewardCards(rewards.slice(0, 4), store.get("profile")?.points || 0);
}

export function renderHome() {
  renderRankProgress();
  renderRewards();
}

export function initHome() {
  store.subscribe("profile", renderHome);
  store.subscribe("rewards", renderRewards);
}

export { money };
