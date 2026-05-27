/* ═══════════════════════════════════════════════════════════════
   ADMIN · LANCHE DO DIA + MBOX — composição a partir dos ingredientes
   do Monte Seu Lanche (config/montar). Itens entram só como composição
   (sem acréscimo): o preço é fixo do combo.
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, setHtml, escapeHtml } from "../utils/dom.js";
import { loadBuildSteps } from "../services/buildsteps.service.js";
import { loadLancheDia, saveLancheDia, loadMbox, saveMbox } from "../services/specials.service.js";
import { WEEKDAYS } from "../utils/constants.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { skeletonList } from "../components/skeleton.js";

let palette = [];   // etapas editáveis de config/montar
let dia = null;     // { price, dias }
let mbox = null;    // { price, name, icon, desc, composicao }
let activeDay = "seg";

const stepsEditable = () => palette.filter((s) => s.id !== "finalizar");
const inComp = (comp, name) => (comp || []).some((c) => c.name === name);
const findItem = (name) => { for (const s of stepsEditable()) { const it = (s.items || []).find((i) => i.name === name); if (it) return it; } return null; };

/* Paleta de seleção: chips por etapa, marcados conforme a composição. */
function composeHtml(comp, action) {
  return stepsEditable().map((s) => `
    <div class="spec-step">
      <div class="spec-step-title">${s.icon || ""} ${escapeHtml(s.label)}</div>
      <div class="spec-chips">
        ${(s.items || []).map((it) => `
          <button class="spec-chip ${inComp(comp, it.name) ? "on" : ""}" data-action="${action}" data-name="${escapeHtml(it.name)}">
            ${it.icon || ""} ${escapeHtml(it.name)}
          </button>`).join("")}
      </div>
    </div>`).join("");
}

function compSummary(comp) {
  if (!comp?.length) return '<span style="color:var(--text-dim)">Nenhum ingrediente selecionado.</span>';
  return comp.map((c) => `${c.icon || ""} ${escapeHtml(c.name)}`).join(" · ");
}

/* ─── Lanche do Dia ─── */
function renderDia() {
  if (!dia) return;
  const d = dia.dias[activeDay] ||= { name: "", icon: "🍔", desc: "", composicao: [] };
  setHtml("lancheDiaPanel", `
    <div class="spec-tabs">
      ${WEEKDAYS.map((w) => `<button class="spec-tab ${w.key === activeDay ? "active" : ""}" data-action="spec-dia-day" data-day="${w.key}">${w.label}${dia.dias[w.key]?.composicao?.length ? " ✓" : ""}</button>`).join("")}
    </div>
    <div class="data-group">
      <div class="data-row" style="flex-wrap:wrap;gap:10px">
        <div style="flex:1;min-width:160px"><div class="modal-label">NOME DO LANCHE (${WEEKDAYS.find((w) => w.key === activeDay).label})</div><input class="modal-input" id="dia-name" value="${escapeHtml(d.name || "")}" placeholder="Ex: Smash Duplo da Casa"></div>
        <div style="width:80px"><div class="modal-label">ÍCONE</div><input class="modal-input" id="dia-icon" value="${escapeHtml(d.icon || "🍔")}"></div>
        <div style="width:120px"><div class="modal-label">PREÇO FIXO (R$)</div><input class="modal-input" id="dia-price" type="number" step="0.01" value="${dia.price}"></div>
      </div>
      <div style="padding:0 4px"><div class="modal-label">DESCRIÇÃO</div><input class="modal-input" id="dia-desc" value="${escapeHtml(d.desc || "")}" placeholder="Chamada do dia"></div>
    </div>
    <div class="spec-summary">🍔 <b>Composição:</b> ${compSummary(d.composicao)}</div>
    ${composeHtml(d.composicao, "spec-dia-toggle")}`);
}

/* ─── MBox ─── */
function renderMbox() {
  if (!mbox) return;
  setHtml("mboxPanel", `
    <div class="data-group">
      <div class="data-row" style="flex-wrap:wrap;gap:10px">
        <div style="flex:1;min-width:160px"><div class="modal-label">NOME</div><input class="modal-input" id="mbox-name" value="${escapeHtml(mbox.name || "")}"></div>
        <div style="width:80px"><div class="modal-label">ÍCONE</div><input class="modal-input" id="mbox-icon" value="${escapeHtml(mbox.icon || "📦")}"></div>
        <div style="width:120px"><div class="modal-label">PREÇO (R$)</div><input class="modal-input" id="mbox-price" type="number" step="0.01" value="${mbox.price}"></div>
      </div>
      <div style="padding:0 4px"><div class="modal-label">DESCRIÇÃO (visível antes do pedido)</div><input class="modal-input" id="mbox-desc" value="${escapeHtml(mbox.desc || "")}" placeholder="Surpresa do chef — você descobre ao receber!"></div>
    </div>
    <div class="spec-summary">📦 <b>Conteúdo (oculto p/ o cliente):</b> ${compSummary(mbox.composicao)}</div>
    ${composeHtml(mbox.composicao, "spec-mbox-toggle")}`);
}

function toggle(comp, name) {
  const i = comp.findIndex((c) => c.name === name);
  if (i >= 0) comp.splice(i, 1);
  else { const it = findItem(name); comp.push({ name, icon: it?.icon || "🍔" }); }
}

async function loadAll() {
  setHtml("lancheDiaPanel", skeletonList(3));
  setHtml("mboxPanel", skeletonList(3));
  const [bs, ld, mb] = await Promise.all([loadBuildSteps(), loadLancheDia(), loadMbox()]);
  palette = bs.steps; dia = ld; mbox = mb;
  renderDia(); renderMbox();
}

// Lê os inputs do dia atual de volta para o state antes de trocar de aba/salvar.
function syncDiaInputs() {
  const d = dia.dias[activeDay]; if (!d) return;
  d.name = $("#dia-name")?.value.trim() ?? d.name;
  d.icon = $("#dia-icon")?.value.trim() || "🍔";
  d.desc = $("#dia-desc")?.value.trim() ?? d.desc;
  dia.price = parseFloat($("#dia-price")?.value) || dia.price;
}
function syncMboxInputs() {
  mbox.name = $("#mbox-name")?.value.trim() || "MBox Surpresa";
  mbox.icon = $("#mbox-icon")?.value.trim() || "📦";
  mbox.desc = $("#mbox-desc")?.value.trim() ?? mbox.desc;
  mbox.price = parseFloat($("#mbox-price")?.value) || mbox.price;
}

export function renderLancheDia() { if (!dia) loadAll(); else renderDia(); }
export function renderMboxAdmin() { if (!mbox) loadAll(); else renderMbox(); }

export function initSpecials() {
  onAction("spec-dia-day", (el) => { syncDiaInputs(); activeDay = el.dataset.day; renderDia(); });
  onAction("spec-dia-toggle", (el) => { toggle(dia.dias[activeDay].composicao ||= [], el.dataset.name); syncDiaInputs(); renderDia(); });
  onAction("spec-mbox-toggle", (el) => { toggle(mbox.composicao ||= [], el.dataset.name); syncMboxInputs(); renderMbox(); });

  onAction("spec-dia-save", async () => {
    syncDiaInputs();
    try { await saveLancheDia(dia); toastSuccess("Lanche do Dia salvo"); } catch { toastError("Falha ao salvar"); }
  });
  onAction("spec-mbox-save", async () => {
    syncMboxInputs();
    try { await saveMbox(mbox); toastSuccess("MBox salva"); } catch { toastError("Falha ao salvar"); }
  });
}
