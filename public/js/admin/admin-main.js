/* ═══════════════════════════════════════════════════════════════
   ADMIN MAIN — gate por role:admin, navegação e bootstrap
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, show } from "../utils/dom.js";
import { IS_DEMO } from "../../firebase-config.js";
import * as auth from "../firebase/auth.service.js";
import { getProfile } from "../services/user.service.js";
import { setDoc, tsNow } from "../firebase/db.service.js";
import { ensureSeed } from "../seed.js";
import { toastError, toastSuccess } from "../components/toast.js";
import { initDashboard, renderDashboard } from "./dashboard.js";
import { initProducts, renderProducts } from "./products.admin.js";
import { initOrders, renderOrders, startOrdersWatch } from "./orders.admin.js";
import { initCustomers, renderCustomers } from "./customers.admin.js";

const SECTIONS = { dashboard: renderDashboard, produtos: renderProducts, pedidos: renderOrders, clientes: renderCustomers };
let current = "dashboard";

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
    else { await auth.signOut(); gateError("Acesso restrito a administradores"); }
  } catch (err) {
    gateError(auth.authErrorMessage(err));
  } finally { $("#adminLoginBtn").disabled = false; }
}

/** Atalho de demo: cria um admin local para explorar o painel. */
async function createDemoAdmin() {
  try {
    let user;
    try { user = await auth.signUp("admin@mrbur.com", "ordem2025"); }
    catch { user = await auth.signIn("admin@mrbur.com", "ordem2025"); }
    await setDoc(`users/${user.uid}`, {
      uid: user.uid, name: "Comando da Ordem", codename: "comando-supremo",
      email: "admin@mrbur.com", phone: "", address: {}, points: 0, level: 1,
      rank: "MESTRE", role: "admin", invitesAvailable: 99, createdAt: tsNow(), lastLogin: tsNow(),
    });
    toastSuccess("Admin demo pronto: admin@mrbur.com / ordem2025");
    const profile = await getProfile(user.uid);
    enterAdmin(profile);
  } catch { toastError("Não foi possível criar o admin demo"); }
}

async function boot() {
  await ensureSeed();
  initDashboard(); initProducts(); initOrders(); initCustomers();

  onAction("admin-nav", (el) => navigate(el.dataset.section));
  onAction("admin-login", () => doAdminLogin());
  onAction("admin-logout", async () => { await auth.signOut(); location.reload(); });
  onAction("create-demo-admin", () => createDemoAdmin());
  ["adminEmail", "adminPass"].forEach((id) =>
    $("#" + id)?.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdminLogin(); }));

  // Mostra atalho de demo só no modo demo.
  show($("#demoAdminHint"), IS_DEMO);

  auth.onAuthChanged(async (user) => {
    if (!user) { $("#adminGate").classList.remove("hidden"); $("#adminShell").style.display = "none"; return; }
    const profile = await getProfile(user.uid);
    if (profile?.role === "admin") enterAdmin(profile);
    else { $("#adminGate").classList.remove("hidden"); $("#adminShell").style.display = "none"; }
  });
}

boot();
