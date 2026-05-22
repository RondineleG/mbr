/* ═══════════════════════════════════════════════════════════════
   ROUTER — navegação entre páginas (toggle de display)
   Páginas são <div class="page" id="page-{nome}">. Mantém o padrão
   do protótipo (mais performático que recriar DOM).
   ═══════════════════════════════════════════════════════════════ */
import { $$, onAction } from "../utils/dom.js";
import { set } from "./state.js";

const routeListeners = new Set();

/** Assina troca de página (callback recebe o nome da página). */
export const onRoute = (fn) => { routeListeners.add(fn); return () => routeListeners.delete(fn); };

export function navigate(page) {
  set("page", page);
  $$(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + page)?.classList.add("active");

  $$(".nav-item").forEach((n) => n.classList.remove("active"));
  document.getElementById("nav-" + page)?.classList.add("active");

  window.scrollTo(0, 0);
  routeListeners.forEach((fn) => fn(page));
}

/** Liga os elementos com data-action="nav" e data-page="...". */
export function initRouter() {
  onAction("nav", (el) => navigate(el.dataset.page));
}
