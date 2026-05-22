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
    metiqos: 0,                       // moeda virtual
    level: 1,
    rank: "EXPLORADOR",
    role: data.role || "agent",      // agent, admin, client
    invitesAvailable: 0,
    invitedBy: data.invitedBy || null,
    invitedByRole: data.invitedByRole || null,
    invitedById: data.invitedById || null,
    inviteId: data.inviteId || null,
    createdAt: tsNow(),
    lastLogin: tsNow(),
  };
  await setDoc(path(uid), profile);
  return profile;
}

/** Atualiza campos editáveis. Bloqueia alteração de codinome, pontos e role. */
export async function updateProfile(uid, partial) {
  const blocked = ["codename", "points", "metiqos", "level", "rank", "role", "uid", "createdAt", "invitedBy", "invitedByRole", "invitedById", "inviteId"];
  const safe = Object.fromEntries(Object.entries(partial).filter(([k]) => !blocked.includes(k)));
  await updateDoc(path(uid), safe);
}

export const touchLogin = (uid) => updateDoc(path(uid), { lastLogin: tsNow() }).catch(() => {});

/** Verifica se o perfil é admin */
export const isAdmin = (profile) => profile?.role === "admin";

/** Verifica se o perfil é agente */
export const isAgent = (profile) => profile?.role === "agent";

/** Verifica se o perfil é cliente */
export const isClient = (profile) => profile?.role === "client";

/** Verifica se o usuário tem permissão baseada em roles */
export const hasRole = (profile, roles) => {
  if (!profile || !profile.role) return false;
  if (Array.isArray(roles)) return roles.includes(profile.role);
  return profile.role === roles;
};

/** Lista agentes para ranking/clientes (admin). */
export async function listAgents() {
  const users = await getCollection("users", { orderBy: ["points", "desc"] });
  return users.filter((u) => u.role !== "admin" || true); // inclui todos; admin filtra na UI se quiser
}

/** Lista usuários por role */
export async function listUsersByRole(role) {
  const users = await getCollection("users");
  return users.filter((u) => u.role === role);
}

/** Lista usuários vinculados a um agente específico */
export async function listUsersByAgent(agentId) {
  const users = await getCollection("users");
  return users.filter((u) => u.invitedById === agentId);
}
