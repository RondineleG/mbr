/* ═══════════════════════════════════════════════════════════════
   ADMIN MAIN — gate por role:admin, navegação e bootstrap
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, show } from "../utils/dom.js";
import * as auth from "../firebase/auth.service.js";
import { getProfile } from "../services/user.service.js";
import { ensureSeed } from "../seed.js";
import { toastError, toastSuccess } from "../components/toast.js";
import { initDashboard, renderDashboard } from "./dashboard.js";
import { initReports, renderReports } from "./reports.admin.js";
import { initProducts, renderProducts } from "./products.admin.js";
import { initMontar, renderMontar } from "./montar.admin.js";
import { initSpecials, renderLancheDia, renderMboxAdmin } from "./specials.admin.js";
import { initOrders, renderOrders, startOrdersWatch, setAdminProfile } from "./orders.admin.js";
import { initCustomers, renderCustomers } from "./customers.admin.js";
import { initMissions, renderMissions } from "./missions.admin.js";
import { initRewards, renderRewards } from "./rewards.admin.js";
import { initInvites, renderInvites } from "./invites.admin.js";
import { initFeatures, renderFeatures } from "./features.admin.js";

const SECTIONS = {
  dashboard: renderDashboard,
  relatorios: renderReports,
  produtos: renderProducts,
  montar: renderMontar,
  lanchedia: renderLancheDia,
  mbox: renderMboxAdmin,
  pedidos: renderOrders,
  clientes: renderCustomers,
  missoes: renderMissions,
  recompensas: renderRewards,
  convites: renderInvites,
  acessos: renderFeatures
};
let current = "dashboard";
let isDark = localStorage.getItem("admin-theme") === "light" ? false : true;

function gateError(msg) {
  const el = $("#adminGateError");
  if (el) { el.textContent = "⚠ " + msg; el.classList.toggle("show", !!msg); }
}

function navigate(section) {
  current = section;
  document.querySelectorAll(".admin-section").forEach((s) => s.classList.remove("active"));
  document.getElementById("section-" + section)?.classList.add("active");
  document.querySelectorAll(".admin-navbtn").forEach((b) => b.classList.toggle("active", b.dataset.section === section));
  SECTIONS[section]?.();
  
  if (window.innerWidth <= 720) closeAdminSidebar();
}

function updateThemeUI() {
  const icon = document.getElementById("adminThemeIcon");
  const label = document.getElementById("adminThemeLabel");
  if (icon) icon.textContent = isDark ? "🌙" : "☀️";
  if (label) label.textContent = isDark ? "Modo Escuro" : "Modo Claro";
}

function toggleAdminTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  localStorage.setItem("admin-theme", isDark ? "dark" : "light");
  updateThemeUI();
}

function toggleAdminSidebar() {
  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("adminSidebarOverlay");
  
  if (sidebar) {
    sidebar.classList.toggle("open");
  }
  if (overlay) {
    overlay.classList.toggle("open");
  }
}

function closeAdminSidebar() {
  document.getElementById("adminSidebar")?.classList.remove("open");
  document.getElementById("adminSidebarOverlay")?.classList.remove("open");
}

/* ── Sidebar recolhível (desktop): só ícones, expande ao clicar ── */
let sidebarCollapsed = localStorage.getItem("admin-sidebar-collapsed") === "1";

function applySidebarCollapsed() {
  const sidebar = document.getElementById("adminSidebar");
  const btn = document.querySelector("[data-action='admin-collapse-toggle']");
  if (sidebar) sidebar.classList.toggle("collapsed", sidebarCollapsed);
  if (btn) {
    btn.title = sidebarCollapsed ? "Expandir menu" : "Recolher menu";
    btn.setAttribute("aria-label", btn.title);
  }
}

function toggleSidebarCollapsed() {
  sidebarCollapsed = !sidebarCollapsed;
  localStorage.setItem("admin-sidebar-collapsed", sidebarCollapsed ? "1" : "0");
  applySidebarCollapsed();
}

function enterAdmin(profile) {
  const loading = $("#adminLoading"); if (loading) loading.style.display = "none";
  $("#adminGate").classList.add("hidden");
  $("#adminShell").style.display = "flex";
  $("#adminWho").textContent = profile.codename || profile.email;
  setAdminProfile(profile); // a plataforma (admin) participa dos chats cp/mp
  startOrdersWatch();   // realtime para dashboard + pedidos
  navigate("dashboard");
}

async function doAdminLogin() {
  gateError("");
  const email = $("#adminEmail").value.trim();
  const pass = $("#adminPass").value;
  if (!email || !pass) return gateError("Preencha e-mail e senha");
  $("#adminLoginBtn").disabled = true;
  try {
    const user = await auth.signIn(email, pass);
    const profile = await getProfile(user.uid);
    if (profile?.role === "admin") enterAdmin(profile);
    else {
      gateError("Este acesso não possui permissões de Comando.");
      await auth.signOut();
    }
  } catch (err) {
    gateError(auth.authErrorMessage(err));
  } finally { $("#adminLoginBtn").disabled = false; }
}

async function boot() {
  console.info("%c[MrBur Comando] admin v2 carregado ✅", "color:#C9A84C;font-weight:bold");
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  updateThemeUI();
  await ensureSeed();
  initDashboard(); initReports(); initProducts(); initMontar(); initSpecials(); initOrders(); initCustomers(); initMissions(); initRewards(); initInvites(); initFeatures();

  onAction("admin-nav", (el) => navigate(el.dataset.section));
  onAction("admin-toggle-sidebar", () => toggleAdminSidebar());
  onAction("admin-collapse-toggle", () => toggleSidebarCollapsed());
  applySidebarCollapsed();
  
  onAction("admin-login", () => doAdminLogin());
  onAction("admin-logout", async () => {
    await auth.signOut();
    window.location.replace("/"); // login único: volta para a tela padrão
  });
  onAction("admin-theme-toggle", () => toggleAdminTheme());
  ["adminEmail", "adminPass"].forEach((id) =>
    $("#" + id)?.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdminLogin(); }));

  auth.onAuthChanged(async (user) => {
    // Login único: sem sessão → volta para a tela de login padrão do app.
    if (!user) { window.location.replace("/"); return; }
    const profile = await getProfile(user.uid);
    if (profile?.role === "admin") enterAdmin(profile);
    else window.location.replace("/"); // logado mas sem permissão de Comando
  });
}

boot();
