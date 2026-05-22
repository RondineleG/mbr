/* ═══════════════════════════════════════════════════════════════
   INVITES ADMIN — gerenciamento de convites
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "../utils/dom.js";
import { getCollection, addDoc, updateDoc, deleteDoc } from "../firebase/db.service.js";
import { toastError, toastSuccess } from "../components/toast.js";

let currentFilter = "all";

async function renderInvites() {
  const container = $("#invitesList");
  if (!container) return;
  
  container.innerHTML = '<div class="admin-loading">Carregando convites...</div>';
  
  try {
    const invites = await getCollection("invites", {
      orderBy: ["dataCriacao", "desc"]
    });
    
    const filtered = currentFilter === "all" 
      ? invites 
      : invites.filter(i => i.status === currentFilter);
    
    if (filtered.length === 0) {
      container.innerHTML = '<div class="admin-empty">Nenhum convite encontrado</div>';
      return;
    }
    
    container.innerHTML = filtered.map(i => `
      <div class="admin-item">
        <div class="admin-item-main">
          <div class="admin-item-icon">${i.status === 'usado' ? '✅' : i.status === 'expirado' ? '⏰' : '🎫'}</div>
          <div class="admin-item-content">
            <div class="admin-item-title" style="font-family:var(--f-mono);letter-spacing:1px">${escapeHtml(i.id)}</div>
            <div class="admin-item-sub">Criado por: ${escapeHtml(i.criadoPor || 'Sistema')}</div>
            <div class="admin-item-meta">
              <span class="admin-tag ${i.status === 'ativo' ? 'active' : 'inactive'}">${i.status}</span>
              ${i.usadoPor ? `<span class="admin-tag">Usado por: ${escapeHtml(i.usadoPor)}</span>` : ''}
              <span class="admin-tag">${i.dataCriacao ? new Date(i.dataCriacao.toDate ? i.dataCriacao.toDate() : i.dataCriacao).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>
        <div class="admin-item-actions">
          ${i.status === 'ativo' ? `
            <button class="admin-btn sm ghost" data-action="invite-copy" data-code="${i.id}">📋 Copiar</button>
            <button class="admin-btn sm danger" data-action="invite-revoke" data-id="${i.id}">🚫 Revogar</button>
          ` : `
            <button class="admin-btn sm ghost" data-action="invite-delete" data-id="${i.id}">🗑️</button>
          `}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error("Erro ao carregar convites:", error);
    container.innerHTML = '<div class="admin-error">Erro ao carregar convites</div>';
  }
}

async function createInvite() {
  const createdBy = prompt("Criado por (opcional):") || "Admin";
  const maxUses = prompt("Máximo de usos (deixe vazio para 1):") || "1";
  
  try {
    const code = 'MRBUR-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    
    await addDoc("invites", {
      id: code,
      token: code,
      criadoPor: createdBy,
      roleCriador: "admin",
      emailDestino: null,
      status: "ativo",
      dataCriacao: Date.now(),
      dataExpiracao: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 dias
      dataUso: null,
      usadoPor: null,
      limiteUso: parseInt(maxUses) || 1,
      totalUsos: 0
    });
    
    toastSuccess(`Convite criado: ${code}`);
    renderInvites();
  } catch (error) {
    console.error("Erro ao criar convite:", error);
    toastError("Erro ao criar convite");
  }
}

async function revokeInvite(id) {
  if (!confirm("Tem certeza que deseja revogar este convite?")) return;
  
  try {
    await updateDoc(`invites/${id}`, { status: 'cancelado', atualizadoEm: Date.now() });
    toastSuccess("Convite revogado com sucesso");
    renderInvites();
  } catch (error) {
    console.error("Erro ao revogar convite:", error);
    toastError("Erro ao revogar convite");
  }
}

async function deleteInvite(id) {
  if (!confirm("Tem certeza que deseja excluir este convite?")) return;
  
  try {
    await deleteDoc(`invites/${id}`);
    toastSuccess("Convite excluído com sucesso");
    renderInvites();
  } catch (error) {
    console.error("Erro ao excluir convite:", error);
    toastError("Erro ao excluir convite");
  }
}

async function copyInviteCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    toastSuccess("Código copiado para a área de transferência");
  } catch (error) {
    console.error("Erro ao copiar código:", error);
    toastError("Erro ao copiar código");
  }
}

export function initInvites() {
  onAction("invite-new", () => createInvite());
  onAction("invite-revoke", (el) => revokeInvite(el.dataset.id));
  onAction("invite-delete", (el) => deleteInvite(el.dataset.id));
  onAction("invite-copy", (el) => copyInviteCode(el.dataset.code));
}

export { renderInvites };
