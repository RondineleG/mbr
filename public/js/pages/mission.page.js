/* ═══════════════════════════════════════════════════════════════
   MISSION PAGE — Sistema de missões e recompensas
   Exibe missões disponíveis, progresso e recompensas
   ═══════════════════════════════════════════════════════════════ */
import { setHtml, escapeHtml, onAction } from "../utils/dom.js";
import * as store from "../app/state.js";
import * as missionService from "../services/mission.service.js";
import { getProfile, updateProfile } from "../services/user.service.js";
import { toastSuccess } from "../components/toast.js";

let missionWatchUnsubscribe = null;
let claimedMissions = new Set(); // Track claimed missions

export function renderMissions() {
  const profile = store.get("profile");
  if (!profile) {
    setHtml("missionsContent", `
      <div class="sacola-empty">
        <div class="sacola-empty-icon">🎯</div>
        <div class="sacola-empty-title">Faça login para ver missões</div>
        <div class="sacola-empty-sub">Complete missões e ganhe recompensas</div>
      </div>`);
    return;
  }

  setHtml("missionsContent", `
    <div class="missions-header">
      <div class="missions-title">🎯 Missões da Ordem</div>
      <div class="missions-subtitle">Complete desafios e ganhe recompensas</div>
    </div>
    
    <div class="missions-summary">
      <div class="mission-summary-card">
        <div class="mission-summary-icon">⚡</div>
        <div class="mission-summary-value" id="totalRewards">0</div>
        <div class="mission-summary-label">Méritos Ganhos</div>
      </div>
      <div class="mission-summary-card">
        <div class="mission-summary-icon">✅</div>
        <div class="mission-summary-value" id="completedCount">0</div>
        <div class="mission-summary-label">Missões Completadas</div>
      </div>
    </div>

    <div class="missions-tabs">
      <button class="mission-tab active" data-tab="active" data-action="mission-tab">Ativas</button>
      <button class="mission-tab" data-tab="completed" data-action="mission-tab">Completadas</button>
      <button class="mission-tab" data-tab="locked" data-action="mission-tab">Bloqueadas</button>
    </div>

    <div class="missions-list" id="missionsList">
      <div class="loading-spinner">Carregando missões...</div>
    </div>
  `);

  loadMissions(profile.uid, 'active');
}

async function loadMissions(uid, tab) {
  const listEl = document.getElementById('missionsList');
  if (!listEl) return;

  listEl.innerHTML = '<div class="loading-spinner">Carregando missões...</div>';

  try {
    const missions = await missionService.getMissionsWithProgress(uid);
    const progress = await missionService.getUserMissionProgress(uid);
    
    // Load claimed missions
    claimedMissions = new Set(progress.claimed || []);
    
    // Atualizar resumo
    document.getElementById('totalRewards').textContent = progress.totalRewards || 0;
    document.getElementById('completedCount').textContent = progress.completed?.length || 0;

    // Filtrar por tab
    let filteredMissions;
    switch (tab) {
      case 'active':
        filteredMissions = missions.filter(m => !m.completed && !m.locked);
        break;
      case 'completed':
        filteredMissions = missions.filter(m => m.completed);
        break;
      case 'locked':
        filteredMissions = missions.filter(m => m.locked);
        break;
      default:
        filteredMissions = missions.filter(m => !m.completed && !m.locked);
    }

    if (filteredMissions.length === 0) {
      listEl.innerHTML = `
        <div class="missions-empty">
          <div class="missions-empty-icon">${tab === 'completed' ? '✅' : tab === 'locked' ? '🔒' : '🎯'}</div>
          <div class="missions-empty-title">
            ${tab === 'completed' ? 'Nenhuma missão completada' : tab === 'locked' ? 'Nenhuma missão bloqueada' : 'Nenhuma missão ativa'}
          </div>
        </div>`;
      return;
    }

    listEl.innerHTML = filteredMissions.map(mission => renderMissionCard(mission, tab)).join('');

  } catch (error) {
    console.error('Erro ao carregar missões:', error);
    listEl.innerHTML = `
      <div class="missions-error">
        <div class="missions-error-icon">⚠️</div>
        <div class="missions-error-title">Erro ao carregar missões</div>
        <div class="missions-error-sub">Tente novamente mais tarde</div>
      </div>`;
  }
}

function renderMissionCard(mission, tab) {
  const isCompleted = mission.completed;
  const isLocked = mission.locked;
  const isClaimed = claimedMissions.has(mission.id);
  
  let statusClass = '';
  let statusIcon = '';
  let statusText = '';
  let actionButton = '';

  if (isCompleted) {
    statusClass = 'completed';
    statusIcon = isClaimed ? '💰' : '✅';
    statusText = isClaimed ? 'Resgatado' : 'Completada';
    if (!isClaimed) {
      actionButton = `<button class="mission-claim-btn" data-mission-id="${mission.id}" data-action="claim-reward">Resgatar +${mission.reward}⚡</button>`;
    }
  } else if (isLocked) {
    statusClass = 'locked';
    statusIcon = '🔒';
    statusText = 'Bloqueada';
  } else {
    statusClass = 'active';
    statusIcon = '🎯';
    statusText = `${mission.progress}%`;
  }

  return `
    <div class="mission-card ${statusClass}">
      <div class="mission-card-header">
        <div class="mission-icon">${mission.icon}</div>
        <div class="mission-info">
          <div class="mission-name">${escapeHtml(mission.name)}</div>
          <div class="mission-desc">${escapeHtml(mission.description)}</div>
        </div>
        <div class="mission-status">
          <div class="mission-status-icon">${statusIcon}</div>
          <div class="mission-status-text">${statusText}</div>
        </div>
      </div>
      
      ${!isLocked ? `
        <div class="mission-progress">
          <div class="mission-progress-bar">
            <div class="mission-progress-fill" style="width: ${mission.progress}%"></div>
          </div>
          <div class="mission-progress-text">${mission.progress}% concluído</div>
        </div>
      ` : ''}
      
      <div class="mission-reward">
        <span class="mission-reward-icon">⚡</span>
        <span class="mission-reward-value">+${mission.reward}</span>
        <span class="mission-reward-label">méritos</span>
      </div>
      
      ${actionButton}
    </div>
  `;
}

export function initMissions() {
  const profile = store.get("profile");
  if (profile) {
    // Watch em tempo real do progresso
    missionWatchUnsubscribe = missionService.watchMissionProgress(profile.uid, (progress) => {
      if (store.get("page") === "missions") {
        document.getElementById('totalRewards').textContent = progress.totalRewards || 0;
        document.getElementById('completedCount').textContent = progress.completed?.length || 0;
        // Update claimed missions
        claimedMissions = new Set(progress.claimed || []);
      }
    });
  }

  // Claim reward handler
  onAction("claim-reward", async (el) => {
    const missionId = el.dataset.missionId;
    const profile = store.get("profile");
    if (!profile) return;
    
    try {
      el.disabled = true;
      el.textContent = "Resgatando...";
      
      const result = await missionService.claimMissionReward(profile.uid, missionId);
      
      if (result.success) {
        claimedMissions.add(missionId);
        toastSuccess(`+${result.reward} méritos resgatados!`);
        
        // Reload missions
        loadMissions(profile.uid, 'completed');
      }
    } catch (error) {
      console.error('Erro ao resgatar recompensa:', error);
      el.disabled = false;
      el.textContent = `Resgatar +${missionService.MISSIONS[missionId]?.reward || 0}⚡`;
    }
  });

  // Tab switching
  document.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'mission-tab') {
      const tab = e.target.dataset.tab;
      
      // Update tab styles
      document.querySelectorAll('.mission-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      
      // Reload missions with new tab
      const profile = store.get("profile");
      if (profile) {
        loadMissions(profile.uid, tab);
      }
    }
  });

  store.subscribe("profile", (newProfile) => {
    if (missionWatchUnsubscribe) {
      missionWatchUnsubscribe();
    }
    if (newProfile && store.get("page") === "missions") {
      missionWatchUnsubscribe = missionService.watchMissionProgress(newProfile.uid, (progress) => {
        document.getElementById('totalRewards').textContent = progress.totalRewards || 0;
        document.getElementById('completedCount').textContent = progress.completed?.length || 0;
        claimedMissions = new Set(progress.claimed || []);
      });
      loadMissions(newProfile.uid, 'active');
    }
  });
}

export function cleanupMissions() {
  if (missionWatchUnsubscribe) {
    missionWatchUnsubscribe();
    missionWatchUnsubscribe = null;
  }
}