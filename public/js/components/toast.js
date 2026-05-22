/* ═══════════════════════════════════════════════════════════════
   TOAST — feedback não-bloqueante (some sozinho em 3.5s)
   Injeta seu próprio markup; basta importar e chamar toast().
   ═══════════════════════════════════════════════════════════════ */
let el, iconEl, textEl, timer;

function ensure() {
  if (el) return;
  el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="toast-icon"></span><span class="toast-text"></span><button class="toast-close" aria-label="Fechar">✕</button>`;
  document.body.appendChild(el);
  iconEl = el.querySelector(".toast-icon");
  textEl = el.querySelector(".toast-text");
  el.querySelector(".toast-close").addEventListener("click", hideToast);
}

/** @param {'success'|'error'|'info'} type */
export function toast(type, icon, text) {
  ensure();
  el.className = "toast " + type;
  iconEl.textContent = icon;
  textEl.textContent = text;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(timer);
  timer = setTimeout(hideToast, 3500);
}

export function hideToast() {
  if (el) el.classList.remove("show");
  clearTimeout(timer);
}

export const toastSuccess = (t) => toast("success", "✅", t);
export const toastError = (t) => toast("error", "⚠", t);
export const toastInfo = (icon, t) => toast("info", icon, t);
