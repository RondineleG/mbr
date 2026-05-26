/* ═══════════════════════════════════════════════════════════════
   WEB — versão desktop do app. Acesso SOMENTE admin; pode ser ligada/
   desligada pelo próprio admin (config/webPage).
   ═══════════════════════════════════════════════════════════════ */
import { $, setHtml, escapeHtml } from "../utils/dom.js";
import * as auth from "../firebase/auth.service.js";
import { getProfile } from "../services/user.service.js";
import { loadWebEnabled } from "../services/features.service.js";
import { listProducts } from "../services/product.service.js";
import { money } from "../utils/format.js";

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
  setHtml("webNav", CATS.map(([k, l]) => `<a href="#cat-${k}">${l}</a>`).join(""));

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

auth.onAuthChanged(async (user) => {
  if (!user) { window.location.replace("/"); return; }            // sem sessão → login único
  const profile = await getProfile(user.uid);
  if (profile?.role !== "admin") { window.location.replace("/"); return; }  // só admin
  const enabled = await loadWebEnabled();
  if (!enabled) { show("webLoading", false); show("webBlocked", true); return; } // desativada pelo admin
  renderWeb(profile);
});
