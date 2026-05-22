/* ═══════════════════════════════════════════════════════════════
   PRODUCT SERVICE — cardápio (collection products)
   Categorias: dia | mbox | acomp | bebidas | sobremesas
   (o "Monte Seu Lanche" é montado client-side a partir de constants)
   ═══════════════════════════════════════════════════════════════ */
import { addDoc, updateDoc, deleteDoc, getCollection, watchCollection, tsNow } from "../firebase/db.service.js";

/** Lista produtos (por padrão só ativos). */
export function listProducts({ category, activeOnly = true } = {}) {
  const where = [];
  if (category) where.push(["category", "==", category]);
  if (activeOnly) where.push(["active", "==", true]);
  return getCollection("products", { where });
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
    category: data.category || "acomp",
    image: data.image || "",
    icon: data.icon || "🍔",
    active: data.active !== false,
    featured: !!data.featured,
    createdAt: tsNow(),
  });
}

export const updateProduct = (id, partial) => updateDoc(`products/${id}`, partial);
export const toggleProduct = (id, active) => updateDoc(`products/${id}`, { active });
export const removeProduct = (id) => deleteDoc(`products/${id}`);
