/* ═══════════════════════════════════════════════════════════════
   AUTH SERVICE — fachada única de autenticação
   Escolhe Firebase Auth (real) ou demo conforme IS_DEMO.
   Normaliza códigos de erro do Firebase para mensagens em PT-BR.
   ═══════════════════════════════════════════════════════════════ */
import { IS_DEMO } from "../../firebase-config.js";

const impl = IS_DEMO
  ? await import("./auth-demo.js")
  : await import("./auth-real.js");

export const onAuthChanged = impl.onAuthChanged;
export const currentUser = impl.currentUser;
export const signUp = impl.signUp;
export const signIn = impl.signIn;
export const signOut = impl.signOut;
export const resetPassword = impl.resetPassword;

/** Converte erro técnico (Firebase/demo) em mensagem amigável da Ordem. */
export function authErrorMessage(err) {
  const code = err?.code || err?.message || "";
  const map = {
    "auth/invalid-credential": "Credenciais inválidas",
    "auth/invalid-email": "E-mail inválido",
    "auth/user-not-found": "Agente não encontrado",
    "auth/wrong-password": "Senha incorreta",
    "auth/email-already-in-use": "Este e-mail já está registrado",
    "auth/weak-password": "Senha muito fraca (mínimo 6 caracteres)",
    "auth/too-many-requests": "Muitas tentativas — aguarde um momento",
    INVALID_CREDENTIALS: "Credenciais inválidas",
    EMAIL_IN_USE: "Este e-mail já está registrado",
    USER_NOT_FOUND: "Agente não encontrado",
  };
  for (const key of Object.keys(map)) if (code.includes(key)) return map[key];
  return "Falha na operação — tente novamente";
}
