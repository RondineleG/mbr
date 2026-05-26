/* ═══════════════════════════════════════════════════════════════
   DOM — helpers minimalistas (sem framework)
   ═══════════════════════════════════════════════════════════════ */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escapa texto para interpolação segura em innerHTML (evita XSS). */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Define o conteúdo HTML de um elemento por id (no-op se não existir). */
export function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function show(el, visible = true) {
  if (typeof el === "string") el = document.getElementById(el);
  if (el) el.style.display = visible ? "" : "none";
}

/**
 * Delegação de eventos: registra um handler no document que dispara
 * quando o clique acontece dentro de um elemento com [data-action="name"].
 * O elemento mais próximo com data-action é passado ao callback.
 */
const actionHandlers = new Map();
const changeHandlers = new Map();
let clickBound = false;
let changeBound = false;

export function onAction(name, handler) {
  actionHandlers.set(name, handler);
  if (!clickBound) {
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-action]");
      if (!target || target.tagName === "SELECT") return; // SELECT usa onChange
      const fn = actionHandlers.get(target.dataset.action);
      if (fn) fn(target, e);
    });
    clickBound = true;
  }
}

/** Delegação de "change" (selects, inputs) para [data-action]. */
export function onChange(name, handler) {
  changeHandlers.set(name, handler);
  if (!changeBound) {
    document.addEventListener("change", (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const fn = changeHandlers.get(target.dataset.action);
      if (fn) fn(target, e);
    });
    changeBound = true;
  }
}

/** Lê todos os data-* de um elemento como objeto simples. */
export const dataset = (el) => ({ ...el.dataset });

/**
 * Habilita arrastar-para-rolar (horizontal) num container com overflow-x.
 * Usa Pointer Events (mouse + touch) e cancela o clique se houve arrasto,
 * para não disparar ações (ex.: RESGATAR) ao soltar após mover.
 */
export function enableDragScroll(el) {
  if (!el || el.dataset.dragScroll) return;
  el.dataset.dragScroll = "1";
  let down = false, startX = 0, startLeft = 0, moved = false;
  el.addEventListener("pointerdown", (e) => {
    down = true; moved = false;
    startX = e.pageX; startLeft = el.scrollLeft;
  });
  el.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.pageX - startX;
    if (Math.abs(dx) > 4) moved = true;
    el.scrollLeft = startLeft - dx;
  });
  const end = () => { down = false; };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointerleave", end);
  el.addEventListener("click", (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}
