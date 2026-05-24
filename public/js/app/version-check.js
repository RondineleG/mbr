/* ═══════════════════════════════════════════════════════════════
   VERSION CHECK — compara a versão instalada (APP_VERSION) com a
   versão oficial no Firestore (config/app). Se o app estiver atrás,
   dispara a atualização: força (config.forceUpdate=true) ou avisa.
   ═══════════════════════════════════════════════════════════════ */
import { APP_VERSION } from "../version.js";
import { getDoc } from "../firebase/db.service.js";
import { info, debug } from "../utils/logger.js";

/** true se `a` é mais nova que `b` (semver simples x.y.z). */
function isNewer(a, b) {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

/** Lê config/app e, se a versão do banco for mais nova, atualiza/avisa. */
export async function checkAppVersion() {
  try {
    const cfg = await getDoc("config/app");
    if (!cfg || !cfg.version) return;

    if (isNewer(cfg.version, APP_VERSION)) {
      info("VERSION", `Desatualizado: instalada ${APP_VERSION}, banco ${cfg.version}`);
      // Garante que o SW busque a nova versão.
      try { (await navigator.serviceWorker?.getRegistration())?.update(); } catch {}
      // forceUpdate no banco → recarrega sozinho; senão → mostra aviso.
      if (cfg.forceUpdate && typeof window.MBforceUpdate === "function") {
        window.MBforceUpdate();
      } else if (typeof window.MBshowUpdateNotice === "function") {
        window.MBshowUpdateNotice();
      }
    } else {
      debug("VERSION", `App na última versão (${APP_VERSION})`);
    }
  } catch (e) {
    debug("VERSION", "checagem de versão falhou: " + (e?.message || e));
  }
}
