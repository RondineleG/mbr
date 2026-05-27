/* ═══════════════════════════════════════════════════════════════
   FEATURES ADMIN — liga/desliga funcionalidades por papel (agente/cliente)
   ═══════════════════════════════════════════════════════════════ */
import { $, $$, onAction, onChange, setHtml } from "../utils/dom.js";
import { FEATURES, ROLES, MENU_TABS, loadFeatures, saveFeatures, isEnabled, loadWebEnabled, setWebEnabled, loadMenuTabs, saveMenuTabs, isTabEnabled } from "../services/features.service.js";
import { toastSuccess, toastError } from "../components/toast.js";

let model = {}; // { agent:{key:bool} }
let webEnabled = true; // Versão Web/Desktop (admin-only)
let menuTabs = {};     // { monte:bool, dia:bool, ... } abas do cardápio

function roleCard(role) {
  const rows = FEATURES.map((f) => {
    const on = isEnabled(model, role.key, f.key);
    return `
      <label class="feat-row">
        <span class="feat-label">${f.icon} ${f.label}</span>
        <input type="checkbox" class="feat-toggle" data-role="${role.key}" data-key="${f.key}" ${on ? "checked" : ""}>
      </label>`;
  }).join("");
  return `
    <div class="feat-card">
      <div class="feat-card-title">${role.label}</div>
      ${rows}
    </div>`;
}

function webCard() {
  return `
    <div class="feat-card" style="margin-bottom:16px">
      <div class="feat-card-title">Páginas administrativas</div>
      <label class="feat-row">
        <span class="feat-label">🖥️ Versão Web / Desktop
          <a href="/web.html" target="_blank" rel="noopener" style="color:var(--G);font-size:11px;margin-left:6px;text-decoration:none">abrir ↗</a>
        </span>
        <input type="checkbox" class="feat-toggle" data-action="web-toggle" ${webEnabled ? "checked" : ""}>
      </label>
    </div>`;
}

function menuTabsCard() {
  const rows = MENU_TABS.map((t) => `
    <label class="feat-row">
      <span class="feat-label">${t.icon} ${t.label}</span>
      <input type="checkbox" class="feat-toggle" data-action="menutab-toggle" data-tab="${t.key}" ${isTabEnabled(menuTabs, t.key) ? "checked" : ""}>
    </label>`).join("");
  return `
    <div class="feat-card" style="margin-bottom:16px">
      <div class="feat-card-title">Abas do Cardápio</div>
      ${rows}
    </div>`;
}

export function renderFeatures() {
  setHtml("featuresPanel", webCard() + menuTabsCard() + `<div class="feat-grid">${ROLES.map(roleCard).join("")}</div>`);
}

async function load() {
  setHtml("featuresPanel", '<div class="admin-loading">Carregando funcionalidades...</div>');
  try {
    model = await loadFeatures();
    webEnabled = await loadWebEnabled();
    menuTabs = await loadMenuTabs();
    renderFeatures();
  } catch (err) {
    console.error("Erro ao carregar funcionalidades:", err);
    setHtml("featuresPanel", '<div class="admin-error">Erro ao carregar funcionalidades</div>');
  }
}

async function save() {
  // Lê o estado atual de todos os toggles na tela.
  const next = {};
  for (const role of ROLES) next[role.key] = {};
  // Só os toggles de papel (o toggle da Versão Web não tem data-role e salva à parte).
  $$(".feat-toggle[data-role]").forEach((el) => {
    if (!next[el.dataset.role]) next[el.dataset.role] = {};
    next[el.dataset.role][el.dataset.key] = el.checked;
  });
  try {
    await saveFeatures(next);
    model = next;
    toastSuccess("Funcionalidades atualizadas");
  } catch (err) {
    console.error("Erro ao salvar funcionalidades:", err);
    toastError("Erro ao salvar funcionalidades");
  }
}

export function initFeatures() {
  onAction("features-save", () => save());
  // Liga/desliga a Versão Web/Desktop na hora (independe do botão Salvar).
  onChange("web-toggle", async (el) => {
    try { await setWebEnabled(el.checked); webEnabled = el.checked; toastSuccess(`Versão Web ${el.checked ? "ativada" : "desativada"}`); }
    catch { toastError("Erro ao atualizar a Versão Web"); }
  });
  // Liga/desliga cada aba do cardápio na hora (salva o objeto completo).
  onChange("menutab-toggle", async (el) => {
    const next = { ...menuTabs, [el.dataset.tab]: el.checked };
    // Preenche as ausentes como habilitadas, p/ o doc ficar completo.
    for (const t of MENU_TABS) if (next[t.key] === undefined) next[t.key] = true;
    try { await saveMenuTabs(next); menuTabs = next; toastSuccess(`Aba ${el.checked ? "ativada" : "desativada"}`); }
    catch { toastError("Erro ao atualizar a aba"); }
  });
  load();
}
