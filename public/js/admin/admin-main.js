/* ═══════════════════════════════════════════════════════════════
   ADMIN MAIN — gate por role:admin, navegação e bootstrap
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, show, setHtml, escapeHtml } from "../utils/dom.js";
import * as auth from "../firebase/auth.service.js";
import { getProfile } from "../services/user.service.js";
import { getCollection } from "../firebase/db.service.js";
import { ensureSeed, seedEverything, seedCatalog, seedInvite, seedRandomInvites, DEMO_INVITE } from "../seed.js";
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
let isDark = true;

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

function toggleAdminTheme() {
  isDark = !isDark;
  document.body.setAttribute("data-theme", isDark ? "" : "light");
  const icon = document.getElementById("adminThemeIcon");
  const label = document.getElementById("adminThemeLabel");
  if (icon) icon.textContent = isDark ? "🌙" : "☀️";
  if (label) label.textContent = isDark ? "Modo Escuro" : "Modo Claro";
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
  show($("#promoteHint"), false);
  const email = $("#adminEmail").value.trim();
  const pass = $("#adminPass").value;
  if (!email || !pass) return gateError("Preencha e-mail e senha");
  $("#adminLoginBtn").disabled = true;
  try {
    const user = await auth.signIn(email, pass);
    const profile = await getProfile(user.uid);
    if (profile?.role === "admin") enterAdmin(profile);
    else {
      // Login OK, mas o acesso ainda não é admin. NÃO desloga — oferece promover.
      gateError("Este acesso ainda não é Comando — use o botão abaixo.");
      show($("#promoteHint"), true);
    }
  } catch (err) {
    gateError(auth.authErrorMessage(err));
  } finally { $("#adminLoginBtn").disabled = false; }
}

/** Promove o usuário JÁ logado a admin e roda o seed completo. */
async function promoteSelf(btn) {
  const u = auth.currentUser();
  if (!u) return gateError("Faça login primeiro, depois clique aqui.");
  if (btn) btn.disabled = true;
  try {
    await seedEverything(u.uid, u.email);
    const profile = await getProfile(u.uid);
    toastSuccess("Acesso promovido a Comando + seed completo");
    enterAdmin(profile);
  } catch (err) {
    const code = err?.code || err?.message || "";
    if (/permission|insufficient|PERMISSION/i.test(code))
      gateError("Bloqueado pelas regras. Coloque o Firestore em MODO DE TESTE e tente de novo.");
    else gateError(auth.authErrorMessage(err));
  } finally { if (btn) btn.disabled = false; }
}

/**
 * Bootstrap do 1º Comando: cria o usuário admin, popula catálogo e
 * convite demo. Só funciona enquanto as regras permitirem (modo demo
 * ou Firestore em modo de teste) — depois disso, exige admin existente.
 */
async function bootstrapAdmin(btn) {
  const email = ($("#adminEmail").value.trim()) || "admin@mrbur.com";
  const pass = ($("#adminPass").value) || "ordem2025";
  if (pass.length < 6) return gateError("Senha precisa de ao menos 6 caracteres");
  gateError("");
  if (btn) btn.disabled = true;
  try {
    let user;
    try { user = await auth.signUp(email, pass); }
    catch { user = await auth.signIn(email, pass); }
    await seedEverything(user.uid, email);   // admin + catálogo + recompensas + convites + agentes
    const profile = await getProfile(user.uid);
    toastSuccess("Comando criado + seed completo");
    enterAdmin(profile);
  } catch (err) {
    const code = err?.code || err?.message || "";
    if (code.includes("permission") || code.includes("insufficient") || code.includes("PERMISSION"))
      gateError("Bloqueado pelas regras. Coloque o Firestore em MODO DE TESTE no console e tente de novo.");
    else gateError(auth.authErrorMessage(err));
  } finally { if (btn) btn.disabled = false; }
}

/** Exibe o bloco de bootstrap apenas quando ainda não há nenhum admin. */
async function checkBootstrapAvailable() {
  try {
    const admins = await getCollection("users", { where: [["role", "==", "admin"]] });
    show($("#bootstrapHint"), admins.length === 0);
  } catch {
    // Regras podem bloquear a leitura sem auth — mostra para permitir bootstrap em modo de teste.
    show($("#bootstrapHint"), true);
  }
}

/** Mostra os códigos de convite gerados, prontos para copiar. */
function showInvites(codes) {
  setHtml("seedOutput", `
    <div class="data-row" style="flex-direction:column;align-items:stretch;gap:8px">
      <div class="data-name">🎫 Convites disponíveis</div>
      ${codes.map((c) => `<div style="font-family:var(--f-mono);font-size:14px;color:var(--gold);letter-spacing:1px">${escapeHtml(c)}</div>`).join("")}
      <div class="data-meta">Compartilhe com os agentes — cada código permite 1 cadastro.</div>
    </div>`);
}

async function boot() {
  console.info("%c[MrBur Comando] admin v2 carregado ✅", "color:#C9A84C;font-weight:bold");
  await ensureSeed();
  initDashboard(); initProducts(); initOrders(); initCustomers(); initMissions(); initRewards(); initInvites();

  onAction("admin-nav", (el) => navigate(el.dataset.section));
  onAction("admin-toggle-sidebar", () => toggleAdminSidebar());
  onAction("seed-catalog", async (el) => {
    el.disabled = true;
    try { await seedCatalog(); toastSuccess("Catálogo populado (produtos + recompensas)"); renderDashboard(); }
    catch { toastError("Falha ao popular — verifique permissões/regras"); }
    finally { el.disabled = false; }
  });
  onAction("seed-invite", async () => {
    try { await seedInvite(DEMO_INVITE); showInvites([DEMO_INVITE]); toastSuccess("Convite demo pronto"); }
    catch { toastError("Falha ao criar convite"); }
  });
  onAction("seed-invites", async () => {
    try { const codes = await seedRandomInvites(5); showInvites(codes); toastSuccess("5 convites gerados"); }
    catch { toastError("Falha ao gerar convites"); }
  });
  onAction("admin-login", () => doAdminLogin());
  onAction("admin-logout", async () => { await auth.signOut(); location.reload(); });
  onAction("bootstrap-admin", (el) => bootstrapAdmin(el));
  onAction("promote-self", (el) => promoteSelf(el));
  onAction("admin-theme-toggle", () => toggleAdminTheme());
  ["adminEmail", "adminPass"].forEach((id) =>
    $("#" + id)?.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdminLogin(); }));

  // Bootstrap visível por padrão (não depende de consulta que o adblock possa travar).
  show($("#bootstrapHint"), true);

  auth.onAuthChanged(async (user) => {
    if (!user) {
      $("#adminGate").classList.remove("hidden");
      $("#adminShell").style.display = "none";
      checkBootstrapAvailable();
      return;
    }
    const profile = await getProfile(user.uid);
    if (profile?.role === "admin") enterAdmin(profile);
    else { $("#adminGate").classList.remove("hidden"); $("#adminShell").style.display = "none"; checkBootstrapAvailable(); }
  });
}

boot();
