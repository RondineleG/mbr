/* ═══════════════════════════════════════════════════════════════
   MODAL — diálogo premium (substitui prompt()/alert() nativos)
   modalPrompt → resolve com o valor; modalConfirm → resolve bool.
   ═══════════════════════════════════════════════════════════════ */
import { escapeHtml } from "../utils/dom.js";

let overlay;

function ensure() {
  if (overlay) return;
  overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
}

let resolver = null;
function open(html) {
  ensure();
  overlay.querySelector(".modal-card").innerHTML = html;
  requestAnimationFrame(() => overlay.classList.add("show"));
}
function close(value) {
  if (overlay) overlay.classList.remove("show");
  if (resolver) { resolver(value); resolver = null; }
}

/** Campo de texto premium. Resolve com a string (ou null se cancelado). */
export function modalPrompt({ title, label, value = "", placeholder = "", type = "text" }) {
  return new Promise((resolve) => {
    resolver = resolve;
    open(`
      <div class="modal-title">${escapeHtml(title)}</div>
      ${label ? `<div class="modal-label">${escapeHtml(label)}</div>` : ""}
      <input class="modal-input" id="__modalInput" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">
      <div class="modal-actions">
        <button class="modal-btn ghost" data-modal="cancel">Cancelar</button>
        <button class="modal-btn primary" data-modal="ok">Salvar</button>
      </div>`);
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
    resolver = resolve;
    open(`
      <div class="modal-title">${escapeHtml(title)}</div>
      ${message ? `<div class="modal-message">${escapeHtml(message)}</div>` : ""}
      <div class="modal-actions">
        <button class="modal-btn ghost" data-modal="cancel">Cancelar</button>
        <button class="modal-btn ${danger ? "danger" : "primary"}" data-modal="ok">${escapeHtml(confirmText)}</button>
      </div>`);
    overlay.querySelector('[data-modal="ok"]').onclick = () => close(true);
    overlay.querySelector('[data-modal="cancel"]').onclick = () => close(false);
  });
}

/** Conteúdo HTML arbitrário (ex.: form de produto no admin). Retorna API. */
export function modalCustom(html) {
  ensure();
  open(html);
  return {
    el: overlay.querySelector(".modal-card"),
    close: () => close(null),
  };
}
