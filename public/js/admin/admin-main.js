/* ═══════════════════════════════════════════════════════════════
   ADMIN MAIN — gate por role:admin, navegação e bootstrap
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, show } from "../utils/dom.js";
import * as auth from "../firebase/auth.service.js";
import { getProfile } from "../services/user.service.js";
import { ensureSeed } from "../seed.js";
import { toastError, toastSuccess } from "../components/toast.js";
import { initDashboard, renderDashboard } from "./dashboard.js";
import { initProducts, renderProducts } from "./products.admin.js";
import { initOrders, renderOrders, startOrdersWatch } from "./orders.admin.js";
import { initCustomers, renderCustomers } from "./customers.admin.js";
import { initMissions, renderMissions } from "./missions.admin.js";
import { initRewards, renderRewards } from "./rewards.admin.js";
import { initInvites, renderInvites } from "./invites.admin.js";

const SECTIONS = { 
  dashboard: renderDashboard, 
  produtos: renderProducts, 
  pedidos: renderOrders, 
  clientes: renderCustomers,
  missoes: renderMissions,
  recompensas: renderRewards,
  convites: renderInvites
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
  
  // Fechar sidebar no mobile após navegação
  if (window.innerWidth <= 720) {
    toggleAdminSidebar();
  }
}

function updateThemeUI() {
  const icon = document.getElementById("adminThemeIcon");
  const label = document.getElementById("adminThemeLabel");
  if (icon) icon.textContent = isDark ? "🌙" : "☀️";
  if (label) label.textContent = isDark ? "Modo Escuro" : "Modo Claro";
}

function toggleAdminTheme() {
  isDark = !isDark;
  document.body.setAttribute("data-theme", isDark ? "dark" : "light");
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

function enterAdmin(profile) {
  $("#adminGate").classList.add("hidden");
  $("#adminShell").style.display = "flex";
  $("#adminWho").textContent = profile.codename || profile.email;
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
  document.body.setAttribute("data-theme", isDark ? "dark" : "light");
  updateThemeUI();
  await ensureSeed();
  initDashboard(); initProducts(); initOrders(); initCustomers(); initMissions(); initRewards(); initInvites();

  onAction("admin-nav", (el) => navigate(el.dataset.section));
  onAction("admin-toggle-sidebar", () => toggleAdminSidebar());
  
  onAction("admin-login", () => doAdminLogin());
  onAction("admin-logout", async () => { await auth.signOut(); location.reload(); });
  onAction("admin-theme-toggle", () => toggleAdminTheme());
  ["adminEmail", "adminPass"].forEach((id) =>
    $("#" + id)?.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdminLogin(); }));

  auth.onAuthChanged(async (user) => {
    if (!user) {
      $("#adminGate").classList.remove("hidden");
      $("#adminShell").style.display = "none";
      return;
    }
    const profile = await getProfile(user.uid);
    if (profile?.role === "admin") enterAdmin(profile);
    else { 
      $("#adminGate").classList.remove("hidden"); 
      $("#adminShell").style.display = "none";
      gateError("Acesso restrito ao Comando.");
    }
  });
}

boot();
