/* ═══════════════════════════════════════════════════════════════
   PRODUCT SERVICE — cardápio (collection products)
   Categorias: dia | mbox | acomp | bebidas | sobremesas
   (o "Monte Seu Lanche" é montado client-side a partir de constants)
   
   Produtos podem ser:
   - Compráveis com dinheiro (price > 0)
   - Compráveis com méritos (pointsRequired > 0)
   - Gratuitos (price = 0 e pointsRequired = 0)
   ═══════════════════════════════════════════════════════════════ */
import { addDoc, updateDoc, deleteDoc, getCollection, watchCollection, tsNow } from "../firebase/db.service.js";

/** Lista produtos (por padrão só ativos). */
export function listProducts({ category, activeOnly = true } = {}) {
  const where = [];
  if (category) where.push(["category", "==", category]);
  if (activeOnly) where.push(["active", "==", true]);
  return getCollection("products", { where });
}

/** Lista produtos que podem ser comprados com méritos */
export function listPointsProducts({ activeOnly = true } = {}) {
  const where = [["pointsRequired", ">", 0]];
  if (activeOnly) where.push(["active", "==", true]);
  return getCollection("products", { where, orderBy: ["pointsRequired", "asc"] });
}

/** Observa todos os produtos (admin / catálogo realtime). */
export function watchProducts(cb) {
  return watchCollection("products", {}, cb);
}

export async function createProduct(data) {
  return addDoc("products", {
    name: data.name || "",
    description: data.description || "",
    price: Number(data.price) || 0,
    pointsRequired: Number(data.pointsRequired) || 0,
    category: data.category || "acomp",
    image: data.image || "",
    icon: data.icon || "🍔",
    active: data.active !== false,
    featured: !!data.featured,
    exclusiveToPoints: !!data.exclusiveToPoints, // Só pode ser comprado com méritos
    stock: data.stock !== undefined ? Number(data.stock) : null,
    createdAt: tsNow(),
  });
}

export const updateProduct = (id, partial) => updateDoc(`products/${id}`, partial);
export const toggleProduct = (id, active) => updateDoc(`products/${id}`, { active });
export const removeProduct = (id) => deleteDoc(`products/${id}`);

/**
 * Compra um produto com méritos
 * Valida saldo, debita méritos e atualiza estoque se aplicável
 */
export async function buyWithPoints(uid, product) {
  const { runTransaction } = await import("../firebase/db.service.js");
  const { adjustPoints } = await import("./points.service.js");
  
  await runTransaction(async (tx) => {
    const user = await tx.get(`users/${uid}`);
    if (!user) throw new Error("USER_NOT_FOUND");
    
    const userPoints = user.points || 0;
    if (userPoints < product.pointsRequired) {
      throw new Error("INSUFFICIENT_POINTS");
    }
    
    // Verificar estoque se aplicável
    if (product.exclusiveToPoints && product.stock !== null && product.stock <= 0) {
      throw new Error("OUT_OF_STOCK");
    }
    
    // Debitar pontos
    tx.update(`users/${uid}`, {
      points: userPoints - product.pointsRequired
    });
    
    // Atualizar estoque se aplicável
    if (product.exclusiveToPoints && product.stock !== null) {
      tx.update(`products/${product.id}`, {
        stock: product.stock - 1
      });
    }
  });
  
  // Registrar transação
  const { addDoc, tsNow } = await import("../firebase/db.service.js");
  await addDoc("pointTransactions", {
    userId: uid,
    amount: -product.pointsRequired,
    description: `Compra: ${product.name}`,
    type: "purchase",
    productId: product.id,
    productName: product.name,
    createdAt: tsNow()
  });
  
  return { success: true, pointsSpent: product.pointsRequired };
}
