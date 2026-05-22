/* ═══════════════════════════════════════════════════════════════
   REWARD SERVICE — recompensas e resgates
   collections: rewards, redemptions
   ═══════════════════════════════════════════════════════════════ */
import { addDoc, updateDoc, deleteDoc, getCollection, runTransaction, tsNow } from "../firebase/db.service.js";
import { adjustPoints } from "./points.service.js";

export function listRewards({ activeOnly = true, category = null } = {}) {
  const where = activeOnly ? [["active", "==", true]] : [];
  if (category) {
    where.push(["category", "==", category]);
  }
  return getCollection("rewards", { where, orderBy: ["pointsRequired", "asc"] });
}

export async function createReward(data) {
  return addDoc("rewards", {
    name: data.name || "",
    description: data.description || "",
    pointsRequired: Number(data.pointsRequired) || 0,
    icon: data.icon || "🎁",
    category: data.category || "general",
    type: data.type || "physical", // physical, discount, benefit
    stock: data.stock !== undefined ? Number(data.stock) : null,
    active: data.active !== false,
    createdAt: tsNow(),
  });
}

export const updateReward = (id, partial) => updateDoc(`rewards/${id}`, partial);
export const removeReward = (id) => deleteDoc(`rewards/${id}`);

/**
 * Resgata uma recompensa: valida saldo, debita méritos e registra o resgate.
 * Lança "INSUFFICIENT_POINTS" se não houver saldo.
 * Lança "OUT_OF_STOCK" se não houver estoque.
 */
export async function redeem(uid, reward) {
  await runTransaction(async (tx) => {
    const user = await tx.get(`users/${uid}`);
    if (!user) throw new Error("USER_NOT_FOUND");
    if ((user.points || 0) < reward.pointsRequired) throw new Error("INSUFFICIENT_POINTS");
    
    // Verificar estoque se aplicável
    if (reward.type === "physical" && reward.stock !== null && reward.stock <= 0) {
      throw new Error("OUT_OF_STOCK");
    }
    
    // Atualizar estoque se aplicável
    if (reward.type === "physical" && reward.stock !== null) {
      tx.update(`rewards/${reward.id}`, {
        stock: reward.stock - 1
      });
    }
  });

  await adjustPoints(uid, -reward.pointsRequired, `Resgate: ${reward.name}`);
  await addDoc("redemptions", {
    userId: uid,
    rewardId: reward.id,
    rewardName: reward.name,
    rewardType: reward.type || "physical",
    pointsSpent: reward.pointsRequired,
    status: "active",
    category: reward.category || "general",
    createdAt: tsNow(),
  });
}

export const listRedemptions = (uid) =>
  getCollection("redemptions", { where: [["userId", "==", uid]], orderBy: ["createdAt", "desc"] });
