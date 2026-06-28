/* ═══════════════════════════════════════════════════════════════
   MODAL — diálogo premium (substitui prompt()/alert() nativos)
   modalPrompt → resolve com o valor; modalConfirm → resolve bool.
   ═══════════════════════════════════════════════════════════════ */
import { escapeHtml } from "../utils/dom.js";

let overlay;
let resolver = null;
let lastFocus = null;
let cancelValue = null;
let onCloseHook = null; // chamado em QUALQUER fechamento (botão, ESC, clique-fora)

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function ensure() {
  if (overlay) return;
  overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" tabindex="-1"></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(cancelValue); });
}

function visibleFocusable() {
  const card = overlay?.querySelector(".modal-card");
  if (!card) return [];
  return Array.from(card.querySelectorAll(focusableSelector))
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function onKeydown(e) {
  if (!overlay?.classList.contains("show")) return;
  const card = overlay.querySelector(".modal-card");
  if (!card) return;
  if (e.key === "Escape") {
    e.preventDefault();
    close(cancelValue);
    return;
  }
  if (e.key !== "Tab") return;
  const nodes = visibleFocusable();
  if (!nodes.length) {
    e.preventDefault();
    card.focus();
    return;
  }
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey && (document.activeElement === first || !card.contains(document.activeElement))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function open(html, fallback = null, onClose = null) {
  ensure();
  // Re-entrância: se já há um modal ativo, encerra-o limpo (resolve cancel + roda
  // onClose) antes de assumir o overlay — evita Promise pendente e listener vazado.
  if (resolver) { resolver(cancelValue); resolver = null; }
  if (onCloseHook) { const h = onCloseHook; onCloseHook = null; try { h(cancelValue); } catch (e) { console.error(e); } }
  cancelValue = fallback;
  onCloseHook = onClose;
  lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const card = overlay.querySelector(".modal-card");
  card.innerHTML = html;
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("tabindex", "-1");
  const title = card.querySelector(".modal-title");
  if (title) {
    title.id ||= "__modalTitle";
    card.setAttribute("aria-labelledby", title.id);
  } else {
    card.removeAttribute("aria-labelledby");
  }
  document.addEventListener("keydown", onKeydown);
  requestAnimationFrame(() => {
    overlay.classList.add("show");
    if (!card.contains(document.activeElement)) (visibleFocusable()[0] || card).focus({ preventScroll: true });
  });
}
function close(value) {
  if (overlay) overlay.classList.remove("show");
  document.removeEventListener("keydown", onKeydown);
  const focusBack = lastFocus;
  lastFocus = null;
  if (resolver) { resolver(value); resolver = null; }
  const hook = onCloseHook; onCloseHook = null;
  if (hook) { try { hook(value); } catch (e) { console.error(e); } }
  requestAnimationFrame(() => {
    if (focusBack?.isConnected) focusBack.focus({ preventScroll: true });
  });
}

/** Campo de texto premium. Resolve com a string (ou null se cancelado). */
export function modalPrompt({ title, label, value = "", placeholder = "", type = "text" }) {
  return new Promise((resolve) => {
    open(`
      <div class="modal-title">${escapeHtml(title)}</div>
      ${label ? `<div class="modal-label">${escapeHtml(label)}</div>` : ""}
      <input class="modal-input" id="__modalInput" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">
      <div class="modal-actions">
        <button class="modal-btn ghost" data-modal="cancel">Cancelar</button>
        <button class="modal-btn primary" data-modal="ok">Salvar</button>
      </div>`, null);
    resolver = resolve; // após open() (ver nota em modalConfirm)
    const input = overlay.querySelector("#__modalInput");
    input.focus();
    input.select();
    overlay.querySelector('[data-modal="ok"]').onclick = () => close(input.value.trim());
    overlay.querySelector('[data-modal="cancel"]').onclick = () => close(null);
    input.onkeydown = (e) => { if (e.key === "Enter") close(input.value.trim()); };
  });
}

/** Confirmação. Resolve true/false. */
export function modalConfirm({ title, message, confirmText = "Confirmar", danger = false }) {
  return new Promise((resolve) => {
    // open() ANTES de setar o resolver: a limpeza de re-entrância dentro de open()
    // encerra o modal anterior; se setássemos o resolver antes, open() o mataria
    // (resolveria esta Promise com cancelValue) e o confirmar não faria nada.
    open(`
      <div class="modal-title">${escapeHtml(title)}</div>
      ${message ? `<div class="modal-message">${escapeHtml(message)}</div>` : ""}
      <div class="modal-actions">
        <button class="modal-btn ghost" data-modal="cancel">Cancelar</button>
        <button class="modal-btn ${danger ? "danger" : "primary"}" data-modal="ok">${escapeHtml(confirmText)}</button>
      </div>`, false);
    resolver = resolve;
    overlay.querySelector('[data-modal="ok"]').onclick = () => close(true);
    overlay.querySelector('[data-modal="cancel"]').onclick = () => close(false);
  });
}

/** Conteúdo HTML arbitrário (ex.: form de produto no admin). Retorna API.
 *  opts.onClose é chamado em qualquer fechamento (botão, ESC, clique-fora) —
 *  use p/ limpar listeners (ex.: unsubscribe do chat) e evitar vazamentos. */
export function modalCustom(html, opts = {}) {
  ensure();
  open(html, null, opts.onClose || null);
  return {
    el: overlay.querySelector(".modal-card"),
    close: () => close(null),
  };
}
