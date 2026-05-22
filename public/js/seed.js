/* ═══════════════════════════════════════════════════════════════
   SEED — popula products, rewards e um convite demo.
   - Modo DEMO: roda automaticamente na 1ª carga (ensureSeed()).
   - Produção: rode no console autenticado como admin →  import("/js/seed.js").then(m=>m.seedAll())
   ═══════════════════════════════════════════════════════════════ */
import { getCollection, setDoc, tsNow } from "./firebase/db.service.js";
import { IS_DEMO } from "../firebase-config.js";

const PRODUCTS = [
  // category: dia
  { id: "p-dia-1", name: "Lanche Classificado", description: "Receita secreta do dia — só descobre quem pedir.", price: 29.9, category: "dia", icon: "🕵️", tag: "LIMITADO · 20/DIA", featured: true, active: true },
  { id: "p-dia-2", name: "Combo Infiltrado", description: "Lanche do dia + batata temperada + bebida à escolha.", price: 44.9, category: "dia", icon: "📋", tag: "COMBO", active: true },
  // category: mbox
  { id: "p-mbox-1", name: "MBox Mistério", description: "Hambúrguer exclusivo + bebida + acompanhamento + sobremesa + colecionável surpresa.", price: 75.0, category: "mbox", icon: "📦", tag: "SÓ SÁBADO · 50 UN.", active: true },
  { id: "p-mbox-2", name: "MBox Dupla", description: "2 MBox para compartilhar a experiência secreta com um aliado.", price: 140.0, category: "mbox", icon: "📦", tag: "SÓ SÁBADO", active: true },
  // category: acomp
  { id: "p-ac-1", name: "Batata da Ordem", description: "Frita com tempero secreto", price: 18.9, category: "acomp", icon: "🍟", active: true },
  { id: "p-ac-2", name: "Onion Rings Cipher", description: "Empanados com molho ranch", price: 22.9, category: "acomp", icon: "🧅", active: true },
  { id: "p-ac-3", name: "Nuggets Stealth", description: "8 un. com 3 molhos", price: 24.9, category: "acomp", icon: "🍗", active: true },
  { id: "p-ac-4", name: "Loaded Fries Intel", description: "Batata + cheddar + bacon + cebolinha", price: 28.9, category: "acomp", icon: "🧀", active: true },
  // category: bebidas
  { id: "p-be-1", name: "Soda Classified", description: "Refrigerante lata 350ml", price: 7.9, category: "bebidas", icon: "🥫", active: true },
  { id: "p-be-2", name: "Suco Operativo", description: "Natural 500ml (laranja/limão/maracujá)", price: 12.9, category: "bebidas", icon: "🧃", active: true },
  { id: "p-be-3", name: "Milkshake Phantom", description: "500ml (choc/morango/baunilha/Ovomaltine)", price: 19.9, category: "bebidas", icon: "🥤", active: true },
  { id: "p-be-4", name: "Água da Fonte", description: "Mineral 500ml", price: 4.9, category: "bebidas", icon: "💧", active: true },
  // category: sobremesas
  { id: "p-so-1", name: "Brownie Black Ops", description: "Com calda de chocolate e sorvete", price: 16.9, category: "sobremesas", icon: "🍫", active: true },
  { id: "p-so-2", name: "Cookie Encrypted", description: "Artesanal com gotas de chocolate", price: 9.9, category: "sobremesas", icon: "🍪", active: true },
  { id: "p-so-3", name: "Petit Gateau Covert", description: "Centro derretido + sorvete", price: 22.9, category: "sobremesas", icon: "🎂", active: true },
];

const REWARDS = [
  { id: "r-1", name: "Frete Grátis", description: "Em qualquer pedido", pointsRequired: 500, icon: "🚚", active: true },
  { id: "r-2", name: "Burger Grátis", description: "Smash burger clássico", pointsRequired: 1500, icon: "🍔", active: true },
  { id: "r-3", name: "Combo VIP", description: "Burger + Batata + Bebida", pointsRequired: 3000, icon: "📦", active: true },
  { id: "r-4", name: "MBox Surpresa", description: "Uma MBox mistério por nossa conta", pointsRequired: 5000, icon: "🎁", active: true },
];

const DEMO_INVITE = "MRBUR-GENESIS-X7K9";

export async function seedAll() {
  for (const p of PRODUCTS) await setDoc(`products/${p.id}`, { ...p, createdAt: tsNow() });
  for (const r of REWARDS) await setDoc(`rewards/${r.id}`, { ...r, createdAt: tsNow() });
  await setDoc(`invites/${DEMO_INVITE}`, { id: DEMO_INVITE, used: false, usedBy: null, createdBy: "seed", createdAt: tsNow() });
  console.info("[seed] products, rewards e convite demo criados.");
}

/** Só semeia no modo demo e apenas se ainda não houver produtos. */
export async function ensureSeed() {
  if (!IS_DEMO) return;
  const existing = await getCollection("products");
  if (existing.length === 0) await seedAll();
}

export { DEMO_INVITE };
