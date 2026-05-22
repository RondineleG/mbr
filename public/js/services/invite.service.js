/* ═══════════════════════════════════════════════════════════════
   INVITE SERVICE — gate de convites (collection invites)
   doc id = código do convite (uppercase). { used, usedBy, createdBy, createdAt }
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, addDoc, getCollection, runTransaction, tsNow } from "../firebase/db.service.js";

const norm = (code) => (code || "").toUpperCase().trim();

/** Verifica se um código existe e ainda não foi usado (pré-validação na UI). */
export async function checkInvite(code) {
  const invite = await getDoc(`invites/${norm(code)}`);
  if (!invite) return { ok: false, reason: "NOT_FOUND" };
  if (invite.used) return { ok: false, reason: "ALREADY_USED" };
  return { ok: true, invite };
}

/**
 * Consome o convite atomicamente, vinculando-o ao uid recém-criado.
 * Deve rodar logo após o signup. Lança em caso de convite inválido.
 */
export async function consumeInvite(code, uid) {
  const id = norm(code);
  return runTransaction(async (tx) => {
    const invite = await tx.get(`invites/${id}`);
    if (!invite) throw new Error("INVITE_NOT_FOUND");
    if (invite.used) throw new Error("INVITE_ALREADY_USED");
    tx.update(`invites/${id}`, { used: true, usedBy: uid, usedAt: tsNow() });
    return invite;
  });
}

/** Cria um convite (admin ou indicação). */
export async function createInvite(code, createdBy = null) {
  const id = norm(code) || ("MRBUR-" + Math.random().toString(36).slice(2, 7).toUpperCase());
  await addDoc("invites", { id, used: false, usedBy: null, createdBy, createdAt: tsNow() });
  return id;
}

export const listInvites = () => getCollection("invites", { orderBy: ["createdAt", "desc"] });
