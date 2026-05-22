/* ═══════════════════════════════════════════════════════════════
   REWARD SERVICE — recompensas e resgates
   collections: rewards, redemptions
   ═══════════════════════════════════════════════════════════════ */
import { addDoc, updateDoc, deleteDoc, getCollection, runTransaction, tsNow } from "../firebase/db.service.js";
import { adjustPoints } from "./points.service.js";

export function listRewards({ activeOnly = true } = {}) {
  const where = activeOnly ? [["active", "==", true]] : [];
  return getCollection("rewards", { where, orderBy: ["pointsRequired", "asc"] });
}

export async function createReward(data) {
  return addDoc("rewards", {
    name: data.name || "",
    description: data.description || "",
    pointsRequired: Number(data.pointsRequired) || 0,
    icon: data.icon || "🎁",
    active: data.active !== false,
    createdAt: tsNow(),
  });
}

export const updateReward = (id, partial) => updateDoc(`rewards/${id}`, partial);
export const removeReward = (id) => deleteDoc(`rewards/${id}`);

/**
 * Resgata uma recompensa: valida saldo, debita méritos e registra o resgate.
 * Lança "INSUFFICIENT_POINTS" se não houver saldo.
 */
export async function redeem(uid, reward) {
  await runTransaction(async (tx) => {
    const user = await tx.get(`users/${uid}`);
    if (!user) throw new Error("USER_NOT_FOUND");
    if ((user.points || 0) < reward.pointsRequired) throw new Error("INSUFFICIENT_POINTS");
  });

  await adjustPoints(uid, -reward.pointsRequired, `Resgate: ${reward.name}`);
  await addDoc("redemptions", {
    userId: uid,
    rewardId: reward.id,
    rewardName: reward.name,
    pointsSpent: reward.pointsRequired,
    status: "active",
    createdAt: tsNow(),
  });
}

export const listRedemptions = (uid) =>
  getCollection("redemptions", { where: [["userId", "==", uid]], orderBy: ["createdAt", "desc"] });
