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
import * as missionService from "../services/mission.service.js";

let unsubProfile = null;
let unsubOrders = null;
let unsubMissions = null;
let entered = false;

function stopWatchers() {
  unsubProfile?.(); unsubProfile = null;
  unsubOrders?.(); unsubOrders = null;
  unsubMissions?.(); unsubMissions = null;
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

  // Mostrar botão admin se for admin
  if (profile.role === "admin") {
    $("#sidemenuAdminBtn")?.style.removeProperty("display");
    $("#sidemenuAdminBtn")?.classList.add("visible");
  }

  // Atualizar informações do usuário no sidebar
  updateSidemenuUser(profile);

  // Restaurar estado do sidebar (collapsed/expanded)
  const isCollapsed = localStorage.getItem("sidemenu-collapsed") === "true";
  if (isCollapsed) {
    $("#sidemenu")?.classList.add("collapsed");
  }

  // Realtime: perfil (pontos/rank) e pedidos do agente.
  unsubProfile = userSvc.watchProfile(profile.uid, (p) => { 
    if (p) {
      store.set("profile", p);
      updateSidemenuUser(p);
    }
  });
  unsubOrders = watchUserOrders(profile.uid, (orders) => store.set("orders", orders));
  unsubMissions = missionService.watchMissionProgress(profile.uid, (progress) => store.set("missionProgress", progress));

  // Catálogo + recompensas (uma vez).
  listProducts({ activeOnly: true }).then((p) => store.set("products", p)).catch(() => {});
  listRewards({ activeOnly: true }).then((r) => store.set("rewards", r)).catch(() => {});

  renderTopbar();
  navigate("home");
  userSvc.touchLogin(profile.uid);
}

/** Atualiza as informações do usuário no sidebar */
function updateSidemenuUser(profile) {
  if (!profile) return;
  
  const avatarEl = $("#sidemenuAvatar");
  const nameEl = $("#sidemenuUserName");
  const roleEl = $("#sidemenuUserRole");
  
  if (avatarEl) avatarEl.textContent = profile.codename?.charAt(0).toUpperCase() || "🕵️";
  if (nameEl) nameEl.textContent = profile.codename || profile.name || "—";
  if (roleEl) {
    const roleLabels = {
      admin: "Administrador",
      agent: "Agente",
      client: "Cliente"
    };
    roleEl.textContent = roleLabels[profile.role] || profile.role || "—";
  }
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
