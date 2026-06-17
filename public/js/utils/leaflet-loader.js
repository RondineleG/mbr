/* ═══════════════════════════════════════════════════════════════
   LEAFLET LOADER — injeta o Leaflet (CSS+JS) sob demanda.
   O app do cliente não carrega o Leaflet no boot; só quando há uma
   entrega sendo rastreada ao vivo. Resolve para window.L (uma vez).
   ═══════════════════════════════════════════════════════════════ */
const CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
let _promise = null;

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (_promise) return _promise;
  _promise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS;
      document.head.appendChild(link);
    }
    const s = document.createElement("script");
    s.src = JS;
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = () => { _promise = null; reject(new Error("Falha ao carregar o Leaflet")); };
    document.head.appendChild(s);
  });
  return _promise;
}
