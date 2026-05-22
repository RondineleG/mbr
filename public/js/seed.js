/* ═══════════════════════════════════════════════════════════════
   SEED — popula products, rewards e um convite demo.
   - Modo DEMO: roda automaticamente na 1ª carga (ensureSeed()).
   - Produção: rode no console autenticado como admin →  import("/js/seed.js").then(m=>m.seedAll())
   ═══════════════════════════════════════════════════════════════ */
import { getCollection, getDoc, setDoc, tsNow } from "./firebase/db.service.js";
import { IS_DEMO } from "../firebase-config.js";
import { rankFromPoints } from "./utils/format.js";

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

/** Cria/atualiza apenas o catálogo (products + rewards). Requer admin sob as regras. */
export async function seedCatalog() {
  for (const p of PRODUCTS) await setDoc(`products/${p.id}`, { ...p, createdAt: tsNow() });
  for (const r of REWARDS) await setDoc(`rewards/${r.id}`, { ...r, createdAt: tsNow() });
  console.info("[seed] catálogo (products + rewards) criado.");
}

/**
 * Cria um convite SE ele ainda não existir (não sobrescreve um já consumido,
 * o que violaria as Security Rules). Retorna o código.
 */
export async function seedInvite(code = DEMO_INVITE) {
  const existing = await getDoc(`invites/${code}`);
  if (existing) { console.info(`[seed] convite ${code} já existe — mantido.`); return code; }
  await setDoc(`invites/${code}`, { id: code, used: false, usedBy: null, createdBy: "seed", createdAt: tsNow() });
  console.info(`[seed] convite ${code} criado.`);
  return code;
}

/** Gera N convites aleatórios novos (para distribuir aos agentes). */
export async function seedRandomInvites(n = 3) {
  const codes = [];
  for (let i = 0; i < n; i++) {
    const code = "MRBUR-" + Math.random().toString(36).slice(2, 7).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    await setDoc(`invites/${code}`, { id: code, used: false, usedBy: null, createdBy: "seed", createdAt: tsNow() });
    codes.push(code);
  }
  console.info("[seed] convites gerados:", codes);
  return codes;
}

/** Agentes de exemplo (um por nível) — só docs de perfil, sem conta de login.
    Servem para popular ranking e a tela de Agentes do admin. */
const SAMPLE_AGENTS = [
  { codename: "falcao-dourado",  name: "Agente Ômega",  points: 6200 },
  { codename: "cobra-prime",     name: "Agente Sigma",  points: 3800 },
  { codename: "lobo-cipher",     name: "Agente Delta",  points: 2100 },
  { codename: "pantera-negra",   name: "Agente Gama",   points: 950 },
  { codename: "coruja-stealth",  name: "Agente Beta",   points: 420 },
  { codename: "raposa-zero",     name: "Agente Alfa",   points: 80 },
];

export async function seedSampleAgents() {
  for (const a of SAMPLE_AGENTS) {
    const r = rankFromPoints(a.points);
    const uid = "seed-" + a.codename;
    await setDoc(`users/${uid}`, {
      uid, name: a.name, codename: a.codename, email: `${a.codename}@mrbur.demo`,
      phone: "", address: {}, points: a.points, level: r.level, rank: r.name,
      role: "agent", invitesAvailable: 0, invitedBy: null, createdAt: tsNow(), lastLogin: tsNow(),
    });
  }
  console.info("[seed] agentes de exemplo criados (por nível).");
}

/** Promove (ou cria) o doc do usuário informado como admin, preservando o que já existir. */
export async function seedAdminProfile(adminUid, email = "") {
  const existing = (await getDoc(`users/${adminUid}`)) || {};
  await setDoc(`users/${adminUid}`, {
    name: existing.name || "Comando da Ordem",
    codename: existing.codename || "comando-supremo",
    email: existing.email || email,
    phone: existing.phone || "",
    address: existing.address || {},
    points: existing.points || 0,
    level: existing.level || 1,
    rank: existing.rank || "MESTRE",
    invitesAvailable: 99,
    createdAt: existing.createdAt || tsNow(),
    uid: adminUid,
    role: "admin",
    lastLogin: tsNow(),
  });
  console.info("[seed] admin definido para uid:", adminUid);
}

/** Seed completo: catálogo + convites + agentes de exemplo + (opcional) admin. */
export async function seedEverything(adminUid = null, adminEmail = "") {
  await seedCatalog();
  await seedSampleAgents();
  await seedInvite(DEMO_INVITE);
  await seedRandomInvites(4);
  if (adminUid) await seedAdminProfile(adminUid, adminEmail);
  console.info("[seed] seed COMPLETO concluído.");
}

/** Seed completo: catálogo + convite demo (se ainda não existir). */
export async function seedAll() {
  await seedCatalog();
  await seedInvite(DEMO_INVITE);
}

/** Só semeia no modo demo e apenas se ainda não houver produtos. */
export async function ensureSeed() {
  if (!IS_DEMO) return;
  const existing = await getCollection("products");
  if (existing.length === 0) await seedAll();
}

export { DEMO_INVITE };
