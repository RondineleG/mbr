/* ═══════════════════════════════════════════════════════════════
   PERFIL PAGE — dados do agente, edição (modal), tema e logout
   Codinome é PERMANENTE (não editável).
   ═══════════════════════════════════════════════════════════════ */
import { onAction, setText, setHtml } from "../utils/dom.js";
import * as store from "../app/state.js";
import { codenameInitials, rankLabel, formatAddress, rankFromPoints } from "../utils/format.js";
import { updateProfile } from "../services/user.service.js";
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
  store.subscribe("profile", () => { if (store.get("page") === "perfil") renderProfile(); });
  store.subscribe("orders", () => { if (store.get("page") === "perfil") renderProfile(); });
}

export { toggleTheme };
