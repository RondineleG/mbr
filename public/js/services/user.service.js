/* ═══════════════════════════════════════════════════════════════
   USER SERVICE — perfil do agente (collection users)
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, setDoc, updateDoc, getCollection, watchDoc, tsNow } from "../firebase/db.service.js";

const path = (uid) => `users/${uid}`;

export const getProfile = (uid) => getDoc(path(uid));
export const watchProfile = (uid, cb) => watchDoc(path(uid), cb);

/** Cria o documento do agente no primeiro acesso (onboarding). */
export async function createProfile(uid, data) {
  const profile = {
    uid,
    name: data.name || "",
    codename: data.codename || "",   // permanente — nunca atualizado
    email: data.email || "",
    phone: data.phone || "",
    address: data.address || {},
    points: 0,
    level: 1,
    rank: "EXPLORADOR",
    role: "agent",
    invitesAvailable: 0,
    invitedBy: data.invitedBy || null,
    createdAt: tsNow(),
    lastLogin: tsNow(),
  };
  await setDoc(path(uid), profile);
  return profile;
}

/** Atualiza campos editáveis. Bloqueia alteração de codinome e pontos. */
export async function updateProfile(uid, partial) {
  const blocked = ["codename", "points", "level", "rank", "role", "uid", "createdAt"];
  const safe = Object.fromEntries(Object.entries(partial).filter(([k]) => !blocked.includes(k)));
  await updateDoc(path(uid), safe);
}

export const touchLogin = (uid) => updateDoc(path(uid), { lastLogin: tsNow() }).catch(() => {});

export const isAdmin = (profile) => profile?.role === "admin";

/** Lista agentes para ranking/clientes (admin). */
export async function listAgents() {
  const users = await getCollection("users", { orderBy: ["points", "desc"] });
  return users.filter((u) => u.role !== "admin" || true); // inclui todos; admin filtra na UI se quiser
}
