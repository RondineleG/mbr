/* ═══════════════════════════════════════════════════════════════
   MISSIONS ADMIN — gerenciamento de missões
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "../utils/dom.js";
import { getCollection, addDoc, updateDoc, deleteDoc } from "../firebase/db.service.js";
import { toastError, toastSuccess } from "../components/toast.js";

let currentFilter = "all";

async function renderMissions() {
  const container = $("#missionsList");
  if (!container) return;
  
  container.innerHTML = '<div class="admin-loading">Carregando missões...</div>';
  
  try {
    const missions = await getCollection("missions", {
      orderBy: ["order", "asc"]
    });
    
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
  if (!confirm("Tem certeza que deseja excluir esta missão?")) return;
  
  try {
    await deleteDoc(`missions/${id}`);
    toastSuccess("Missão excluída com sucesso");
    renderMissions();
  } catch (error) {
    console.error("Erro ao excluir missão:", error);
    toastError("Erro ao excluir missão");
  }
}

async function createMission() {
  const name = prompt("Nome da missão:");
  if (!name) return;
  
  const description = prompt("Descrição da missão:");
  const icon = prompt("Ícone (emoji):") || "🎯";
  const reward = prompt("Recompensa em pontos:") || "50";
  const type = prompt("Tipo (single, cumulative, streak):") || "single";
  const target = prompt("Meta (opcional):") || "";
  const condition = prompt("Condição (opcional):") || "";
  
  try {
    await addDoc("missions", {
      name,
      description,
      icon,
      reward: parseInt(reward) || 50,
      type,
      target: target ? parseInt(target) : null,
      condition,
      active: true,
      order: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    toastSuccess("Missão criada com sucesso");
    renderMissions();
  } catch (error) {
    console.error("Erro ao criar missão:", error);
    toastError("Erro ao criar missão");
  }
}

export function initMissions() {
  onAction("mission-new", () => createMission());
  onAction("mission-toggle", (el) => toggleMission(el.dataset.id, el.dataset.active === "true"));
  onAction("mission-delete", (el) => deleteMission(el.dataset.id));
  onAction("mission-edit", (el) => {
    toastError("Funcionalidade de edição em desenvolvimento");
  });
}

export { renderMissions };
