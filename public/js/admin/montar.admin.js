/* ═══════════════════════════════════════════════════════════════
   ADMIN · MONTE SEU LANCHE — cadastra/edita os ingredientes do montador.
   Edita em memória (state) e persiste em config/montar ao salvar.
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "../utils/dom.js";
import { loadBuildSteps, saveBuildSteps, defaultBuildSteps } from "../services/buildsteps.service.js";
import { money } from "../utils/format.js";
import { modalCustom, modalConfirm } from "../components/modal.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { skeletonList } from "../components/skeleton.js";

let state = null; // { steps, basePrice }

// A etapa "finalizar" (revisão) não tem ingredientes — não é editável.
const editable = (s) => s.id !== "finalizar";

async function load() {
  setHtml("montarPanel", skeletonList(4));
  state = await loadBuildSteps();
  draw();
}

function draw() {
  if (!state) return;
  const steps = state.steps.map((s, si) => editable(s) ? `
    <div class="data-group ${s.disabled ? "inactive" : ""}">
      <div class="data-group-head">
        <div class="data-group-title">${s.icon || "🍔"} ${escapeHtml(s.label)} <span class="admin-tag">máx: ${s.max}</span>${s.disabled ? ' <span class="admin-tag">desativada</span>' : ""}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="admin-btn sm ghost" data-action="montar-step-toggle" data-si="${si}">${s.disabled ? "Ativar" : "Desativar"}</button>
          <button class="admin-btn sm ghost" data-action="montar-step-edit" data-si="${si}">Editar etapa</button>
          <button class="admin-btn sm" data-action="montar-item-new" data-si="${si}">+ Ingrediente</button>
          <button class="admin-btn sm danger" data-action="montar-step-del" data-si="${si}">✕ Etapa</button>
        </div>
      </div>
      ${(s.items || []).map((it, ii) => `
        <div class="data-row">
          <div class="data-thumb">${it.icon || "🍔"}</div>
          <div class="data-main">
            <div class="data-name">${escapeHtml(it.name)}</div>
            <div class="data-meta">${escapeHtml(it.desc || "")}</div>
          </div>
          <div class="data-price">${it.price > 0 ? "+ " + money(it.price) : "incluído"}</div>
          <div class="data-actions">
            <button class="admin-btn sm" data-action="montar-item-edit" data-si="${si}" data-ii="${ii}">Editar</button>
            <button class="admin-btn sm danger" data-action="montar-item-del" data-si="${si}" data-ii="${ii}">✕</button>
          </div>
        </div>`).join("") || '<div class="admin-empty">Sem ingredientes nesta etapa.</div>'}
    </div>` : "").join("");

  setHtml("montarPanel", `
    <div class="data-group">
      <div class="data-group-head"><div class="data-group-title">💰 Preço-base do lanche montado</div></div>
      <div class="data-row">
        <div class="data-main"><div class="data-meta">Valor inicial antes dos adicionais (ingredientes com preço &gt; 0).</div></div>
        <input class="modal-input" id="montarBase" type="number" step="0.01" value="${state.basePrice}" style="max-width:140px">
      </div>
    </div>
    ${steps}`);
}

/* ─── Formulários ─── */
function itemForm(si, ii) {
  const isEdit = ii != null;
  const it = isEdit ? state.steps[si].items[ii] : { name: "", desc: "", price: 0, icon: "🍔" };
  const m = modalCustom(`
    <div class="modal-title">${isEdit ? "Editar ingrediente" : "Novo ingrediente"}</div>
    <div class="modal-label">NOME</div><input class="modal-input" id="i-name" value="${escapeHtml(it.name || "")}">
    <div class="modal-label">DESCRIÇÃO</div><input class="modal-input" id="i-desc" value="${escapeHtml(it.desc || "")}">
    <div style="display:flex;gap:10px">
      <div style="flex:1"><div class="modal-label">PREÇO (R$, 0 = incluído)</div><input class="modal-input" id="i-price" type="number" step="0.01" value="${it.price || 0}"></div>
      <div style="width:90px"><div class="modal-label">ÍCONE</div><input class="modal-input" id="i-icon" value="${escapeHtml(it.icon || "🍔")}"></div>
    </div>
    <div class="modal-actions">
      <button class="modal-btn ghost" id="i-cancel">Cancelar</button>
      <button class="modal-btn primary" id="i-save">${isEdit ? "Salvar" : "Adicionar"}</button>
    </div>`);
  m.el.querySelector("#i-cancel").onclick = m.close;
  m.el.querySelector("#i-save").onclick = () => {
    const data = {
      name: m.el.querySelector("#i-name").value.trim(),
      desc: m.el.querySelector("#i-desc").value.trim(),
      price: parseFloat(m.el.querySelector("#i-price").value) || 0,
      icon: m.el.querySelector("#i-icon").value.trim() || "🍔",
    };
    if (!data.name) return toastError("Informe o nome do ingrediente");
    state.steps[si].items ||= [];
    if (isEdit) state.steps[si].items[ii] = data;
    else state.steps[si].items.push(data);
    m.close(); draw();
  };
}

// Gera um id de etapa único a partir do nome (slug), evitando colisões.
function stepId(label) {
  const base = (label || "etapa").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "etapa";
  const ids = new Set(state.steps.map((s) => s.id));
  if (!ids.has(base)) return base;
  let n = 2; while (ids.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function stepForm(si) {
  const isEdit = si != null;
  const s = isEdit ? state.steps[si] : { label: "", max: 1, icon: "🍔", items: [] };
  const m = modalCustom(`
    <div class="modal-title">${isEdit ? "Editar etapa" : "Nova etapa"}</div>
    <div class="modal-label">NOME</div><input class="modal-input" id="s-label" value="${escapeHtml(s.label || "")}">
    <div style="display:flex;gap:10px">
      <div style="flex:1"><div class="modal-label">MÁX. SELEÇÕES</div><input class="modal-input" id="s-max" type="number" min="1" value="${s.max || 1}"></div>
      <div style="width:90px"><div class="modal-label">ÍCONE</div><input class="modal-input" id="s-icon" value="${escapeHtml(s.icon || "🍔")}"></div>
    </div>
    <div class="modal-actions">
      <button class="modal-btn ghost" id="s-cancel">Cancelar</button>
      <button class="modal-btn primary" id="s-save">${isEdit ? "Salvar" : "Criar etapa"}</button>
    </div>`);
  m.el.querySelector("#s-cancel").onclick = m.close;
  m.el.querySelector("#s-save").onclick = () => {
    const label = m.el.querySelector("#s-label").value.trim();
    if (!label) return toastError("Informe o nome da etapa");
    const max = Math.max(1, parseInt(m.el.querySelector("#s-max").value, 10) || 1);
    const icon = m.el.querySelector("#s-icon").value.trim() || "🍔";
    if (isEdit) { s.label = label; s.max = max; s.icon = icon; }
    else {
      // Insere a nova etapa antes da "finalizar" (revisão), que fica sempre por último.
      const fin = state.steps.findIndex((x) => x.id === "finalizar");
      const at = fin >= 0 ? fin : state.steps.length;
      state.steps.splice(at, 0, { id: stepId(label), label, max, icon, items: [] });
    }
    m.close(); draw();
  };
}

async function persist() {
  const base = parseFloat($("#montarBase")?.value) || state.basePrice;
  state.basePrice = base;
  try {
    await saveBuildSteps(state.steps, base);
    toastSuccess("Ingredientes salvos — o cardápio já reflete as mudanças");
  } catch { toastError("Falha ao salvar os ingredientes"); }
}

export function renderMontar() { load(); }

export function initMontar() {
  onAction("montar-item-new", (el) => itemForm(+el.dataset.si, null));
  onAction("montar-item-edit", (el) => itemForm(+el.dataset.si, +el.dataset.ii));
  onAction("montar-item-del", async (el) => {
    const si = +el.dataset.si, ii = +el.dataset.ii;
    const it = state.steps[si].items[ii];
    if (await modalConfirm({ title: "Remover ingrediente", message: `Remover "${it.name}"?`, confirmText: "Remover", danger: true })) {
      state.steps[si].items.splice(ii, 1); draw();
    }
  });
  onAction("montar-step-edit", (el) => stepForm(+el.dataset.si));
  onAction("montar-step-new", () => stepForm(null));
  onAction("montar-step-toggle", (el) => {
    const s = state.steps[+el.dataset.si];
    s.disabled = !s.disabled; draw();
  });
  onAction("montar-step-del", async (el) => {
    const si = +el.dataset.si;
    const s = state.steps[si];
    if (await modalConfirm({ title: "Remover etapa", message: `Remover a etapa "${s.label}" e todos os seus ingredientes?`, confirmText: "Remover", danger: true })) {
      state.steps.splice(si, 1); draw();
    }
  });
  onAction("montar-save", () => persist());
  onAction("montar-reset", async () => {
    if (await modalConfirm({ title: "Restaurar padrão", message: "Descarta as edições e volta aos ingredientes originais. Salve depois para aplicar.", confirmText: "Restaurar" })) {
      state = defaultBuildSteps(); draw();
    }
  });
}
