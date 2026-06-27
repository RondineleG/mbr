/* ═══════════════════════════════════════════════════════════════
   HOME PAGE — status, progresso de rank, atalhos e recompensas
   ═══════════════════════════════════════════════════════════════ */
import { setHtml, setText, show } from "../utils/dom.js";
import * as store from "../app/state.js";
import { rankFromPoints, money } from "../utils/format.js";
import { skeletonCards } from "../components/skeleton.js";
import { renderRewardCards } from "./clube.page.js";
import { isEnabled } from "../services/features.service.js";
import { orderCutoffHour, deliveryWindow, isStoreOpen, storeOpenHour, storeCloseHour } from "../services/schedule.service.js";

// Status da loja (aberto/fechado pela grade) + linha "aceitos até Xh · Entrega …".
function renderStatusSub() {
  const open = isStoreOpen();
  const box = document.getElementById("homeStatus");
  const txt = document.getElementById("homeStatusText");
  const dot = document.getElementById("homeStatusDot");
  if (box) { box.classList.toggle("open", open); box.classList.toggle("closed", !open); }
  if (txt) { txt.classList.toggle("open", open); txt.classList.toggle("closed", !open); txt.textContent = open ? "TRANSMISSÕES ABERTAS" : "TRANSMISSÕES FECHADAS"; }
  if (dot) dot.textContent = open ? "🟢" : "🔴";
  const sub = open
    ? `Pedidos aceitos até ${orderCutoffHour()}h · Entrega ${deliveryWindow()}`
    : `Fechado agora · abre às ${storeOpenHour()}h (fecha ${storeCloseHour()}h)`;
  setText("homeStatusSub", sub);
}

function updateRewardsDots() {
  const scroll = document.getElementById("homeRewardsScroll");
  const dots = document.getElementById("homeRewardsDots");
  if (!scroll || !dots) return;
  const cards = Array.from(scroll.children).filter((el) => el.classList.contains("reward-card"));
  const count = Math.min(cards.length, 4);
  if (count <= 1) { dots.innerHTML = ""; return; }
  const maxScroll = Math.max(1, scroll.scrollWidth - scroll.clientWidth);
  const active = Math.min(count - 1, Math.round((scroll.scrollLeft / maxScroll) * (count - 1)));
  dots.innerHTML = Array.from({ length: count }, (_, i) =>
    `<span class="rewards-dot ${i === active ? "active" : ""}"></span>`).join("");
}

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
  // "Recompensas em Destaque" depende da Loja de Méritos estar ativa pro papel.
  const profile = store.get("profile");
  const meritosOn = isEnabled(store.get("features") || {}, profile?.role || "agent", "lojaMeritos");
  show(document.getElementById("homeRewardsSection"), meritosOn);
  if (!meritosOn) return;

  const rewards = store.get("rewards");
  const el = document.getElementById("homeRewardsScroll");
  if (!el) return;
  if (!rewards.length) { el.innerHTML = skeletonCards(3); updateRewardsDots(); return; }
  el.innerHTML = renderRewardCards(rewards.slice(0, 4), profile?.points || 0);
  updateRewardsDots();
  el.onscroll = () => updateRewardsDots();
}

export function renderHome() {
  renderRankProgress();
  renderRewards();
  renderStatusSub();
}

export function initHome() {
  store.subscribe("profile", renderHome);
  store.subscribe("rewards", renderRewards);
  store.subscribe("features", renderRewards);
}

export { money };
