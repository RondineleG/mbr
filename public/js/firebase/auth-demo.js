/* ═══════════════════════════════════════════════════════════════
   AUTH DEMO — autenticação fake sobre localStorage
   Espelha a interface de auth.service. Senhas ficam só no navegador
   (modo demo); em produção o Firebase Auth cuida disso.
   ═══════════════════════════════════════════════════════════════ */

const USERS_KEY = "mrbur:auth:users";   // email -> { uid, password }
const SESSION_KEY = "mrbur:auth:session"; // { uid, email } | null

const readUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch { return {}; } };
const writeUsers = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));
const readSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } };
const uid = () => "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const authListeners = new Set();
function emit() { const s = readSession(); authListeners.forEach((fn) => fn(s)); }

export function onAuthChanged(cb) {
  authListeners.add(cb);
  cb(readSession());
  return () => authListeners.delete(cb);
}

export async function signUp(email, password) {
  email = email.toLowerCase().trim();
  const users = readUsers();
  if (users[email]) throw new Error("EMAIL_IN_USE");
  const user = { uid: uid(), password };
  users[email] = user;
  writeUsers(users);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ uid: user.uid, email }));
  emit();
  return { uid: user.uid, email };
}

export async function signIn(email, password) {
  email = email.toLowerCase().trim();
  const users = readUsers();
  const user = users[email];
  if (!user || user.password !== password) throw new Error("INVALID_CREDENTIALS");
  localStorage.setItem(SESSION_KEY, JSON.stringify({ uid: user.uid, email }));
  emit();
  return { uid: user.uid, email };
}

export async function signOut() {
  localStorage.removeItem(SESSION_KEY);
  emit();
}

export async function resetPassword(email) {
  // No demo apenas valida que o e-mail existe; nenhum e-mail é enviado.
  const users = readUsers();
  if (!users[email.toLowerCase().trim()]) throw new Error("USER_NOT_FOUND");
  return true;
}

export const currentUser = () => readSession();
