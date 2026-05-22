/* ═══════════════════════════════════════════════════════════════
   AUTH SERVICE — fachada única de autenticação
   Escolhe Firebase Auth (real) ou demo conforme IS_DEMO.
   Normaliza códigos de erro do Firebase para mensagens em PT-BR.
   ═══════════════════════════════════════════════════════════════ */
import { IS_DEMO } from "../../firebase-config.js";
import { info, debug, warn, error } from "../utils/logger.js";

const impl = IS_DEMO
  ? await import("./auth-demo.js")
  : await import("./auth-real.js");

info('AUTH', `Using ${IS_DEMO ? 'DEMO' : 'REAL'} authentication implementation`);

export const onAuthChanged = (callback) => {
  debug('AUTH', 'Setting up auth change observer');
  return impl.onAuthChanged((user) => {
    debug('AUTH', `Auth state changed: ${user ? 'User logged in' : 'User logged out'}`);
    callback(user);
  });
};

export const currentUser = () => {
  const user = impl.currentUser();
  debug('AUTH', `Current user check: ${user ? 'User exists' : 'No user'}`);
  return user;
};

export const signUp = async (email, password) => {
  debug('AUTH', `Sign up attempt for: ${email}`);
  try {
    const result = await impl.signUp(email, password);
    info('AUTH', `Sign up successful for: ${email}`);
    return result;
  } catch (err) {
    error('AUTH', 'Sign up failed', err, { email });
    throw err;
  }
};

export const signIn = async (email, password) => {
  debug('AUTH', `Sign in attempt for: ${email}`);
  try {
    const result = await impl.signIn(email, password);
    info('AUTH', `Sign in successful for: ${email}`);
    return result;
  } catch (err) {
    warn('AUTH', 'Sign in failed', err, { email });
    throw err;
  }
};

export const signOut = async () => {
  debug('AUTH', 'Sign out attempt');
  try {
    await impl.signOut();
    info('AUTH', 'Sign out successful');
  } catch (err) {
    error('AUTH', 'Sign out failed', err);
    throw err;
  }
};

export const resetPassword = async (email) => {
  debug('AUTH', `Password reset attempt for: ${email}`);
  try {
    await impl.resetPassword(email);
    info('AUTH', `Password reset email sent to: ${email}`);
  } catch (err) {
    error('AUTH', 'Password reset failed', err, { email });
    throw err;
  }
};

/** Converte erro técnico (Firebase/demo) em mensagem amigável da Ordem. */
export function authErrorMessage(err) {
  const code = err?.code || err?.message || "";
  const map = {
    "auth/operation-not-allowed": "Ative 'E-mail/Senha' em Authentication → Sign-in method no console",
    "OPERATION_NOT_ALLOWED": "Ative 'E-mail/Senha' em Authentication → Sign-in method no console",
    "auth/invalid-credential": "Credenciais inválidas",
    "auth/invalid-email": "E-mail inválido",
    "auth/user-not-found": "Agente não encontrado",
    "auth/wrong-password": "Senha incorreta",
    "auth/email-already-in-use": "Este e-mail já está registrado — use o login",
    "EMAIL_EXISTS": "Este e-mail já está registrado — use o login",
    "auth/weak-password": "Senha muito fraca (mínimo 6 caracteres)",
    "auth/too-many-requests": "Muitas tentativas — aguarde um momento",
    "auth/network-request-failed": "Falha de rede (verifique adblock/conexão)",
    "CONFIGURATION_NOT_FOUND": "Projeto sem Authentication configurado",
    INVALID_CREDENTIALS: "Credenciais inválidas",
    EMAIL_IN_USE: "Este e-mail já está registrado",
    USER_NOT_FOUND: "Agente não encontrado",
  };
  for (const key of Object.keys(map)) if (code.includes(key)) return map[key];
  return "Falha na operação — tente novamente";
}
