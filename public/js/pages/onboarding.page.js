/* ═══════════════════════════════════════════════════════════════
   ONBOARDING PAGE — cadastro por convite (3 steps)
   Step 1 identidade · Step 2 endereço · Step 3 credenciais.
   Ao finalizar: signUp → consumeInvite → createProfile → enterApp → complete signup mission.
   ═══════════════════════════════════════════════════════════════ */
import { $, $$, onAction, show, escapeHtml } from "../utils/dom.js";
import { randomCodename, maskPhone, maskCep } from "../utils/format.js";
import * as auth from "../firebase/auth.service.js";
import { checkInvite, consumeInvite } from "../services/invite.service.js";
import { createProfile, getProfile } from "../services/user.service.js";
import { updateMissionProgress } from "../services/mission.service.js";
import { enterApp } from "../app/session.js";
import { toastSuccess } from "../components/toast.js";

const TOTAL = 3;
let step = 0;
let inviteCode = null;

export function setInviteContext(code) { inviteCode = code; step = 0; updateUI(); }

function updateUI() {
  $$(".onb-step").forEach((el, i) => el.classList.toggle("active", i === step));
  for (let i = 0; i < TOTAL; i++) {
    const dot = $("#onbDot" + i);
    if (!dot) continue;
    dot.classList.toggle("active", i === step);
    dot.classList.toggle("done", i < step);
  }
  for (let i = 0; i < TOTAL - 1; i++) {
    const fill = $("#onbLineFill" + i);
    if (fill) fill.style.width = i < step ? "100%" : "0";
  }
  show($("#onbBackBtn"), step > 0);
  $("#onbNextBtn").textContent = step === TOTAL - 1 ? "🔥 Entrar na Ordem" : "Próximo →";
  setError("");
  $$(".onb-input.error").forEach((el) => el.classList.remove("error"));
  if (step === TOTAL - 1) buildSummary();
}

function setError(msg) {
  const el = $("#onbError");
  if (!el) return;
  if (msg) { el.textContent = "⚠ " + msg; el.classList.add("show"); }
  else el.classList.remove("show");
}
const mark = (id) => $("#" + id)?.classList.add("error");
const val = (id) => ($("#" + id)?.value || "").trim();

function validate() {
  if (step === 0) {
    const codename = val("onbName");
    // Aceitar qualquer codinome válido (não vazio, não placeholder, mínimo 3 caracteres)
    if (!codename || codename === "—" || codename.length < 3) {
      return setError("Clique em GERAR para criar seu codinome"), false;
    }
    if (!val("onbRealName")) return mark("onbRealName"), setError("Preencha seu nome completo"), false;
    if (!val("onbEmail").includes("@")) return mark("onbEmail"), setError("Informe um e-mail válido"), false;
    if (val("onbPhone").replace(/\D/g, "").length < 10) return mark("onbPhone"), setError("Informe um telefone válido"), false;
  }
  if (step === 1) {
    if (val("onbCep").replace(/\D/g, "").length < 8) return mark("onbCep"), setError("Informe um CEP válido"), false;
    if (!val("onbStreet")) return mark("onbStreet"), setError("Informe a rua"), false;
    if (!val("onbNumber")) return mark("onbNumber"), setError("Informe o número"), false;
    if (!val("onbNeighborhood")) return mark("onbNeighborhood"), setError("Informe o bairro"), false;
  }
  if (step === 2) {
    if ($("#onbPass").value.length < 6) return mark("onbPass"), setError("A senha deve ter no mínimo 6 caracteres"), false;
    if ($("#onbPass").value !== $("#onbPass2").value) return mark("onbPass2"), setError("As senhas não coincidem"), false;
  }
  return true;
}

function buildSummary() {
  const rows = [
    ["CODINOME", val("onbName")],
    ["NOME", val("onbRealName")],
    ["E-MAIL", val("onbEmail")],
    ["TELEFONE", val("onbPhone")],
    ["ENDEREÇO", [val("onbStreet"), val("onbNumber"), val("onbComp")].filter(Boolean).join(", ")],
    ["BAIRRO", val("onbNeighborhood")],
    ["CEP", val("onbCep")],
  ];
  $("#onbSummary").innerHTML =
    `<div style="font-size:10px;letter-spacing:2px;color:var(--text-dim);font-family:var(--f-mono);margin-bottom:10px">RESUMO DO DOSSIÊ</div>` +
    rows.map(([l, v]) => `<div class="onb-summary-row"><span class="onb-summary-label">${l}</span><span class="onb-summary-val">${escapeHtml(v || "—")}</span></div>`).join("");
}

async function finish() {
  const email = val("onbEmail");
  const password = $("#onbPass").value;
  const codename = val("onbName");

  $("#onbNextBtn").disabled = true;
  try {
    // Primeiro validar o convite antes de criar o usuário
    const inviteCheck = await checkInvite(inviteCode);
    if (!inviteCheck.ok) {
      const messages = {
        "ALREADY_USED": "Convite já utilizado",
        "NOT_FOUND": "Convite não reconhecido",
        "EXPIRED": "Convite expirado (validade de 7 dias)"
      };
      setError(messages[inviteCheck.reason] || "Convite inválido");
      return;
    }

    const user = await auth.signUp(email, password);
    const invite = await consumeInvite(inviteCode, user.uid);
    
    // Buscar perfil do criador do convite para obter role e ID
    let invitedByRole = null;
    let invitedById = null;
    if (invite?.createdBy) {
      try {
        const creatorProfile = await getProfile(invite.createdBy);
        if (creatorProfile) {
          invitedByRole = creatorProfile.role;
          invitedById = creatorProfile.uid;
        }
      } catch (err) {
        console.error('Erro ao buscar perfil do criador:', err);
      }
    }
    
    const profile = await createProfile(user.uid, {
      name: val("onbRealName"),
      codename,
      email,
      phone: val("onbPhone"),
      address: {
        cep: val("onbCep"), street: val("onbStreet"), number: val("onbNumber"),
        comp: val("onbComp"), neighborhood: val("onbNeighborhood"),
      },
      invitedBy: invite?.createdBy || null,
      invitedByRole: invitedByRole,
      invitedById: invitedById,
      inviteId: inviteCode,
      role: invitedByRole === "admin" ? "agent" : "client", // Admins criam agentes, agentes criam clientes
    });
    
    // Complete signup mission
    try {
      await updateMissionProgress(user.uid, {
        signupCompleted: true,
        ordersCount: 0,
        points: 0,
        invitesUsed: 0,
        weekDays: 0,
        mboxCount: 0
      });
    } catch (missionError) {
      console.error('Erro ao completar missão de cadastro:', missionError);
      // Não bloquear o cadastro se a missão falhar
    }
    
    await enterApp(profile);
    toastSuccess("Bem-vindo à Ordem, " + codename + "!");
  } catch (err) {
    if (String(err.message).includes("INVITE")) {
      const messages = {
        "INVITE_NOT_FOUND": "Convite não encontrado",
        "INVITE_ALREADY_USED": "Convite já utilizado",
        "INVITE_EXPIRED": "Convite expirado (validade de 7 dias)"
      };
      setError(messages[err.message] || "Convite inválido");
    } else {
      setError(auth.authErrorMessage(err));
    }
  } finally {
    $("#onbNextBtn").disabled = false;
  }
}

function next() {
  if (!validate()) return;
  if (step < TOTAL - 1) { step++; updateUI(); } else finish();
}
function prev() { if (step > 0) { step--; updateUI(); } }

export function initOnboarding() {
  onAction("onb-gen-codename", () => {
    const el = $("#onbName");
    el.style.opacity = "0.3";
    el.textContent = randomCodename();
    setTimeout(() => (el.style.opacity = "1"), 150);
  });
  onAction("onb-next", () => next());
  onAction("onb-prev", () => prev());
  $("#onbPhone")?.addEventListener("input", (e) => maskPhone(e.target));
  $("#onbCep")?.addEventListener("input", (e) => maskCep(e.target));
}
