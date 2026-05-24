/* ═══════════════════════════════════════════════════════════════
   MAIN — bootstrap do app do cliente
   Liga router + páginas + sessão. Único entrypoint do index.html.
   ═══════════════════════════════════════════════════════════════ */
import { $ } from "../utils/dom.js";
import { onAction } from "../utils/dom.js";
import * as store from "./state.js";
import { initRouter, onRoute } from "./router.js";
import { startSessionObserver, applyTheme } from "./session.js";
import { ensureSeed } from "../seed.js";
import { checkAppVersion } from "./version-check.js";
import { renderCartBadges } from "../components/topbar.js";
import { info, debug } from "../utils/logger.js";

import { initLogin } from "../pages/login.page.js";
import { initOnboarding } from "../pages/onboarding.page.js";
import { initHome, renderHome } from "../pages/home.page.js";
import { initCardapio, renderCardapio } from "../pages/cardapio.page.js";
import { initClube, renderClube } from "../pages/clube.page.js";
import { initBusca } from "../pages/busca.page.js";
import { initSacola, renderSacola } from "../pages/sacola.page.js";
import { initPedidos, renderPedidos } from "../pages/pedidos.page.js";
import { initPerfil, renderProfile } from "../pages/perfil.page.js";
import { initMissions, renderMissions } from "../pages/mission.page.js";
import { initConvites, renderConvites } from "../pages/convites.page.js";

const RENDERERS = {
  home: renderHome,
  cardapio: renderCardapio,
  clube: renderClube,
  sacola: renderSacola,
  pedidos: renderPedidos,
  perfil: renderProfile,
  missoes: renderMissions,
  convites: renderConvites,
};

// Toggle side menu
onAction("toggle-sidemenu", () => {
  const sidemenu = $("#sidemenu");
  const overlay = $("#sidemenuOverlay");
  sidemenu?.classList.toggle("open");
  overlay?.classList.toggle("open");
});

// Toggle side menu expand/collapse
onAction("toggle-sidemenu-expand", () => {
  const sidemenu = $("#sidemenu");
  sidemenu?.classList.toggle("collapsed");
  
  // Persistir estado
  const isCollapsed = sidemenu?.classList.contains("collapsed");
  localStorage.setItem("sidemenu-collapsed", isCollapsed);
});

// Navigate to admin
onAction("nav-admin", () => {
  window.location.href = "/admin.html";
});

async function boot() {
  info('MAIN', 'Starting MrBur MVP application');

  // Aplicar tema salvo
  applyTheme();

  // Semeia o catálogo no modo demo (no-op se já existir / produção).
  debug('MAIN', 'Ensuring seed data');
  await ensureSeed();

  // Router + páginas.
  info('MAIN', 'Initializing router and pages');
  initRouter();
  initLogin();
  initOnboarding();
  initHome();
  initCardapio();
  initClube();
  initBusca();
  initSacola();
  initPedidos();
  initPerfil();
  initMissions();
  initConvites();

  // Re-render da página ao navegar.
  onRoute((page) => {
    debug('MAIN', `Route changed to: ${page}`);
    RENDERERS[page]?.();
  });

  // Badge do carrinho sempre sincronizado.
  store.subscribe("cart", renderCartBadges);

  // Splash some sozinho (sincronizado com a animação CSS).
  setTimeout(() => {
    debug('MAIN', 'Hiding splash screen');
    $("#splash")?.classList.add("hidden");
  }, 4200);

  // Observa login/logout e entra no app quando houver sessão.
  info('MAIN', 'Starting session observer');
  startSessionObserver();

  // Valida a versão instalada contra a versão oficial no banco (config/app).
  checkAppVersion();

  info('MAIN', 'Application boot completed successfully');
}

boot();
