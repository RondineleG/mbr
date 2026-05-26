/* ═══════════════════════════════════════════════════════════════
   REWARDS ADMIN — gerenciamento de recompensas
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, escapeHtml } from "../utils/dom.js";
import { getCollection, addDoc, updateDoc, deleteDoc } from "../firebase/db.service.js";
import { modalCustom, modalConfirm } from "../components/modal.js";
import { toastError, toastSuccess } from "../components/toast.js";

const CATEGORIES = [
  ["benefits", "Benefícios"],
  ["physical", "Físico"],
  ["experiences", "Experiências"],
  ["status", "Status"],
];
const TYPES = [
  ["physical", "Físico"],
  ["discount", "Desconto"],
  ["benefit", "Benefício"],
];

let currentFilter = "all";
let cache = [];

async function renderRewards() {
  const container = $("#rewardsList");
  if (!container) return;

  container.innerHTML = '<div class="admin-loading">Carregando recompensas...</div>';

  try {
    const rewards = await getCollection("rewards", {
      orderBy: ["pointsRequired", "asc"]
    });
    cache = rewards;

    const filtered = currentFilter === "all"
      ? rewards
      : rewards.filter(r => r.category === currentFilter);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="admin-empty">Nenhuma recompensa encontrada</div>';
      return;
    }

    container.innerHTML = filtered.map(r => `
      <div class="admin-item">
        <div class="admin-item-main">
          <div class="admin-item-icon">${r.icon || "🎁"}</div>
          <div class="admin-item-content">
            <div class="admin-item-title">${escapeHtml(r.name)}</div>
            <div class="admin-item-sub">${escapeHtml(r.description)}</div>
            <div class="admin-item-meta">
              <span class="admin-tag">${r.category}</span>
              <span class="admin-tag">${r.type}</span>
              <span class="admin-tag">Ⓜ${r.pointsRequired}</span>
              ${r.stock !== null && r.stock !== undefined ? `<span class="admin-tag">📦 ${r.stock}</span>` : '<span class="admin-tag">∞</span>'}
              <span class="admin-tag ${r.active ? 'active' : 'inactive'}">${r.active ? 'Ativa' : 'Inativa'}</span>
            </div>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="admin-btn sm ghost" data-action="reward-toggle" data-id="${r.id}" data-active="${r.active}">
            ${r.active ? '⏸️ Pausar' : '▶️ Ativar'}
          </button>
          <button class="admin-btn sm ghost" data-action="reward-edit" data-id="${r.id}">✏️ Editar</button>
          <button class="admin-btn sm danger" data-action="reward-delete" data-id="${r.id}">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error("Erro ao carregar recompensas:", error);
    container.innerHTML = '<div class="admin-error">Erro ao carregar recompensas</div>';
  }
}

async function toggleReward(id, active) {
  try {
    await updateDoc(`rewards/${id}`, { active: !active, updatedAt: Date.now() });
    toastSuccess(`Recompensa ${active ? 'pausada' : 'ativada'} com sucesso`);
    renderRewards();
  } catch (error) {
    console.error("Erro ao alternar recompensa:", error);
    toastError("Erro ao alternar recompensa");
  }
}

async function deleteReward(id) {
  const r = cache.find((x) => x.id === id);
  const ok = await modalConfirm({
    title: "Excluir recompensa",
    message: `Excluir "${r?.name || id}"? Esta ação não pode ser desfeita.`,
    confirmText: "Excluir",
    danger: true,
  });
  if (!ok) return;

  try {
    await deleteDoc(`rewards/${id}`);
    toastSuccess("Recompensa excluída com sucesso");
    renderRewards();
  } catch (error) {
    console.error("Erro ao excluir recompensa:", error);
    toastError("Erro ao excluir recompensa");
  }
}

/** Formulário único de criar/editar recompensa (substitui os prompt() nativos). */
function form(r = {}) {
  const dialog = modalCustom(`
    <div class="modal-title">${r.id ? "Editar recompensa" : "Nova recompensa"}</div>
    <div class="modal-label">NOME</div><input class="modal-input" id="f-name" value="${escapeHtml(r.name || "")}">
    <div class="modal-label">DESCRIÇÃO</div><input class="modal-input" id="f-desc" value="${escapeHtml(r.description || "")}">
    <div class="modal-label">ÍCONE (emoji)</div><input class="modal-input" id="f-icon" value="${escapeHtml(r.icon || "🎁")}">
    <div class="modal-label">PONTOS NECESSÁRIOS</div><input class="modal-input" id="f-points" type="number" value="${r.pointsRequired ?? 100}">
    <div class="modal-label">CATEGORIA</div>
    <select class="modal-select" id="f-cat">${CATEGORIES.map(([v, l]) => `<option value="${v}" ${r.category === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <div class="modal-label">TIPO</div>
    <select class="modal-select" id="f-type">${TYPES.map(([v, l]) => `<option value="${v}" ${r.type === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <div class="modal-label">ESTOQUE (vazio = ilimitado)</div><input class="modal-input" id="f-stock" type="number" value="${r.stock ?? ""}">
    <div class="modal-actions">
      <button class="modal-btn ghost" id="f-cancel">Cancelar</button>
      <button class="modal-btn primary" id="f-save">Salvar</button>
    </div>`);
  dialog.el.querySelector("#f-cancel").onclick = dialog.close;
  dialog.el.querySelector("#f-save").onclick = async () => {
    const stockRaw = dialog.el.querySelector("#f-stock").value.trim();
    const data = {
      name: dialog.el.querySelector("#f-name").value.trim(),
      description: dialog.el.querySelector("#f-desc").value.trim(),
      icon: dialog.el.querySelector("#f-icon").value.trim() || "🎁",
      pointsRequired: parseInt(dialog.el.querySelector("#f-points").value) || 100,
      category: dialog.el.querySelector("#f-cat").value,
      type: dialog.el.querySelector("#f-type").value,
      stock: stockRaw ? parseInt(stockRaw) : null,
      updatedAt: Date.now(),
    };
    if (!data.name) return toastError("Informe o nome da recompensa");
    try {
      if (r.id) {
        await updateDoc(`rewards/${r.id}`, data);
      } else {
        await addDoc("rewards", { ...data, active: true, createdAt: Date.now() });
      }
      dialog.close();
      toastSuccess(r.id ? "Recompensa atualizada" : "Recompensa criada");
      renderRewards();
    } catch (error) {
      console.error("Erro ao salvar recompensa:", error);
      toastError("Erro ao salvar recompensa");
    }
  };
}

export function initRewards() {
  onAction("reward-new", () => form());
  onAction("reward-toggle", (el) => toggleReward(el.dataset.id, el.dataset.active === "true"));
  onAction("reward-delete", (el) => deleteReward(el.dataset.id));
  onAction("reward-edit", (el) => form(cache.find((r) => r.id === el.dataset.id) || {}));
}

export { renderRewards };
