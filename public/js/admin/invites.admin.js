/* ═══════════════════════════════════════════════════════════════
   INVITES ADMIN — gerenciamento de convites (com vínculo a um agente)
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "../utils/dom.js";
import { getCollection, getDoc, updateDoc, deleteDoc } from "../firebase/db.service.js";
import { createInvite as createInviteSvc, generateInviteCode } from "../services/invite.service.js";
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
            <button class="admin-btn sm ghost" data-action="invite-edit" data-id="${i.id}">✏️ Editar</button>
            <button class="admin-btn sm ghost" data-action="invite-revoke" data-id="${i.id}">🚫 Revogar</button>
            <button class="admin-btn sm danger" data-action="invite-delete" data-id="${i.id}">🗑️</button>
          ` : i.status === 'usado' ? `
            <span class="admin-tag" title="Convite já utilizado — não pode ser excluído">🔒 utilizado</span>
          ` : `
            <button class="admin-btn sm danger" data-action="invite-delete" data-id="${i.id}">🗑️</button>
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

// Edita um convite ainda ATIVO (não usado): vínculo, limite e código.
// "🔄 Gerar novo" troca o código; como o código é o id do doc, regenerar
// cria um novo doc e remove o antigo.
async function editInviteForm(id) {
  await ensureAgents();
  const inv = await getDoc(`invites/${id}`).catch(() => null);
  if (!inv) return toastError("Convite não encontrado");
  if (inv.status !== "ativo") return toastError("Só é possível editar convites ativos (não usados)");
  const opts = `<option value="">— Admin / Sistema —</option>` +
    agents.map(a => `<option value="${a.uid}" ${inv.vinculadoA === a.uid ? "selected" : ""}>${escapeHtml(a.codename || a.email)}</option>`).join("");

  const dlg = modalCustom(`
    <div class="modal-title">Editar convite</div>
    <div class="modal-label">CÓDIGO</div>
    <div style="display:flex;gap:8px;align-items:center">
      <input class="modal-input" id="e-code" value="${escapeHtml(inv.id)}" style="flex:1;font-family:var(--f-mono);letter-spacing:1px">
      <button class="modal-btn ghost" id="e-regen" type="button" style="white-space:nowrap">🔄 Gerar novo</button>
    </div>
    <div class="modal-label">VINCULAR AO AGENTE</div>
    <select class="modal-select" id="e-agent">${opts}</select>
    <div class="modal-label">LIMITE DE USOS</div>
    <input class="modal-input" id="e-uses" type="number" min="1" value="${inv.limiteUso || 1}">
    <div class="modal-actions">
      <button class="modal-btn ghost" id="e-cancel">Cancelar</button>
      <button class="modal-btn primary" id="e-save">Salvar</button>
    </div>`);

  dlg.el.querySelector("#e-cancel").onclick = dlg.close;
  dlg.el.querySelector("#e-regen").onclick = () => { dlg.el.querySelector("#e-code").value = generateInviteCode(); };
  dlg.el.querySelector("#e-save").onclick = async () => {
    const newCode = (dlg.el.querySelector("#e-code").value || "").toUpperCase().trim();
    const uid = dlg.el.querySelector("#e-agent").value;
    const agent = agents.find(a => a.uid === uid);
    const uses = parseInt(dlg.el.querySelector("#e-uses").value) || 1;
    const vinculadoNome = agent ? (agent.codename || agent.email) : null;
    try {
      if (newCode && newCode !== inv.id) {
        // Regenerou o código → novo doc + remove o antigo.
        await createInviteSvc({ code: newCode, createdBy: inv.criadoPor || "admin", roleCreator: inv.roleCriador || "admin", vinculadoA: uid || null, vinculadoNome, limiteUso: uses });
        await deleteDoc(`invites/${id}`);
        toastSuccess(`Convite atualizado: ${newCode}`);
      } else {
        await updateDoc(`invites/${id}`, { vinculadoA: uid || null, vinculadoNome, limiteUso: uses, atualizadoEm: Date.now() });
        toastSuccess("Convite atualizado");
      }
      dlg.close();
      renderInvites();
    } catch (e) {
      console.error("Erro ao salvar convite:", e);
      toastError("Erro ao salvar convite");
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
  // Convite já utilizado é registro de quem se cadastrou — não pode ser excluído.
  const inv = await getDoc(`invites/${id}`).catch(() => null);
  if (inv && inv.status === "usado") return toastError("Convite já utilizado não pode ser excluído");
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
  onAction("invite-edit", (el) => editInviteForm(el.dataset.id));
  onAction("invite-revoke", (el) => revokeInvite(el.dataset.id));
  onAction("invite-delete", (el) => deleteInvite(el.dataset.id));
  onAction("invite-copy", (el) => copyInviteCode(el.dataset.code));
}

export { renderInvites };
