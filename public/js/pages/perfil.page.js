/* ═══════════════════════════════════════════════════════════════
   PERFIL PAGE — dados do agente, edição (modal), tema e logout
   Codinome é PERMANENTE (não editável).
   ═══════════════════════════════════════════════════════════════ */
import { onAction, setText, setHtml, show } from "../utils/dom.js";
import * as store from "../app/state.js";
import { codenameInitials, rankLabel, formatAddress, rankFromPoints } from "../utils/format.js";
import { updateProfile } from "../services/user.service.js";
import { listInvites } from "../services/invite.service.js";
import { renderTopbar } from "../components/topbar.js";
import { applyTheme, logout } from "../app/session.js";
import { modalPrompt } from "../components/modal.js";
import { toast, toastSuccess } from "../components/toast.js";

export function renderProfile() {
  const p = store.get("profile");
  if (!p) return;
  const r = rankFromPoints(p.points);
  setHtml("profileCodename", `${p.codename}<span class="profile-codename-lock">🔒</span>`);
  setText("profileAvatar", codenameInitials(p.codename));
  setText("profileRank", rankLabel(p.points));
  setText("profStatPoints", p.points || 0);
  setText("profStatLevel", r.level);
  setText("profStatOrders", store.get("orders").length);
  setText("profRealName", p.name || "—");
  setText("profEmail", p.email || "—");
  setText("profPhone", p.phone || "—");
  setText("profAddress", formatAddress(p.address));
  setText("profNeighborhood", p.address?.neighborhood || "—");
  setText("profCep", p.address?.cep || "—");
  setText("profInvites", (p.invitesAvailable || 0) + " disponíveis");
  setText("profThemeIcon", store.get("theme") === "light" ? "☀️" : "🌙");
  setText("profThemeLabel", store.get("theme") === "light" ? "Modo Claro" : "Modo Escuro");
}

async function showMyInvites() {
  const p = store.get("profile");
  if (!p) return;
  
  // Show loading modal first
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div class="modal-title">Meus Convites</div>
        <button class="modal-close" data-action="close-invites-modal">✕</button>
      </div>
      <div class="modal-body">
        <div class="loading-state">Carregando convites...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  const closeModal = () => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  };
  
  modal.querySelector('[data-action="close-invites-modal"]')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  try {
    const invites = await listInvites();
    const myInvites = invites.filter(i => i.criadoPor === p.uid);
    
    const available = myInvites.filter(i => i.status === 'ativo' && new Date(i.dataExpiracao?.toDate?.() || i.dataExpiracao) > new Date());
    const used = myInvites.filter(i => i.status === 'usado');
    const expired = myInvites.filter(i => i.status === 'expirado' || (i.status !== 'usado' && new Date(i.dataExpiracao?.toDate?.() || i.dataExpiracao) <= new Date()));
    
    const formatInvite = (i) => {
      const status = i.status === 'usado' ? "✅ Usado" : i.status === 'expirado' ? "⏰ Expirado" : i.status === 'cancelado' ? "🚫 Cancelado" : "🎫 Disponível";
      const expiry = new Date(i.dataExpiracao?.toDate?.() || i.dataExpiracao).toLocaleDateString('pt-BR');
      return `<div class="invite-item">
        <div class="invite-code">${i.token || i.id}</div>
        <div class="invite-status">${status}</div>
        <div class="invite-expiry">Expira: ${expiry}</div>
      </div>`;
    };
    
    const html = `
      <div class="invites-modal">
        <div class="invites-section">
          <div class="invites-section-title">🎫 Disponíveis (${available.length})</div>
          ${available.length ? available.map(formatInvite).join('') : '<div class="invites-empty">Nenhum convite disponível</div>'}
        </div>
        <div class="invites-section">
          <div class="invites-section-title">✅ Usados (${used.length})</div>
          ${used.length ? used.map(formatInvite).join('') : '<div class="invites-empty">Nenhum convite usado</div>'}
        </div>
        <div class="invites-section">
          <div class="invites-section-title">⏰ Expirados (${expired.length})</div>
          ${expired.length ? expired.map(formatInvite).join('') : '<div class="invites-empty">Nenhum convite expirado</div>'}
        </div>
      </div>
    `;
    
    // Update modal content
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = html;
    }
    
  } catch (err) {
    console.error("Erro ao carregar convites:", err);
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = '<div class="error-state">Erro ao carregar convites. Tente novamente.</div>';
    }
    toast("error", "⚠", "Erro ao carregar convites");
  }
}

const EDITABLE = {
  phone: { label: "Telefone / WhatsApp", type: "tel", get: (p) => p.phone, apply: (v) => ({ phone: v }) },
  email: { label: "E-mail", type: "email", get: (p) => p.email, apply: (v) => ({ email: v }) },
  street: { label: "Rua / Avenida", get: (p) => p.address?.street, apply: (v, p) => ({ address: { ...p.address, street: v } }) },
  number: { label: "Número", get: (p) => p.address?.number, apply: (v, p) => ({ address: { ...p.address, number: v } }) },
  neighborhood: { label: "Bairro", get: (p) => p.address?.neighborhood, apply: (v, p) => ({ address: { ...p.address, neighborhood: v } }) },
  cep: { label: "CEP", get: (p) => p.address?.cep, apply: (v, p) => ({ address: { ...p.address, cep: v } }) },
};

async function edit(field) {
  const cfg = EDITABLE[field];
  const p = store.get("profile");
  if (!cfg || !p) return;
  const value = await modalPrompt({ title: "Editar " + cfg.label, label: cfg.label.toUpperCase(), type: cfg.type || "text", value: cfg.get(p) || "" });
  if (value === null) return;
  try {
    await updateProfile(p.uid, cfg.apply(value, p));
    toastSuccess(cfg.label + " atualizado");
    // watchProfile atualiza o store; renderProfile reage via subscribe.
  } catch {
    toast("error", "⚠", "Não foi possível salvar");
  }
}

function toggleTheme() {
  const next = store.get("theme") === "light" ? "dark" : "light";
  store.set("theme", next);
  applyTheme();
  renderTopbar();
  renderProfile();
}

export function initPerfil() {
  onAction("edit-field", (el) => edit(el.dataset.field));
  onAction("toggle-theme", () => toggleTheme());
  onAction("logout", () => logout());
  onAction("show-my-invites", () => showMyInvites());
  store.subscribe("profile", () => { if (store.get("page") === "perfil") renderProfile(); });
  store.subscribe("orders", () => { if (store.get("page") === "perfil") renderProfile(); });
}

export { toggleTheme };
