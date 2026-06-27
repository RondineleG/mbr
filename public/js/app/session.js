/* ═══════════════════════════════════════════════════════════════
   SESSION — orquestra overlays (splash/login/onboarding/app),
   o perfil corrente e os listeners realtime do agente.
   ═══════════════════════════════════════════════════════════════ */
import { $, $$, show, onAction } from "../utils/dom.js";
import * as store from "./state.js";
import { navigate } from "./router.js";
import { loadFeatures, watchFeatures, isEnabled } from "../services/features.service.js";
import { syncChatNotifiers, stopChatNotifiers } from "../components/chat-notifier.js";
import * as auth from "../firebase/auth.service.js";
import * as userSvc from "../services/user.service.js";
import { watchUserOrders, reconcileOrderPoints } from "../services/order.service.js";
import { notifyStatusChange } from "../services/notify.service.js";
import { listProducts } from "../services/product.service.js";
import { listRewards } from "../services/reward.service.js";
import { renderTopbar } from "../components/topbar.js";
import * as missionService from "../services/mission.service.js";
import { modalConfirm, modalCustom } from "../components/modal.js";
import { toastSuccess } from "../components/toast.js";

let unsubProfile = null;
let unsubOrders = null;
let unsubMissions = null;
// Último status conhecido por pedido (notifica só nas transições, não no login).
const _lastOrderStatus = {};
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
  // Esconde seções do menu lateral que ficaram sem nenhum item visível,
  // evitando títulos órfãos (ex.: "MINHAS OPERAÇÕES" sem itens embaixo).
  $$(".sidemenu-section").forEach((sec) => {
    const visivel = [...sec.querySelectorAll(".sidemenu-item")]
      .some((it) => it.style.display !== "none");
    sec.style.display = visivel ? "" : "none";
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
    pwaSuggest();
  }
});

/** Verifica se o app está rodando como PWA instalado */
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

window.addEventListener('appinstalled', (evt) => {
  console.log('MrBur PWA instalado com sucesso!');
  deferredPrompt = null;
  window.__deferredPrompt = null;
  const installBtn = $("#sidemenuInstallBtn");
  if (installBtn) installBtn.style.display = "none";
  toastSuccess("App instalado! 🔥 Abra pela chama na sua tela inicial.");
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
  // Usa o prompt capturado cedo no <head> (window.__deferredPrompt).
  let dp = window.__deferredPrompt || deferredPrompt;
  // Logo após limpar dados/instalar, o evento pode ainda não ter chegado:
  // espera até ~3s por ele antes de cair nas instruções.
  if (!dp) {
    dp = await new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const t = setTimeout(() => finish(window.__deferredPrompt || null), 3000);
      document.addEventListener("pwa-installable", () => { clearTimeout(t); finish(window.__deferredPrompt); }, { once: true });
    });
  }
  if (dp) {
    try {
      dp.prompt();
      const { outcome } = await dp.userChoice;
      console.log('PWA: instalação', outcome);
      window.__deferredPrompt = null;
      deferredPrompt = null;
      if (outcome === 'accepted') {
        const installBtn = $("#sidemenuInstallBtn");
        if (installBtn) installBtn.style.display = "none";
      }
      return;
    } catch (err) {
      console.warn("prompt() falhou (gesto perdido?):", err?.message || err);
      // cai nas instruções abaixo
    }
  }

  // Sem prompt (iOS, já instalado, ou navegador sem suporte a instalação): instruções.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  await modalConfirm({
    title: "📲 Instalar o MrBur",
    message: isIOS
      ? "No iPhone/iPad: toque em Compartilhar (⎙) e depois em 'Adicionar à Tela de Início'."
      : "Este navegador já tem o app instalado ou não suporta instalação direta. Se já instalou, abra pelo ícone; senão, tente pelo menu (⋮) → 'Instalar app'.",
    confirmText: "Entendi",
  });
}

let pwaSuggested = false;
let pwaBusy = false;

/** Detecta se o PWA já está instalado (Chrome/Android via related_applications). */
async function isPwaInstalled() {
  try {
    if (navigator.getInstalledRelatedApps) {
      const apps = await navigator.getInstalledRelatedApps();
      return Array.isArray(apps) && apps.length > 0;
    }
  } catch {}
  return false;
}

/**
 * Após o login (no navegador, não no app instalado): sugere INSTALAR se ainda
 * não tem, ou ABRIR pelo app se já existe instalação. Roda uma vez por sessão
 * e respeita uma dispensa de 7 dias.
 */
const snoozePwa = () => localStorage.setItem("pwaModalSnoozeAt", String(Date.now()));

/** Nosso modal próprio: instalar o app ou seguir no navegador.
    (Não existe "abrir o app" via JS — navegadores não permitem lançar um PWA
    instalado a partir de uma página, por segurança.) */
function openPwaModal() {
  const dlg = modalCustom(`
    <div class="modal-title">📲 Instalar o MrBur</div>
    <div class="modal-message">Tenha acesso rápido, uso offline e missões. Instale em segundos.</div>
    <div class="modal-actions" style="flex-direction:column;gap:10px;margin-top:8px">
      <button class="modal-btn primary" id="pwaInstall">Instalar o app</button>
      <button class="modal-btn ghost" id="pwaBrowser">Continuar no navegador</button>
    </div>`);
  dlg.el.querySelector("#pwaInstall").onclick = () => { dlg.close(); triggerPwaInstall(); };
  dlg.el.querySelector("#pwaBrowser").onclick = () => { snoozePwa(); dlg.close(); };
}

/**
 * Pós-login (só no navegador, não no app instalado): abre nosso modal com as
 * opções instalar / abrir / continuar. Uma vez por sessão; "continuar" adia 24h.
 */
async function pwaSuggest() {
  if (pwaSuggested || pwaBusy || isStandalone()) return;
  const snoozedAt = +(localStorage.getItem("pwaModalSnoozeAt") || 0);
  if (Date.now() - snoozedAt < 86400000) return; // adiado nas últimas 24h

  pwaBusy = true;
  await new Promise((r) => setTimeout(r, 1500)); // não competir com a entrada
  pwaBusy = false;
  if (!entered || isStandalone() || pwaSuggested) return;

  pwaSuggested = true;
  openPwaModal();
}

function stopWatchers() {
  unsubProfile?.(); unsubProfile = null;
  unsubOrders?.(); unsubOrders = null;
  unsubMissions?.(); unsubMissions = null;
  unsubFeatures?.(); unsubFeatures = null;
  stopChatNotifiers();
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
  unsubOrders = watchUserOrders(profile.uid, (orders) => {
    store.set("orders", orders);
    // Avisa o cliente de novas mensagens: com o entregador (cm, quando atribuído)
    // e com a plataforma/atendimento (cp, em qualquer pedido não cancelado).
    const threads = [];
    for (const o of (orders || [])) {
      if (o.status === "cancelado") continue;
      threads.push({ orderId: o.id, channel: "cp" });
      if (o.agenteResponsavel) threads.push({ orderId: o.id, channel: "cm" });
    }
    syncChatNotifiers(threads, profile.uid);
    // Notifica mudanças de status do pedido (client-side, sem servidor) e
    // credita méritos de pedidos entregues que ficaram sem crédito (ex.:
    // entregues pelo motoboy, que não pode escrever no doc do cliente).
    (orders || []).forEach((o) => {
      notifyStatusChange(o, _lastOrderStatus[o.id]);
      _lastOrderStatus[o.id] = o.status;
      reconcileOrderPoints(o, profile.uid);
    });
  });
  unsubMissions = missionService.watchMissionProgress(profile.uid, (progress) => {
    store.set("missionProgress", progress);
    // Após carregar missões, verifica se deve mostrar o prompt de instalação
    pwaSuggest();
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

  // Pós-login: o botão "Instalar app" fica sempre acessível no navegador
  // (oculto só quando já está rodando como app instalado). E sugere instalar/abrir.
  const installBtn = $("#sidemenuInstallBtn");
  if (installBtn) installBtn.style.display = isStandalone() ? "none" : "flex";
  pwaSuggest();
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
