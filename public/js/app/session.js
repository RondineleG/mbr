/* ═══════════════════════════════════════════════════════════════
   SESSION — orquestra overlays (splash/login/onboarding/app),
   o perfil corrente e os listeners realtime do agente.
   ═══════════════════════════════════════════════════════════════ */
import { $, show } from "../utils/dom.js";
import * as store from "./state.js";
import { navigate } from "./router.js";
import * as auth from "../firebase/auth.service.js";
import * as userSvc from "../services/user.service.js";
import { watchUserOrders } from "../services/order.service.js";
import { listProducts } from "../services/product.service.js";
import { listRewards } from "../services/reward.service.js";
import { renderTopbar } from "../components/topbar.js";

let unsubProfile = null;
let unsubOrders = null;
let entered = false;

function stopWatchers() {
  unsubProfile?.(); unsubProfile = null;
  unsubOrders?.(); unsubOrders = null;
}

/** Aplica o tema salvo ao <body>. */
export function applyTheme() {
  const theme = store.get("theme");
  document.body.setAttribute("data-theme", theme === "light" ? "light" : "");
}

export function showLogin() {
  entered = false;
  stopWatchers();
  show($("#app"), false);
  $("#onboardingOverlay")?.classList.add("hidden");
  $("#loginOverlay")?.classList.remove("hidden");
}

export function showOnboarding() {
  $("#loginOverlay")?.classList.add("hidden");
  $("#onboardingOverlay")?.classList.remove("hidden");
}

/** Entra no app com um perfil válido. Idempotente. */
export async function enterApp(profile) {
  store.set("profile", profile);
  if (entered) { renderTopbar(); return; }
  entered = true;

  $("#loginOverlay")?.classList.add("hidden");
  $("#onboardingOverlay")?.classList.add("hidden");
  show($("#app"), true);

  // Realtime: perfil (pontos/rank) e pedidos do agente.
  unsubProfile = userSvc.watchProfile(profile.uid, (p) => { if (p) store.set("profile", p); });
  unsubOrders = watchUserOrders(profile.uid, (orders) => store.set("orders", orders));

  // Catálogo + recompensas (uma vez).
  listProducts({ activeOnly: true }).then((p) => store.set("products", p)).catch(() => {});
  listRewards({ activeOnly: true }).then((r) => store.set("rewards", r)).catch(() => {});

  renderTopbar();
  navigate("home");
  userSvc.touchLogin(profile.uid);
}

export async function logout() {
  await auth.signOut();
  store.set("profile", null);
  showLogin();
  navigate("home");
}

/**
 * Bootstrap de sessão: reage a login/logout do Firebase.
 * Sessão persistida → carrega perfil e entra direto.
 */
export function startSessionObserver() {
  applyTheme();
  auth.onAuthChanged(async (user) => {
    store.set("authUser", user);
    if (!user) { showLogin(); return; }

    const profile = await userSvc.getProfile(user.uid);
    if (profile) {
      enterApp(profile);
    } else if (!entered) {
      // Conta sem perfil (ex.: cadastro interrompido). Volta ao login.
      showLogin();
    }
  });
}
