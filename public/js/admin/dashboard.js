/* ═══════════════════════════════════════════════════════════════
   ADMIN · DASHBOARD — KPIs do dia (realtime)
   ═══════════════════════════════════════════════════════════════ */
import { setHtml, onAction } from "../utils/dom.js";
import { getOrders, subscribeOrders } from "./admin-store.js";
import { listAgents } from "../services/user.service.js";
import { ORDER_STATUS_LABELS } from "../services/order.service.js";
import { money, toDate } from "../utils/format.js";
import { getDoc, setDoc, tsNow } from "../firebase/db.service.js";
import { APP_VERSION } from "../version.js";
import { toastSuccess, toastError } from "../components/toast.js";

// ── Controle de versão do app (config/app no Firestore) ──
async function loadVersionConfig() {
  try {
    const cfg = await getDoc("config/app");
    const v = document.getElementById("cfgVersion");
    const f = document.getElementById("cfgForce");
    const cur = document.getElementById("cfgCurrent");
    if (v) v.value = cfg?.version || APP_VERSION;
    if (f) f.checked = !!cfg?.forceUpdate;
    if (cur) cur.textContent = `Build deste painel: ${APP_VERSION} · No banco: ${cfg?.version || "—"}${cfg?.forceUpdate ? " · ⚡ forçando" : ""}`;
  } catch { /* leitura best-effort */ }
}

async function saveVersionConfig() {
  const version = (document.getElementById("cfgVersion")?.value || "").trim();
  const forceUpdate = !!document.getElementById("cfgForce")?.checked;
  if (!/^\d+\.\d+\.\d+$/.test(version)) return toastError("Versão inválida — use x.y.z (ex.: 1.1.1)");
  try {
    await setDoc("config/app", { version, forceUpdate, updatedAt: tsNow() });
    toastSuccess(`Versão ${version} salva${forceUpdate ? " (forçando atualização)" : ""}`);
    loadVersionConfig();
  } catch {
    toastError("Falha ao salvar (precisa ser admin)");
  }
}

let customerCount = 0;
let countLoaded = false;

const PENDING = ["recebido", "analisando", "aprovado", "producao", "enviado"];
const STATUS_ICON = {
  recebido: "📥", analisando: "🔍", aprovado: "✅",
  producao: "🍳", enviado: "🛵", entregue: "📦", cancelado: "❌",
};

const isToday = (value) => {
  const d = toDate(value); if (!d) return false;
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};

// Card de KPI clicável → navega para a seção do admin.
const kpi = (icon, val, label, section) =>
  `<div class="kpi clickable" data-action="admin-nav" data-section="${section}">
    <div class="kpi-icon">${icon}</div><div class="kpi-val">${val}</div><div class="kpi-label">${label} ›</div>
  </div>`;

export function renderDashboard() {
  // Carrega a contagem de agentes uma única vez, já autenticado (evita ler
  // 'users' antes do login, o que dispara "insufficient permissions").
  if (!countLoaded) {
    countLoaded = true;
    listAgents()
      .then((a) => { customerCount = a.filter((u) => u.role !== "admin").length; renderDashboard(); })
      .catch(() => { countLoaded = false; });
  }

  const orders = getOrders();
  const today = orders.filter((o) => isToday(o.criadoEm));
  const delivered = orders.filter((o) => o.status === "entregue");
  const revenue = delivered.reduce((a, o) => a + (o.total || 0), 0);
  const pending = orders.filter((o) => PENDING.includes(o.status)).length;
  const avg = delivered.length ? revenue / delivered.length : 0;

  setHtml("dashKpis", [
    kpi("📥", today.length, "Pedidos hoje", "pedidos"),
    kpi("⏳", pending, "Pendentes", "pedidos"),
    kpi("✅", delivered.length, "Entregues", "pedidos"),
    kpi("💰", money(revenue), "Faturamento", "pedidos"),
    kpi("🎯", money(avg), "Ticket médio", "pedidos"),
    kpi("📦", orders.length, "Total de pedidos", "pedidos"),
    kpi("🕵️", customerCount, "Agentes", "clientes"),
  ].join(""));

  // Distribuição por status (clica → vai para Pedidos).
  const counts = orders.reduce((m, o) => { m[o.status] = (m[o.status] || 0) + 1; return m; }, {});
  const chips = Object.keys(STATUS_ICON)
    .map((s) => `<div class="status-chip" data-action="admin-nav" data-section="pedidos">
      <span>${STATUS_ICON[s]}</span><span>${ORDER_STATUS_LABELS[s] || s}</span><b>${counts[s] || 0}</b></div>`)
    .join("");
  setHtml("dashStatus", `<div class="admin-subtitle">PEDIDOS POR STATUS</div><div class="status-chips">${chips}</div>`);
}

export function initDashboard() {
  subscribeOrders(() => { if (document.getElementById("section-dashboard")?.classList.contains("active")) renderDashboard(); });
  onAction("save-version", () => saveVersionConfig());
  loadVersionConfig();
}
