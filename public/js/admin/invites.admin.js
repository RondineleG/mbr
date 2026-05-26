/* ═══════════════════════════════════════════════════════════════
   INVITES ADMIN — gerenciamento de convites (com vínculo a um agente)
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "../utils/dom.js";
import { getCollection, updateDoc, deleteDoc } from "../firebase/db.service.js";
import { createInvite as createInviteSvc } from "../services/invite.service.js";
import { listAgents } from "../services/user.service.js";
import { modalCustom, modalConfirm } from "../components/modal.js";
import { toastError, toastSuccess } from "../components/toast.js";

let currentFilter = "all";
let agents = [];

async function renderInvites() {
  const container = $("#invitesList");
  if (!container) return;
  container.innerHTML = '<div class="admin-loading">Carregando convites...</div>';

  try {
    const invites = await getCollection("invites", { orderBy: ["dataCriacao", "desc"] });
    const filtered = currentFilter === "all" ? invites : invites.filter(i => i.status === currentFilter);

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
            <div class="admin-item-sub">Vinculado a: <b>${escapeHtml(i.vinculadoNome || (i.vinculadoA ? i.vinculadoA : "Admin / Sistema"))}</b></div>
            <div class="admin-item-meta">
              <span class="admin-tag ${i.status === 'ativo' ? 'active' : 'inactive'}">${i.status}</span>
              ${i.usadoPor ? `<span class="admin-tag">Usado por: ${escapeHtml(i.usadoPor)}</span>` : ''}
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

async function ensureAgents() {
  if (agents.length) return;
  try { agents = (await listAgents()).filter(a => a.role !== "admin"); } catch { agents = []; }
}

async function createInviteForm() {
  await ensureAgents();
  const opts = `<option value="">— Admin / Sistema —</option>` +
    agents.map(a => `<option value="${a.uid}">${escapeHtml(a.codename || a.email)}</option>`).join("");

  const dlg = modalCustom(`
    <div class="modal-title">Novo convite</div>
    <div class="modal-label">VINCULAR AO AGENTE</div>
    <select class="modal-select" id="i-agent">${opts}</select>
    <div class="modal-label">CÓDIGO (opcional)</div>
    <input class="modal-input" id="i-code" placeholder="Gerado automaticamente se vazio">
    <div class="modal-label">LIMITE DE USOS</div>
    <input class="modal-input" id="i-uses" type="number" value="1" min="1">
    <div class="modal-actions">
      <button class="modal-btn ghost" id="i-cancel">Cancelar</button>
      <button class="modal-btn primary" id="i-save">Criar convite</button>
    </div>`);

  dlg.el.querySelector("#i-cancel").onclick = dlg.close;
  dlg.el.querySelector("#i-save").onclick = async () => {
    const uid = dlg.el.querySelector("#i-agent").value;
    const agent = agents.find(a => a.uid === uid);
    const code = dlg.el.querySelector("#i-code").value.trim();
    const uses = parseInt(dlg.el.querySelector("#i-uses").value) || 1;
    try {
      const created = await createInviteSvc({
        code: code || undefined,
        createdBy: "admin",
        roleCreator: "admin",
        vinculadoA: uid || null,
        vinculadoNome: agent ? (agent.codename || agent.email) : null,
        limiteUso: uses,
      });
      dlg.close();
      toastSuccess(`Convite criado: ${created}${agent ? " → " + (agent.codename || agent.email) : ""}`);
      renderInvites();
    } catch (error) {
      console.error("Erro ao criar convite:", error);
      toastError("Erro ao criar convite");
    }
  };
}

async function revokeInvite(id) {
  if (!(await modalConfirm({ title: "Revogar convite", message: "Tem certeza? O código deixa de funcionar.", confirmText: "Revogar", danger: true }))) return;
  try {
    await updateDoc(`invites/${id}`, { status: 'cancelado', atualizadoEm: Date.now() });
    toastSuccess("Convite revogado");
    renderInvites();
  } catch (error) {
    console.error("Erro ao revogar convite:", error);
    toastError("Erro ao revogar convite");
  }
}

async function deleteInvite(id) {
  if (!(await modalConfirm({ title: "Excluir convite", message: "Excluir definitivamente este convite?", confirmText: "Excluir", danger: true }))) return;
  try {
    await deleteDoc(`invites/${id}`);
    toastSuccess("Convite excluído");
    renderInvites();
  } catch (error) {
    console.error("Erro ao excluir convite:", error);
    toastError("Erro ao excluir convite");
  }
}

async function copyInviteCode(code) {
  try { await navigator.clipboard.writeText(code); toastSuccess("Código copiado"); }
  catch { toastError("Erro ao copiar código"); }
}

export function initInvites() {
  onAction("invite-new", () => createInviteForm());
  onAction("invite-revoke", (el) => revokeInvite(el.dataset.id));
  onAction("invite-delete", (el) => deleteInvite(el.dataset.id));
  onAction("invite-copy", (el) => copyInviteCode(el.dataset.code));
}

export { renderInvites };
