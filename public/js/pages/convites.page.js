/* ═══════════════════════════════════════════════════════════════
   CONVITES PAGE — painel completo de gestão de convites
   ═══════════════════════════════════════════════════════════════ */
import { $, $$, onAction, show } from "../utils/dom.js";
import * as store from "../app/state.js";
import { createInvite, cancelInvite, listInvites, getInviteStats } from "../services/invite.service.js";
import { getProfile } from "../services/user.service.js";
import { modalPrompt } from "../components/modal.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { loadingState, emptyState, withLoading, withEmpty } from "../utils/loading.js";

let currentFilter = "todos";
let invites = [];
let stats = null;
let isLoading = false;

const FILTERS = {
  todos: () => true,
  ativos: (i) => i.status === "ativo",
  usados: (i) => i.status === "usado",
  expirados: (i) => i.status === "expirado",
  cancelados: (i) => i.status === "cancelado"
};

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getStatusBadge(status) {
  const badges = {
    ativo: '<span class="badge badge-success">Ativo</span>',
    usado: '<span class="badge badge-info">Usado</span>',
    expirado: '<span class="badge badge-warning">Expirado</span>',
    cancelado: '<span class="badge badge-danger">Cancelado</span>'
  };
  return badges[status] || status;
}

function renderStats() {
  if (!stats) return;

  const t = $("#convitesStatsTotal"); if (t) t.textContent = stats.totalEnviados || 0;
  const u = $("#convitesStatsUsados"); if (u) u.textContent = stats.totalUsados || 0;
  const e = $("#convitesStatsExpirados"); if (e) e.textContent = stats.totalExpirados || 0;
  const a = $("#convitesStatsAtivos"); if (a) a.textContent = stats.totalAtivos || 0;
  const c = $("#convitesStatsConversao"); if (c) c.textContent = (stats.taxaConversao || 0) + "%";
}

function renderInviteList() {
  const filtered = invites.filter(FILTERS[currentFilter]);
  const container = $("#convitesList");
  
  if (!container) return;
  
  const content = withLoading(
    withEmpty(
      filtered.map((invite) => `
        <div class="convite-card">
          <div class="convite-header">
            <div class="convite-code">${invite.id}</div>
            <div class="convite-status">${getStatusBadge(invite.status)}</div>
          </div>
          <div class="convite-info">
            <div class="convite-row">
              <span class="label">Criado por:</span>
              <span class="value">${invite.criadoPor || "—"}</span>
            </div>
            <div class="convite-row">
              <span class="label">Email destino:</span>
              <span class="value">${invite.emailDestino || "—"}</span>
            </div>
            <div class="convite-row">
              <span class="label">Criado em:</span>
              <span class="value">${formatDate(invite.dataCriacao)}</span>
            </div>
            <div class="convite-row">
              <span class="label">Expira em:</span>
              <span class="value">${formatDate(invite.dataExpiracao)}</span>
            </div>
            ${invite.status === "usado" ? `
              <div class="convite-row">
                <span class="label">Usado por:</span>
                <span class="value">${invite.usadoPor || "—"}</span>
              </div>
              <div class="convite-row">
                <span class="label">Usado em:</span>
                <span class="value">${formatDate(invite.dataUso)}</span>
              </div>
            ` : ""}
            <div class="convite-row">
              <span class="label">Usos:</span>
              <span class="value">${invite.totalUsos || 0}/${invite.limiteUso || 1}</span>
            </div>
          </div>
          ${invite.status === "ativo" ? `
            <div class="convite-actions">
              <button class="btn btn-sm btn-danger" data-action="cancel-invite" data-code="${invite.id}">
                Cancelar
              </button>
              <button class="btn btn-sm btn-secondary" data-action="copy-invite" data-code="${invite.id}">
                Copiar
              </button>
            </div>
          ` : ""}
        </div>
      `).join(""),
      filtered.length === 0,
      {
        icon: "📋",
        title: "Nenhum convite encontrado",
        description: "Tente mudar o filtro ou criar novos convites"
      }
    ),
    isLoading,
    "Carregando convites..."
  );
  
  container.innerHTML = content;
}

async function loadInvites() {
  const profile = store.get("profile");
  if (!profile) return;
  
  isLoading = true;
  renderInviteList();
  
  try {
    invites = await listInvites(profile.role === "admin" ? {} : { createdBy: profile.uid });
    stats = await getInviteStats(profile.role === "admin" ? null : profile.uid);
    isLoading = false;
    renderStats();
    renderInviteList();
  } catch (err) {
    console.error("Erro ao carregar convites:", err);
    isLoading = false;
    toastError("Erro ao carregar convites");
    renderInviteList();
  }
}

async function createNewInvite() {
  const profile = store.get("profile");
  if (!profile) return;
  
  const code = await modalPrompt({
    title: "Criar Novo Convite",
    label: "CÓDIGO (opcional)",
    type: "text",
    placeholder: "Deixe vazio para gerar automaticamente",
    value: ""
  });
  
  if (code === null) return; // Cancelado
  
  const email = await modalPrompt({
    title: "Criar Novo Convite",
    label: "EMAIL DESTINO (opcional)",
    type: "email",
    placeholder: "email@exemplo.com",
    value: ""
  });
  
  if (email === null) return; // Cancelado
  
  try {
    await createInvite({
      code: code || undefined,
      createdBy: profile.uid,
      roleCreator: profile.role,
      emailDestino: email || undefined,
      limiteUso: 1
    });
    
    toastSuccess("Convite criado com sucesso!");
    await loadInvites();
  } catch (err) {
    console.error("Erro ao criar convite:", err);
    toastError("Erro ao criar convite");
  }
}

async function cancelInviteHandler(code) {
  if (!confirm("Tem certeza que deseja cancelar este convite?")) return;
  
  try {
    await cancelInvite(code);
    toastSuccess("Convite cancelado com sucesso!");
    await loadInvites();
  } catch (err) {
    console.error("Erro ao cancelar convite:", err);
    toastError("Erro ao cancelar convite");
  }
}

function copyInviteCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    toastSuccess("Código copiado para a área de transferência!");
  }).catch(() => {
    toastError("Erro ao copiar código");
  });
}

function setFilter(filter) {
  currentFilter = filter;
  $$(".convite-filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderInviteList();
}

export function renderConvites() {
  renderStats();
  renderInviteList();
}

export function initConvites() {
  onAction("create-invite", createNewInvite);
  onAction("cancel-invite", (el) => cancelInviteHandler(el.dataset.code));
  onAction("copy-invite", (el) => copyInviteCode(el.dataset.code));
  onAction("convite-filter", (el) => setFilter(el.dataset.filter));
  
  // Carregar convites ao inicializar
  loadInvites();
  
  // Recarregar quando o perfil mudar
  store.subscribe("profile", loadInvites);
}
