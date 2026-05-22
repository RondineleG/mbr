/* ═══════════════════════════════════════════════════════════════
   REWARDS ADMIN — gerenciamento de recompensas
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "../utils/dom.js";
import { getCollection, addDoc, updateDoc, deleteDoc } from "../firebase/db.service.js";
import { toastError, toastSuccess } from "../components/toast.js";

let currentFilter = "all";

async function renderRewards() {
  const container = $("#rewardsList");
  if (!container) return;
  
  container.innerHTML = '<div class="admin-loading">Carregando recompensas...</div>';
  
  try {
    const rewards = await getCollection("rewards", {
      orderBy: ["pointsRequired", "asc"]
    });
    
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
              ${r.stock !== null ? `<span class="admin-tag">📦 ${r.stock}</span>` : '<span class="admin-tag">∞</span>'}
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
  if (!confirm("Tem certeza que deseja excluir esta recompensa?")) return;
  
  try {
    await deleteDoc(`rewards/${id}`);
    toastSuccess("Recompensa excluída com sucesso");
    renderRewards();
  } catch (error) {
    console.error("Erro ao excluir recompensa:", error);
    toastError("Erro ao excluir recompensa");
  }
}

async function createReward() {
  const name = prompt("Nome da recompensa:");
  if (!name) return;
  
  const description = prompt("Descrição da recompensa:");
  const icon = prompt("Ícone (emoji):") || "🎁";
  const pointsRequired = prompt("Pontos necessários:") || "100";
  const category = prompt("Categoria (benefits, physical, experiences, status):") || "general";
  const type = prompt("Tipo (physical, discount, benefit):") || "physical";
  const stock = prompt("Estoque (deixe vazio para ilimitado):") || "";
  
  try {
    await addDoc("rewards", {
      name,
      description,
      icon,
      pointsRequired: parseInt(pointsRequired) || 100,
      category,
      type,
      stock: stock ? parseInt(stock) : null,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    toastSuccess("Recompensa criada com sucesso");
    renderRewards();
  } catch (error) {
    console.error("Erro ao criar recompensa:", error);
    toastError("Erro ao criar recompensa");
  }
}

export function initRewards() {
  onAction("reward-new", () => createReward());
  onAction("reward-toggle", (el) => toggleReward(el.dataset.id, el.dataset.active === "true"));
  onAction("reward-delete", (el) => deleteReward(el.dataset.id));
  onAction("reward-edit", (el) => {
    toastError("Funcionalidade de edição em desenvolvimento");
  });
}

export { renderRewards };
