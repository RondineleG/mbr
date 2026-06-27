/* ═══════════════════════════════════════════════════════════════
   TOAST — feedback não-bloqueante (some sozinho).
   toast(type, icon, text[, action]) — action = { label, onClick } mostra
   um botão (ex.: "Desfazer") e estende o tempo visível.
   ═══════════════════════════════════════════════════════════════ */
let el, iconEl, textEl, actionEl, timer, actionFn = null;

function ensure() {
  if (el) return;
  el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="toast-icon"></span><span class="toast-text"></span><button class="toast-action" type="button" hidden></button><button class="toast-close" aria-label="Fechar">✕</button>`;
  document.body.appendChild(el);
  iconEl = el.querySelector(".toast-icon");
  textEl = el.querySelector(".toast-text");
  actionEl = el.querySelector(".toast-action");
  el.querySelector(".toast-close").addEventListener("click", hideToast);
  actionEl.addEventListener("click", () => { const fn = actionFn; hideToast(); fn?.(); });
}

/** @param {'success'|'error'|'info'} type @param {{label:string,onClick:Function}=} action */
export function toast(type, icon, text, action) {
  ensure();
  el.className = "toast " + type;
  iconEl.textContent = icon;
  textEl.textContent = text;
  if (action && action.label && typeof action.onClick === "function") {
    actionEl.textContent = action.label; actionEl.hidden = false; actionFn = action.onClick;
  } else {
    actionEl.hidden = true; actionFn = null;
  }
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(timer);
  timer = setTimeout(hideToast, action ? 6000 : 3500); // mais tempo quando há ação
}

export function hideToast() {
  if (el) el.classList.remove("show");
  clearTimeout(timer);
}

export const toastSuccess = (t) => toast("success", "✅", t);
export const toastError = (t) => toast("error", "⚠", t);
export const toastInfo = (icon, t) => toast("info", icon, t);
