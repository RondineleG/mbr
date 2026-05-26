/* ═══════════════════════════════════════════════════════════════
   MISSIONS ADMIN — gerenciamento de missões
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, escapeHtml } from "../utils/dom.js";
import { getCollection, addDoc, updateDoc, deleteDoc } from "../firebase/db.service.js";
import { modalCustom, modalConfirm } from "../components/modal.js";
import { toastError, toastSuccess } from "../components/toast.js";

const TYPES = [
  ["single", "Única"],
  ["cumulative", "Cumulativa"],
  ["streak", "Sequência"],
];

let currentFilter = "all";
let cache = [];

async function renderMissions() {
  const container = $("#missionsList");
  if (!container) return;

  container.innerHTML = '<div class="admin-loading">Carregando missões...</div>';

  try {
    const missions = await getCollection("missions", {
      orderBy: ["order", "asc"]
    });
    cache = missions;

    const filtered = currentFilter === "all"
      ? missions
      : missions.filter(m => m.type === currentFilter);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="admin-empty">Nenhuma missão encontrada</div>';
      return;
    }

    container.innerHTML = filtered.map(m => `
      <div class="admin-item">
        <div class="admin-item-main">
          <div class="admin-item-icon">${m.icon || "🎯"}</div>
          <div class="admin-item-content">
            <div class="admin-item-title">${escapeHtml(m.name)}</div>
            <div class="admin-item-sub">${escapeHtml(m.description)}</div>
            <div class="admin-item-meta">
              <span class="admin-tag">${m.type}</span>
              <span class="admin-tag">+${m.reward}⚡</span>
              ${m.target ? `<span class="admin-tag">Meta: ${m.target}</span>` : ''}
              <span class="admin-tag ${m.active ? 'active' : 'inactive'}">${m.active ? 'Ativa' : 'Inativa'}</span>
            </div>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="admin-btn sm ghost" data-action="mission-toggle" data-id="${m.id}" data-active="${m.active}">
            ${m.active ? '⏸️ Pausar' : '▶️ Ativar'}
          </button>
          <button class="admin-btn sm ghost" data-action="mission-edit" data-id="${m.id}">✏️ Editar</button>
          <button class="admin-btn sm danger" data-action="mission-delete" data-id="${m.id}">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error("Erro ao carregar missões:", error);
    container.innerHTML = '<div class="admin-error">Erro ao carregar missões</div>';
  }
}

async function toggleMission(id, active) {
  try {
    await updateDoc(`missions/${id}`, { active: !active, updatedAt: Date.now() });
    toastSuccess(`Missão ${active ? 'pausada' : 'ativada'} com sucesso`);
    renderMissions();
  } catch (error) {
    console.error("Erro ao alternar missão:", error);
    toastError("Erro ao alternar missão");
  }
}

async function deleteMission(id) {
  const m = cache.find((x) => x.id === id);
  const ok = await modalConfirm({
    title: "Excluir missão",
    message: `Excluir "${m?.name || id}"? Esta ação não pode ser desfeita.`,
    confirmText: "Excluir",
    danger: true,
  });
  if (!ok) return;

  try {
    await deleteDoc(`missions/${id}`);
    toastSuccess("Missão excluída com sucesso");
    renderMissions();
  } catch (error) {
    console.error("Erro ao excluir missão:", error);
    toastError("Erro ao excluir missão");
  }
}

/** Formulário único de criar/editar missão (substitui os prompt() nativos). */
function form(m = {}) {
  const dialog = modalCustom(`
    <div class="modal-title">${m.id ? "Editar missão" : "Nova missão"}</div>
    <div class="modal-label">NOME</div><input class="modal-input" id="f-name" value="${escapeHtml(m.name || "")}">
    <div class="modal-label">DESCRIÇÃO</div><input class="modal-input" id="f-desc" value="${escapeHtml(m.description || "")}">
    <div class="modal-label">ÍCONE (emoji)</div><input class="modal-input" id="f-icon" value="${escapeHtml(m.icon || "🎯")}">
    <div class="modal-label">RECOMPENSA (pontos)</div><input class="modal-input" id="f-reward" type="number" value="${m.reward ?? 50}">
    <div class="modal-label">TIPO</div>
    <select class="modal-select" id="f-type">${TYPES.map(([v, l]) => `<option value="${v}" ${m.type === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <div class="modal-label">META (opcional)</div><input class="modal-input" id="f-target" type="number" value="${m.target ?? ""}">
    <div class="modal-label">CONDIÇÃO (opcional)</div><input class="modal-input" id="f-cond" value="${escapeHtml(m.condition || "")}" placeholder="ex.: orders_count >= 3">
    <div class="modal-actions">
      <button class="modal-btn ghost" id="f-cancel">Cancelar</button>
      <button class="modal-btn primary" id="f-save">Salvar</button>
    </div>`);
  dialog.el.querySelector("#f-cancel").onclick = dialog.close;
  dialog.el.querySelector("#f-save").onclick = async () => {
    const targetRaw = dialog.el.querySelector("#f-target").value.trim();
    const data = {
      name: dialog.el.querySelector("#f-name").value.trim(),
      description: dialog.el.querySelector("#f-desc").value.trim(),
      icon: dialog.el.querySelector("#f-icon").value.trim() || "🎯",
      reward: parseInt(dialog.el.querySelector("#f-reward").value) || 50,
      type: dialog.el.querySelector("#f-type").value,
      target: targetRaw ? parseInt(targetRaw) : null,
      condition: dialog.el.querySelector("#f-cond").value.trim(),
      updatedAt: Date.now(),
    };
    if (!data.name) return toastError("Informe o nome da missão");
    try {
      if (m.id) {
        await updateDoc(`missions/${m.id}`, data);
      } else {
        await addDoc("missions", { ...data, active: true, order: Date.now(), createdAt: Date.now() });
      }
      dialog.close();
      toastSuccess(m.id ? "Missão atualizada" : "Missão criada");
      renderMissions();
    } catch (error) {
      console.error("Erro ao salvar missão:", error);
      toastError("Erro ao salvar missão");
    }
  };
}

export function initMissions() {
  onAction("mission-new", () => form());
  onAction("mission-toggle", (el) => toggleMission(el.dataset.id, el.dataset.active === "true"));
  onAction("mission-delete", (el) => deleteMission(el.dataset.id));
  onAction("mission-edit", (el) => form(cache.find((m) => m.id === el.dataset.id) || {}));
}

export { renderMissions };
</content>
