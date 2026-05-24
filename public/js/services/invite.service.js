/* ═══════════════════════════════════════════════════════════════
   INVITE SERVICE — gate de convites (collection invites)
   doc id = código do convite (uppercase). 
   { id, token, createdBy, roleCreator, emailDestino, status, dataCriacao, 
     dataExpiracao, dataUso, usadoPor, limiteUso, totalUsos }
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, addDoc, updateDoc, getCollection, runTransaction, tsNow } from "../firebase/db.service.js";

const norm = (code) => (code || "").toUpperCase().trim();

/** Verifica se um código existe e ainda não foi usado (pré-validação na UI). */
export async function checkInvite(code) {
  const normalizedCode = norm(code);
  
  // Tenta buscar pelo código como ID (novo formato)
  let invite = await getDoc(`invites/${normalizedCode}`);
  
  // Se não encontrar, busca por campo 'code' (formato antigo compatível)
  if (!invite) {
    const invites = await getCollection("invites", { 
      where: [["code", "==", normalizedCode]] 
    });
    invite = invites.length > 0 ? invites[0] : null;
  }
  
  if (!invite) return { ok: false, reason: "NOT_FOUND" };
  
  // Normalizar status para compatibilidade
  const status = invite.status || "ativo";
  const isUsed = status === "usado" || status === "used";
  const isCancelled = status === "cancelado" || status === "cancelled" || status === "revoked";
  const isActive = status === "ativo" || status === "active" || status === "available";
  
  // Verificar status
  if (isUsed) return { ok: false, reason: "ALREADY_USED" };
  if (isCancelled) return { ok: false, reason: "CANCELLED" };
  
  // Verificar expiração (suporta ambos os formatos de data)
  const expiresAt = invite.dataExpiracao || invite.expiresAt;
  if (expiresAt) {
    const now = Date.now();
    const expiryTime = expiresAt.toDate ? expiresAt.toDate().getTime() : 
                      (expiresAt._seconds ? expiresAt._seconds * 1000 : expiresAt);
    if (now > expiryTime) {
      // Atualizar status para expirado
      const docId = invite.id || normalizedCode;
      await updateDoc(`invites/${docId}`, { status: "expirado" });
      return { ok: false, reason: "EXPIRED" };
    }
  }
  
  return { ok: true, invite };
}

/**
 * Consome o convite atomicamente, vinculando-o ao uid recém-criado.
 * Deve rodar logo após o signup. Lança em caso de convite inválido.
 */
export async function consumeInvite(code, uid) {
  const normalizedCode = norm(code);
  
  return runTransaction(async (tx) => {
    // Tenta buscar pelo código como ID (novo formato)
    let invite = await tx.get(`invites/${normalizedCode}`);
    let docId = normalizedCode;
    
    // Se não encontrar, busca por campo 'code' (formato antigo compatível)
    if (!invite) {
      const invites = await getCollection("invites", { 
        where: [["code", "==", normalizedCode]] 
      });
      if (invites.length > 0) {
        invite = invites[0];
        docId = invite.id;
      }
    }
    
    if (!invite) throw new Error("INVITE_NOT_FOUND");
    
    // Normalizar status para compatibilidade
    const status = invite.status || "ativo";
    const isUsed = status === "usado" || status === "used";
    const isCancelled = status === "cancelado" || status === "cancelled" || status === "revoked";
    const isExpired = status === "expirado" || status === "expired";
    
    // Verificar status
    if (isUsed) throw new Error("INVITE_ALREADY_USED");
    if (isCancelled) throw new Error("INVITE_CANCELLED");
    if (isExpired) throw new Error("INVITE_EXPIRED");
    
    // Verificar expiração novamente no transaction (suporta ambos os formatos)
    const expiresAt = invite.dataExpiracao || invite.expiresAt;
    if (expiresAt) {
      const now = Date.now();
      const expiryTime = expiresAt.toDate ? expiresAt.toDate().getTime() : 
                        (expiresAt._seconds ? expiresAt._seconds * 1000 : expiresAt);
      if (now > expiryTime) {
        tx.update(`invites/${docId}`, { status: "expirado" });
        throw new Error("INVITE_EXPIRED");
      }
    }
    
    // Verificar limite de uso (suporta ambos os formatos)
    const limiteUso = invite.limiteUso || invite.maxUses || 1;
    const totalUsos = (invite.totalUsos || invite.usesCount || 0) + 1;
    if (totalUsos > limiteUso) {
      throw new Error("INVITE_LIMIT_REACHED");
    }
    
    // Atualizar com campos normalizados
    tx.update(`invites/${docId}`, { 
      status: "usado", 
      usadoPor: uid, 
      dataUso: tsNow(),
      totalUsos,
      // Atualizar campos antigos também para compatibilidade
      usesCount: totalUsos
    });
    
    // Retornar dados normalizados
    return {
      ...invite,
      id: docId,
      createdBy: invite.criadoPor || invite.createdBy,
      roleCreator: invite.roleCriador || invite.roleCreator
    };
  });
}

/** Cria um convite (admin ou indicação) com expiração de 7 dias. */
export async function createInvite(data) {
  const code = norm(data.code) || ("MRBUR-" + Math.random().toString(36).slice(2, 7).toUpperCase());
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  const invite = {
    id: code,
    token: code,
    criadoPor: data.createdBy || null,
    roleCriador: data.roleCreator || null,
    emailDestino: data.emailDestino || null,
    status: "ativo",
    dataCriacao: tsNow(),
    dataExpiracao: expiresAt, // Salvar como objeto Date (Firestore converte para Timestamp)
    dataUso: null,
    usadoPor: null,
    limiteUso: data.limiteUso || 1,
    totalUsos: 0
  };

  await addDoc("invites", invite);
  return code;
}

/** Cancela um convite */
export async function cancelInvite(code) {
  await updateDoc(`invites/${norm(code)}`, { status: "cancelado" });
}

/** Lista convites com filtros */
export async function listInvites(filters = {}) {
  const invites = await getCollection("invites", { orderBy: ["dataCriacao", "desc"] });
  
  if (filters.status) {
    return invites.filter((i) => i.status === filters.status);
  }
  
  if (filters.createdBy) {
    return invites.filter((i) => i.criadoPor === filters.createdBy);
  }
  
  return invites;
}

/** Obtém estatísticas de convites */
export async function getInviteStats(createdBy = null) {
  const invites = await listInvites(createdBy ? { createdBy } : {});
  
  return {
    totalEnviados: invites.length,
    totalUsados: invites.filter((i) => i.status === "usado").length,
    totalExpirados: invites.filter((i) => i.status === "expirado").length,
    totalCancelados: invites.filter((i) => i.status === "cancelado").length,
    totalAtivos: invites.filter((i) => i.status === "ativo").length,
    taxaConversao: invites.length > 0 
      ? Math.round((invites.filter((i) => i.status === "usado").length / invites.length) * 100) 
      : 0
  };
}
