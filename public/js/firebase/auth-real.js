/* ═══════════════════════════════════════════════════════════════
   AUTH REAL — wrapper sobre Firebase Authentication (email/senha)
   Espelha a interface de auth-demo.js.
   ═══════════════════════════════════════════════════════════════ */
import { getFirebase } from "../../firebase-config.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as fbSignOut, onAuthStateChanged, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const { auth } = await getFirebase();

const norm = (u) => (u ? { uid: u.uid, email: u.email } : null);

export function onAuthChanged(cb) {
  return onAuthStateChanged(auth, (u) => cb(norm(u)));
}

export async function signUp(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return norm(cred.user);
}

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return norm(cred.user);
}

export async function signOut() {
  await fbSignOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email.trim());
  return true;
}

export const currentUser = () => norm(auth.currentUser);
