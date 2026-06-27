/* ═══════════════════════════════════════════════════════════════
   BUSCA PAGE — filtro sobre o catálogo (Firestore) + atalhos
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "../utils/dom.js";
import * as store from "../app/state.js";
import { money } from "../utils/format.js";
import { navigate } from "../app/router.js";
import { showCat } from "./cardapio.page.js";
import { toastInfo } from "../components/toast.js";

function filter() {
  const q = ($("#searchInput")?.value || "").toLowerCase().trim();
  const el = $("#searchResults");
  if (!el) return;
  // A página já mostra "Populares" + "Categorias" de forma estática; quando não há
  // busca, apenas limpamos a área de resultados (sem duplicar atalhos).
  if (!q) { el.innerHTML = ""; return; }
  const results = store.get("products").filter((p) =>
    p.active !== false &&
    (p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || (p.category || "").includes(q)));
  el.innerHTML = results.length
    ? results.map((p) => `
      <div class="menu-item" data-action="add-product" data-id="${p.id}" style="margin-bottom:8px">
        <span class="menu-item-icon">${p.icon || "🍔"}</span>
        <div class="menu-item-info"><div class="menu-item-name">${escapeHtml(p.name)}</div><div class="menu-item-desc">${escapeHtml(p.description || "")}</div></div>
        <span class="menu-item-price">${money(p.price)}</span>
      </div>`).join("")
    : `<div class="text-center" style="padding:24px;color:var(--text-dim)">Nenhum resultado para "${escapeHtml(q)}"</div>`;
}

function addProduct(id) {
  const p = store.get("products").find((x) => x.id === id);
  if (!p) return;
  store.cartAdd({ productId: p.id, name: p.name, icon: p.icon || "🍔", price: p.price, qty: 1, desc: "" });
  toastInfo(p.icon || "🛒", `${p.name} adicionado à sacola`);
}

export function initBusca() {
  $("#searchInput")?.addEventListener("input", filter);
  onAction("search-tag", (el) => { $("#searchInput").value = el.dataset.term; filter(); });
  onAction("search-cat", (el) => { navigate("cardapio"); showCat(el.dataset.cat); });
  // add-product já é tratado em cardapio.page; adicionamos um handler local de reforço.
  onAction("search-add", (el) => addProduct(el.dataset.id));
}
