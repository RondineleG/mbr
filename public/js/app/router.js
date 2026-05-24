/* ═══════════════════════════════════════════════════════════════
   ROUTER — navegação entre páginas (toggle de display)
   Páginas são <div class="page" id="page-{nome}">. Mantém o padrão
   do protótipo (mais performático que recriar DOM).
   ═══════════════════════════════════════════════════════════════ */
import { $$, onAction } from "../utils/dom.js";
import { set, get } from "./state.js";
import { showLogin } from "./session.js";

const routeListeners = new Set();

// Configuração de proteção de rotas
const ROUTE_CONFIG = {
  // Rotas públicas (não requerem autenticação)
  public: ["home"],
  
  // Rotas que requerem autenticação
  auth: ["cardapio", "clube", "sacola", "pedidos", "perfil", "missoes", "busca", "convites"],
  
  // Rotas exclusivas para admin
  admin: [],
  
  // Rotas exclusivas para agentes
  agent: [],
};

/** Assina troca de página (callback recebe o nome da página). */
export const onRoute = (fn) => { routeListeners.add(fn); return () => routeListeners.delete(fn); };

/** Verifica se o usuário tem permissão para acessar a rota */
function checkRouteAccess(page) {
  const profile = get("profile");
  const authUser = get("authUser");
  
  // Rotas públicas sempre acessíveis
  if (ROUTE_CONFIG.public.includes(page)) return true;
  
  // Rotas que requerem autenticação
  if (ROUTE_CONFIG.auth.includes(page)) {
    if (!authUser || !profile) {
      console.warn(`[Router] Acesso negado à rota "${page}": usuário não autenticado`);
      return false;
    }
  }
  
  // Rotas exclusivas para admin
  if (ROUTE_CONFIG.admin.includes(page)) {
    if (!profile || profile.role !== "admin") {
      console.warn(`[Router] Acesso negado à rota "${page}": requer role admin`);
      return false;
    }
  }
  
  // Rotas exclusivas para agentes
  if (ROUTE_CONFIG.agent.includes(page)) {
    if (!profile || (profile.role !== "admin" && profile.role !== "agent")) {
      console.warn(`[Router] Acesso negado à rota "${page}": requer role agent ou admin`);
      return false;
    }
  }
  
  return true;
}

export function navigate(page) {
  // Verificar permissão antes de navegar
  if (!checkRouteAccess(page)) {
    showLogin();
    return;
  }
  
  set("page", page);
  $$(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + page)?.classList.add("active");

  $$(".nav-item").forEach((n) => n.classList.remove("active"));
  document.getElementById("nav-" + page)?.classList.add("active");

  // Fechar sidemenu ao navegar
  const sidemenu = document.getElementById("sidemenu");
  const sidemenuOverlay = document.getElementById("sidemenuOverlay");
  if (sidemenu) sidemenu.classList.remove("open");
  if (sidemenuOverlay) sidemenuOverlay.classList.remove("open");

  window.scrollTo(0, 0);
  routeListeners.forEach((fn) => fn(page));
}

/** Liga os elementos com data-action="nav" e data-page="...". */
export function initRouter() {
  onAction("nav", (el) => navigate(el.dataset.page));
}
