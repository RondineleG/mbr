/* ═══════════════════════════════════════════════════════════════
   MAIN — bootstrap do app do cliente
   Liga router + páginas + sessão. Único entrypoint do index.html.
   ═══════════════════════════════════════════════════════════════ */
import { $ } from "../utils/dom.js";
import * as store from "./state.js";
import { initRouter, onRoute } from "./router.js";
import { startSessionObserver } from "./session.js";
import { ensureSeed } from "../seed.js";
import { renderCartBadges } from "../components/topbar.js";

import { initLogin } from "../pages/login.page.js";
import { initOnboarding } from "../pages/onboarding.page.js";
import { initHome, renderHome } from "../pages/home.page.js";
import { initCardapio, renderCardapio } from "../pages/cardapio.page.js";
import { initClube, renderClube } from "../pages/clube.page.js";
import { initBusca } from "../pages/busca.page.js";
import { initSacola, renderSacola } from "../pages/sacola.page.js";
import { initPedidos, renderPedidos } from "../pages/pedidos.page.js";
import { initPerfil, renderProfile } from "../pages/perfil.page.js";

const RENDERERS = {
  home: renderHome,
  cardapio: renderCardapio,
  clube: renderClube,
  sacola: renderSacola,
  pedidos: renderPedidos,
  perfil: renderProfile,
};

async function boot() {
  // Semeia o catálogo no modo demo (no-op se já existir / produção).
  await ensureSeed();

  // Router + páginas.
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

  // Re-render da página ao navegar.
  onRoute((page) => RENDERERS[page]?.());

  // Badge do carrinho sempre sincronizado.
  store.subscribe("cart", renderCartBadges);

  // Splash some sozinho (sincronizado com a animação CSS).
  setTimeout(() => $("#splash")?.classList.add("hidden"), 4200);

  // Observa login/logout e entra no app quando houver sessão.
  startSessionObserver();
}

boot();
