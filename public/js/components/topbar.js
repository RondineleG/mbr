/* ═══════════════════════════════════════════════════════════════
   TOPBAR — avatar, nome/rank, tema e carrinho (reativo ao store)
   ═══════════════════════════════════════════════════════════════ */
import { setText, show } from "../utils/dom.js";
import * as store from "../app/state.js";
import { codenameInitials, rankLabel } from "../utils/format.js";

export function renderTopbar() {
  const p = store.get("profile");
  if (!p) return;
  setText("agentName", p.codename || "agente");
  setText("agentRank", rankLabel(p.points));
  setText("topbarAvatar", codenameInitials(p.codename));
  const themeBtn = document.getElementById("themeBtn");
  if (themeBtn) themeBtn.textContent = store.get("theme") === "light" ? "☀️" : "🌙";
  renderCartBadges();
}

export function renderCartBadges() {
  const count = store.cartCount();
  ["topCartBadge", "navCartBadge"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    show(el, count > 0);
  });
}
