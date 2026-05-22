/* ═══════════════════════════════════════════════════════════════
   LOGIN PAGE — abas Agente (email/senha) e Convite (gate Firestore)
   ═══════════════════════════════════════════════════════════════ */
import { $, onAction, show } from "../utils/dom.js";
import * as auth from "../firebase/auth.service.js";
import { checkInvite } from "../services/invite.service.js";
import { showOnboarding } from "../app/session.js";
import { setInviteContext } from "./onboarding.page.js";
import { modalPrompt } from "../components/modal.js";
import { toastSuccess } from "../components/toast.js";

let mode = "agent";

function setError(msg) {
  const el = $("#loginError");
  if (!el) return;
  if (msg) { el.textContent = "⚠ " + msg; el.classList.add("show"); }
  else el.classList.remove("show");
}

function switchTab(next) {
  mode = next;
  $("#loginTabAgent")?.classList.toggle("active", next === "agent");
  $("#loginTabInvite")?.classList.toggle("active", next === "invite");
  show($("#loginAgent"), next === "agent");
  show($("#loginInvite"), next === "invite");
  setError("");
}

async function doLogin(btn) {
  setError("");
  if (mode === "agent") {
    const email = $("#loginEmail").value.trim();
    const pass = $("#loginPass").value;
    if (!email || !pass) return setError("Preencha e-mail e senha");
    btn.disabled = true;
    try {
      await auth.signIn(email, pass); // session.js reage e entra no app
    } catch (err) {
      setError(auth.authErrorMessage(err));
    } finally { btn.disabled = false; }
  } else {
    const code = $("#loginCode").value.trim().toUpperCase();
    if (!code) return setError("Informe o código do convite");
    btn.disabled = true;
    try {
      const res = await checkInvite(code);
      if (!res.ok) {
        const messages = {
          "ALREADY_USED": "Convite já utilizado",
          "NOT_FOUND": "Convite não reconhecido",
          "EXPIRED": "Convite expirado (validade de 7 dias)",
          "CANCELLED": "Convite cancelado pelo criador"
        };
        setError(messages[res.reason] || "Convite inválido");
        return;
      }
      setInviteContext(code);
      showOnboarding();
    } catch {
      setError("Falha ao validar convite — tente novamente");
    } finally { btn.disabled = false; }
  }
}

async function forgotPassword() {
  const email = await modalPrompt({
    title: "Recuperar acesso",
    label: "E-MAIL DO AGENTE",
    type: "email",
    placeholder: "seu@email.com",
    value: $("#loginEmail")?.value || "",
  });
  if (!email) return;
  try {
    await auth.resetPassword(email);
    toastSuccess("Instruções enviadas para " + email);
  } catch (err) {
    setError(auth.authErrorMessage(err));
  }
}

export function initLogin() {
  onAction("login-tab", (el) => switchTab(el.dataset.mode));
  onAction("do-login", (el) => doLogin(el));
  onAction("forgot-password", () => forgotPassword());

  // Enter dispara login.
  ["loginEmail", "loginPass", "loginCode"].forEach((id) => {
    $("#" + id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin($("#loginBtn"));
    });
  });
}
