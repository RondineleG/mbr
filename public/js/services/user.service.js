/* ═══════════════════════════════════════════════════════════════
   USER SERVICE — perfil do agente (collection users)
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, setDoc, updateDoc, getCollection, watchDoc, tsNow } from "../firebase/db.service.js";
import { codenameSlug } from "../utils/format.js";

const path = (uid) => `users/${uid}`;
const cnPath = (slug) => `codenames/${slug}`;

/** Resolve um codinome → e-mail da conta (lookup público, lido só por ID).
 *  Usado no login/recuperação por codinome. Retorna null se não encontrar. */
export async function resolveCodename(codename) {
  const slug = codenameSlug(codename);
  if (!slug) return null;
  try { const doc = await getDoc(cnPath(slug)); return doc?.email || null; }
  catch { return null; }
}

/** Codinome já está em uso? (garante unicidade no cadastro, p/ login por codinome). */
export async function codenameTaken(codename) {
  const slug = codenameSlug(codename);
  if (!slug) return false;
  try { return !!(await getDoc(cnPath(slug))); } catch { return false; }
}

/** Garante o doc de lookup codinome→e-mail (criado no cadastro; backfill no login).
 *  Não sobrescreve o mapa de OUTRO agente — evita "roubo" de codinome. */
export async function ensureCodenameLookup({ uid, codename, email } = {}) {
  const slug = codenameSlug(codename);
  if (!slug || !email || !uid) return;
  try {
    const existing = await getDoc(cnPath(slug));
    if (existing && existing.uid && existing.uid !== uid) return; // já é de outro agente
    if (existing && existing.uid === uid && existing.email === email) return; // já atualizado
    await setDoc(cnPath(slug), { codename: String(codename || ""), email, uid });
  } catch (e) { console.warn("[user] lookup de codinome adiado:", e?.message || e); }
}

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
    role: data.role || "agent",      // agent, admin, client
    invitesAvailable: data.invitesAvailable || 0,
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
  const blocked = ["codename", "points", "level", "rank", "role", "uid", "createdAt", "invitedBy", "invitedByRole", "invitedById", "inviteId"];
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
