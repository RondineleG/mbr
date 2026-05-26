/* ═══════════════════════════════════════════════════════════════
   FEATURES ADMIN — liga/desliga funcionalidades por papel (agente/cliente)
   ═══════════════════════════════════════════════════════════════ */
import { $, $$, onAction, setHtml } from "../utils/dom.js";
import { FEATURES, ROLES, loadFeatures, saveFeatures, isEnabled } from "../services/features.service.js";
import { toastSuccess, toastError } from "../components/toast.js";

let model = {}; // { agent:{key:bool}, client:{key:bool} }

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

export function renderFeatures() {
  setHtml("featuresPanel", `<div class="feat-grid">${ROLES.map(roleCard).join("")}</div>`);
}

async function load() {
  setHtml("featuresPanel", '<div class="admin-loading">Carregando funcionalidades...</div>');
  try {
    model = await loadFeatures();
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
  $$(".feat-toggle").forEach((el) => {
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
  load();
}
