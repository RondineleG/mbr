/* ═══════════════════════════════════════════════════════════════
   SESSION — orquestra overlays (splash/login/onboarding/app),
   o perfil corrente e os listeners realtime do agente.
   ═══════════════════════════════════════════════════════════════ */
import { $, $$, show, onAction } from "../utils/dom.js";
import * as store from "./state.js";
import { navigate } from "./router.js";
import { loadFeatures, watchFeatures, isEnabled } from "../services/features.service.js";
import * as auth from "../firebase/auth.service.js";
import * as userSvc from "../services/user.service.js";
import { watchUserOrders } from "../services/order.service.js";
import { listProducts } from "../services/product.service.js";
import { listRewards } from "../services/reward.service.js";
import { renderTopbar } from "../components/topbar.js";
import * as missionService from "../services/mission.service.js";
import { modalPrompt } from "../components/modal.js";
import { toastSuccess } from "../components/toast.js";

let unsubProfile = null;
let unsubOrders = null;
let unsubMissions = null;
let unsubFeatures = null;
let entered = false;

/** Mapeia um elemento de navegação para a chave de funcionalidade. */
function featureKeyOf(el) {
  if (el.dataset.action === "clube-open") return el.dataset.tab === "missoes" ? "missoes" : "lojaMeritos";
  return el.dataset.page || null;
}

/** Mostra/esconde itens de navegação conforme as flags do papel do usuário. */
export function applyFeatureGates() {
  const profile = store.get("profile");
  const features = store.get("features") || {};
  const role = profile?.role || "agent";
  $$('[data-page], [data-action="clube-open"]').forEach((el) => {
    const key = featureKeyOf(el);
    if (!key) return;
    show(el, isEnabled(features, role, key));
  });
}
let deferredPrompt = null;

// Captura o evento de instalação do PWA
window.addEventListener('beforeinstallprompt', (e) => {
  // Impede que o mini-infobar apareça no mobile
  e.preventDefault();
  // Guarda o evento para disparar depois
  deferredPrompt = e;
  
  console.log('PWA: Evento beforeinstallprompt capturado');

  // Mostrar botão de instalação no sidebar
  const installBtn = $("#sidemenuInstallBtn");
  if (installBtn) {
    installBtn.style.display = "flex";
  }

  // Se o usuário já estiver logado e no app, mostra o modal
  if (entered) {
    checkPwaInstallPrompt();
  }
});

/** Verifica se o app está rodando como PWA instalado */
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

window.addEventListener('appinstalled', (evt) => {
  console.log('MrBur PWA instalado com sucesso!');
  deferredPrompt = null;
  // Esconder botão de instalação
  const installBtn = $("#sidemenuInstallBtn");
  if (installBtn) installBtn.style.display = "none";
  // Premiar o usuário
  rewardPwaInstall();
});

async function rewardPwaInstall() {
  const profile = store.get("profile");
  if (!profile) return;
  
  try {
    const stats = await missionService.calculateUserStats(profile.uid);
    await missionService.updateMissionProgress(profile.uid, {
      ...stats,
      pwaInstalled: true
    });
    toastSuccess("Missão 'Instalador de Elite' completada! 📱");
  } catch (err) {
    console.error("Erro ao premiar instalação PWA:", err);
  }
}

async function triggerPwaInstall() {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    console.log('PWA: Usuário aceitou a instalação');
  } else {
    console.log('PWA: Usuário recusou a instalação');
  }
  deferredPrompt = null;
  const installBtn = $("#sidemenuInstallBtn");
  if (installBtn) installBtn.style.display = "none";
}

async function checkPwaInstallPrompt() {
  // Se não temos o prompt ou já instalou, ignora
  if (!deferredPrompt) return;
  
  // Verifica se já ganhou a recompensa para não incomodar
  const progress = store.get("missionProgress");
  if (progress?.completed?.includes('pwa_install')) return;

  // Se o botão lateral já estiver visível, talvez não precise do modal agressivo
  // Mas vamos manter o modal como incentivo inicial

  // Pequeno delay para não aparecer de cara no login
  setTimeout(async () => {
    // Re-checar deferredPrompt pois pode ter sido usado/limpo no intervalo
    if (!deferredPrompt || !entered) return;

    const confirmed = await modalPrompt({
      title: "📱 App da Ordem",
      message: "Instale o app do MrBur para acesso rápido, notificações e ganhe **100 pontos de mérito**!",
      confirmText: "INSTALAR AGORA",
      cancelText: "MAIS TARDE"
    });

    if (confirmed) {
      triggerPwaInstall();
    }
  }, 2000);
}

function stopWatchers() {
  unsubProfile?.(); unsubProfile = null;
  unsubOrders?.(); unsubOrders = null;
  unsubMissions?.(); unsubMissions = null;
  unsubFeatures?.(); unsubFeatures = null;
}

/** Aplica o tema salvo ao <body>. */
export function applyTheme() {
  const theme = store.get("theme");
  document.body.setAttribute("data-theme", theme === "light" ? "light" : "dark");
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

  // Atualizar informações do usuário no sidebar (inclui visibilidade do link Admin)
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
  unsubMissions = missionService.watchMissionProgress(profile.uid, (progress) => {
    store.set("missionProgress", progress);
    // Após carregar missões, verifica se deve mostrar o prompt de instalação
    checkPwaInstallPrompt();
  });

  // Catálogo + recompensas (uma vez).
  listProducts({ activeOnly: true }).then((p) => store.set("products", p)).catch(() => {});
  listRewards({ activeOnly: true }).then((r) => store.set("rewards", r)).catch(() => {});

  // Feature flags: carrega e observa em tempo real; reaplica os gates ao mudar.
  loadFeatures().then((f) => { store.set("features", f); applyFeatureGates(); }).catch(() => {});
  unsubFeatures = watchFeatures((f) => { store.set("features", f); applyFeatureGates(); });

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

  // Link Admin: visível somente para role admin (esconde explicitamente os demais).
  const adminBtn = $("#sidemenuAdminBtn");
  if (adminBtn) {
    const isAdmin = profile.role === "admin";
    adminBtn.classList.toggle("visible", isAdmin);
    adminBtn.style.display = isAdmin ? "" : "none";
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
  
  // Registrar ação de instalação
  onAction("pwa-install", () => triggerPwaInstall());

  auth.onAuthChanged(async (user) => {
    store.set("authUser", user);
    if (!user) { showLogin(); return; }

    const profile = await userSvc.getProfile(user.uid);
    if (!profile) {
      // Conta sem perfil (ex.: cadastro interrompido). Volta ao login.
      if (!entered) showLogin();
      return;
    }

    // Login único centralizado: redireciona conforme o acesso.
    if (profile.role === "admin") { window.location.replace("/admin.html"); return; }
    if (profile.motoboy) { window.location.replace("/motoboy.html"); return; }

    enterApp(profile);
  });
}
