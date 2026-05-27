/* ═══════════════════════════════════════════════════════════════
   SEED — popula products, rewards e um convite demo.
   - Modo DEMO: roda automaticamente na 1ª carga (ensureSeed()).
   - Produção: rode no console autenticado como admin →  import("/js/seed.js").then(m=>m.seedAll())
   ═══════════════════════════════════════════════════════════════ */
import { getCollection, getDoc, setDoc, tsNow } from "./firebase/db.service.js";
import { IS_DEMO } from "../firebase-config.js";
import { rankFromPoints } from "./utils/format.js";

const PRODUCTS = [
  // category: dia — o "Lanche do Dia" em si vem de config/lancheDia (configurável).
  //              Aqui fica só o combo (sem méritos).
  { id: "p-dia-2", name: "Combo do Dia", description: "Lanche do dia + batata temperada + bebida à escolha.", price: 44.9, category: "dia", icon: "📋", tag: "COMBO", noMeritos: true, active: true },
  // category: mbox — a MBox unitária vem de config/mbox. Aqui só a Dupla.
  { id: "p-mbox-2", name: "MBox Dupla", description: "2 MBox para compartilhar a experiência secreta com um aliado.", price: 140.0, category: "mbox", icon: "📦", tag: "SÓ SÁBADO", agendaMbox: true, mboxUnits: 2, active: true },
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
  { id: "r-1", name: "Frete Grátis", description: "Em qualquer pedido", pointsRequired: 500, icon: "🚚", active: true, category: "benefits", type: "physical" },
  { id: "r-2", name: "Burger Grátis", description: "Smash burger clássico", pointsRequired: 1500, icon: "🍔", active: true, category: "physical", type: "physical" },
  { id: "r-3", name: "Combo VIP", description: "Burger + Batata + Bebida", pointsRequired: 3000, icon: "📦", active: true, category: "physical", type: "physical" },
  { id: "r-4", name: "MBox Surpresa", description: "Uma MBox mistério por nossa conta", pointsRequired: 5000, icon: "🎁", active: true, category: "experiences", type: "physical" },
];

const DEMO_INVITE = "MRBUR-GENESIS-X7K9";

const MISSIONS = [
  { id: 'signup', name: 'Agente Recrutado', description: 'Complete seu cadastro na Ordem', icon: '🎖️', reward: 50, type: 'single', condition: 'signup_completed', active: true, order: 1 },
  { id: 'first_order', name: 'Primeira Mordida', description: 'Faça seu primeiro pedido', icon: '🎯', reward: 100, type: 'single', condition: 'orders_count >= 1', active: true, order: 2 },
  { id: 'orders_3', name: 'Agente Ativo', description: 'Complete 3 pedidos', icon: '📦', reward: 150, type: 'cumulative', target: 3, condition: 'orders_count >= 3', active: true, order: 3 },
  { id: 'orders_10', name: 'Veterano da Ordem', description: 'Complete 10 pedidos', icon: '🏆', reward: 500, type: 'cumulative', target: 10, condition: 'orders_count >= 10', active: true, order: 4 },
  { id: 'points_500', name: 'Recruta Promissor', description: 'Acumule 500 pontos', icon: '⚡', reward: 50, type: 'cumulative', target: 500, condition: 'points >= 500', active: true, order: 5 },
  { id: 'points_1000', name: 'Agente Destaque', description: 'Acumule 1000 pontos', icon: '🌟', reward: 100, type: 'cumulative', target: 1000, condition: 'points >= 1000', active: true, order: 6 },
  { id: 'invite_1', name: 'Recrutador', description: 'Convide 1 amigo para a Ordem', icon: '🤝', reward: 200, type: 'cumulative', target: 1, condition: 'invites_used >= 1', active: true, order: 7 },
  { id: 'invite_3', name: 'Líder de Esquadrão', description: 'Convide 3 amigos para a Ordem', icon: '👥', reward: 500, type: 'cumulative', target: 3, condition: 'invites_used >= 3', active: true, order: 8 },
  { id: 'week_streak', name: 'Fidelidade Inabalável', description: 'Faça pedidos em 3 dias diferentes da semana', icon: '🔥', reward: 300, type: 'streak', target: 3, condition: 'week_days >= 3', active: true, order: 9 },
  { id: 'mbox_1', name: 'Explorador MBox', description: 'Peça sua primeira MBox', icon: '📦', reward: 200, type: 'single', condition: 'mbox_count >= 1', active: true, order: 10 },
];

/** Cria/atualiza apenas o catálogo (products + rewards). Requer admin sob as regras. */
export async function seedCatalog() {
  for (const p of PRODUCTS) await setDoc(`products/${p.id}`, { ...p, createdAt: tsNow() });
  for (const r of REWARDS) await setDoc(`rewards/${r.id}`, { ...r, createdAt: tsNow() });
  console.info("[seed] catálogo (products + rewards) criado.");
}

/** Cria missões padrão no banco. */
export async function seedMissions() {
  for (const m of MISSIONS) await setDoc(`missions/${m.id}`, { ...m, createdAt: tsNow() });
  console.info("[seed] missões criadas.");
}

/**
 * Cria um convite SE ele ainda não existir (não sobrescreve um já consumido,
 * o que violaria as Security Rules). Retorna o código.
 */
export async function seedInvite(code = DEMO_INVITE) {
  const existing = await getDoc(`invites/${code}`);
  if (existing) { console.info(`[seed] convite ${code} já existe — mantido.`); return code; }
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await setDoc(`invites/${code}`, {
    id: code,
    token: code,
    criadoPor: "seed",
    roleCriador: null,
    emailDestino: null,
    status: "ativo",
    dataCriacao: tsNow(),
    dataExpiracao: expiresAt.getTime(),
    dataUso: null,
    usadoPor: null,
    limiteUso: 1,
    totalUsos: 0
  });
  console.info(`[seed] convite ${code} criado.`);
  return code;
}

/** Gera N convites aleatórios novos (para distribuir aos agentes). */
export async function seedRandomInvites(n = 3) {
  const codes = [];
  for (let i = 0; i < n; i++) {
    const code = "MRBUR-" + Math.random().toString(36).slice(2, 7).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await setDoc(`invites/${code}`, {
      id: code,
      token: code,
      criadoPor: "seed",
      roleCriador: null,
      emailDestino: null,
      status: "ativo",
      dataCriacao: tsNow(),
      dataExpiracao: expiresAt.getTime(),
      dataUso: null,
      usadoPor: null,
      limiteUso: 1,
      totalUsos: 0
    });
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

/** Pedidos de exemplo ligados aos agentes de exemplo (popula dashboard + dossiês).
    items: [nome, ícone, preço, qtd, desc?]. desc = ingredientes do "Monte Seu Lanche".
    status variados p/ KPIs; alguns de hoje. */
const DELIVERY_FEE_SEED = 8.9;
// Lanches montados (ingredientes reais de BUILD_STEPS; preço = base 29,90 + extras).
const BURGER_A = ["Monte Seu Lanche", "🔧", 33.8, 1, "Brioche Clássico, Blend 180g, Cheddar, Bacon Artesanal, Alface Americana, Tomate, Molho Secreto"];
const BURGER_B = ["Monte Seu Lanche", "🔧", 38.9, 1, "Australiano, Duplo Smash, Cheddar, Provolone, Cebola Caramelizada, Pickles, BBQ Defumado, Ranch"];
const BURGER_C = ["Monte Seu Lanche", "🔧", 40.8, 1, "Sem Pão (alface), Plant-Based 150g, Brie, Rúcula, Tomate, Maionese Trufada"];
const SAMPLE_ORDERS = [
  { agent: "falcao-dourado", status: "entregue",  daysAgo: 0,  items: [BURGER_A, ["Milkshake Phantom", "🥤", 19.9, 1]] },
  { agent: "falcao-dourado", status: "entregue",  daysAgo: 2,  items: [["MBox Surpresa", "📦", 75.0, 1]] },
  { agent: "cobra-prime",    status: "enviado",   daysAgo: 0,  items: [BURGER_B, ["Batata da Ordem", "🍟", 18.9, 1]] },
  { agent: "cobra-prime",    status: "entregue",  daysAgo: 5,  items: [["Combo do Dia", "📋", 44.9, 1]] },
  { agent: "lobo-cipher",    status: "producao",  daysAgo: 0,  items: [BURGER_C, ["Soda Classified", "🥫", 7.9, 2]] },
  { agent: "lobo-cipher",    status: "recebido",  daysAgo: 0,  items: [["Brownie Black Ops", "🍫", 16.9, 1], ["Cookie Encrypted", "🍪", 9.9, 2]] },
  { agent: "pantera-negra",  status: "analisando",daysAgo: 0,  items: [["Loaded Fries Intel", "🧀", 28.9, 1], ["Suco Operativo", "🧃", 12.9, 1]] },
  { agent: "pantera-negra",  status: "entregue",  daysAgo: 8,  items: [["Combo do Dia", "📋", 44.9, 2]] },
  { agent: "coruja-stealth", status: "aprovado",  daysAgo: 0,  items: [BURGER_A, ["Água da Fonte", "💧", 4.9, 1]] },
  { agent: "coruja-stealth", status: "cancelado", daysAgo: 3,  items: [["MBox Surpresa", "📦", 75.0, 1]] },
  { agent: "raposa-zero",    status: "entregue",  daysAgo: 1,  items: [["Onion Rings Cipher", "🧅", 22.9, 1], ["Milkshake Phantom", "🥤", 19.9, 1]] },
  { agent: "raposa-zero",    status: "recebido",  daysAgo: 0,  items: [["Petit Gateau Covert", "🎂", 22.9, 1]] },
];

export async function seedSampleOrders() {
  const DAY = 86400000;
  let n = 0;
  for (const o of SAMPLE_ORDERS) {
    n++;
    const items = o.items.map(([name, icon, price, qty, desc]) => ({ name, icon, price, qty, desc: desc || "" }));
    const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
    const total = +(subtotal + DELIVERY_FEE_SEED).toFixed(2);
    const created = Date.now() - o.daysAgo * DAY - n * 60000;
    const id = `seed-order-${String(n).padStart(2, "0")}`;
    await setDoc(`orders/${id}`, {
      id,
      numeroPedido: `ORD-DEMO-${String(n).padStart(3, "0")}`,
      userId: `seed-${o.agent}`,
      cliente: o.agent,
      agenteResponsavel: null,
      status: o.status,
      items,
      subtotal: +subtotal.toFixed(2),
      deliveryFee: DELIVERY_FEE_SEED,
      total,
      pointsEarned: Math.round(total),
      pointsAwarded: o.status === "entregue",
      address: { street: "Rua Secreta, 00", neighborhood: "Centro", city: "Americana" },
      pagamento: { metodo: "pix", status: o.status === "entregue" ? "pago" : "pendente", valor: total },
      observacoes: "",
      anexos: [],
      timeline: [{ status: o.status, timestamp: created, observacao: "Pedido de exemplo" }],
      criadoEm: created,
      atualizadoEm: created,
    });
  }
  console.info(`[seed] ${SAMPLE_ORDERS.length} pedidos de exemplo criados.`);
}

/** Extrato de méritos de exemplo (pointsHistory) p/ preencher os dossiês. */
export async function seedSamplePoints() {
  const DAY = 86400000;
  const gen = (points) => {
    const e = [["Bônus de recrutamento", 50, 45], ["Missão: Primeira Mordida", 100, 30], ["Pedido entregue · méritos", 74, 3]];
    if (points >= 500)  e.push(["Missão: Recruta Promissor", 50, 22]);
    if (points >= 1000) e.push(["Missão: Agente Destaque", 100, 18]);
    if (points >= 2000) e.push(["Pedido entregue · méritos", 98, 8]);
    if (points >= 3000) e.push(["Resgate: Frete Grátis", -500, 6]);
    if (points >= 5000) e.push(["Missão: Veterano da Ordem", 500, 12]);
    return e;
  };
  for (const a of SAMPLE_AGENTS) {
    let i = 0;
    for (const [reason, delta, daysAgo] of gen(a.points)) {
      i++;
      await setDoc(`pointsHistory/seed-ph-${a.codename}-${i}`, {
        userId: `seed-${a.codename}`, delta, reason, orderId: null,
        type: "meritos", createdAt: Date.now() - daysAgo * DAY - i * 60000,
      });
    }
  }
  console.info("[seed] extrato de méritos de exemplo criado.");
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

/** Seed completo: catálogo + missões + convites + agentes de exemplo + (opcional) admin. */
export async function seedEverything(adminUid = null, adminEmail = "") {
  await seedCatalog();
  await seedMissions();
  await seedSampleAgents();
  await seedSampleOrders();
  await seedSamplePoints();
  await seedInvite(DEMO_INVITE);
  await seedRandomInvites(4);
  if (adminUid) await seedAdminProfile(adminUid, adminEmail);
  console.info("[seed] seed COMPLETO concluído.");
}

/** Seed completo: catálogo + missões + convite demo (se ainda não existir). */
export async function seedAll() {
  await seedCatalog();
  await seedMissions();
  await seedInvite(DEMO_INVITE);
}

/** Só semeia no modo demo e apenas se ainda não houver produtos. */
export async function ensureSeed() {
  if (!IS_DEMO) return;
  const existing = await getCollection("products");
  if (existing.length === 0) await seedAll();
}

export { DEMO_INVITE };
