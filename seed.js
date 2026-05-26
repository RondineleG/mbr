/* ═══════════════════════════════════════════════════════════════
   SEED PRODUÇÃO — Script Node.js com Firebase Admin SDK
   Popula products, rewards, invites e usuários admin no Firestore
   Uso: node seed.js
   ═══════════════════════════════════════════════════════════════ */
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trabalhohowx'
});

const db = admin.firestore();

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
  // category: exclusivos (só com méritos)
  { id: "p-ex-1", name: "Burger Classificado Secreto", description: "Hambúrguer exclusivo só para agentes de elite. Requer méritos para desbloquear.", price: 0, pointsRequired: 1000, category: "exclusivos", icon: "🔒", tag: "EXCLUSIVO", exclusiveToPoints: true, active: true },
  { id: "p-ex-2", name: "Batata Dourada da Ordem", description: "Batata especial com tempero secreto dourado. Requer méritos.", price: 0, pointsRequired: 500, category: "exclusivos", icon: "👑", tag: "EXCLUSIVO", exclusiveToPoints: true, active: true },
  { id: "p-ex-3", name: "Combo Elite", description: "Burger exclusivo + batata dourada + bebida premium. Requer 1500 méritos.", price: 0, pointsRequired: 1500, category: "exclusivos", icon: "⭐", tag: "EXCLUSIVO", exclusiveToPoints: true, active: true },
  { id: "p-ex-4", name: "MBox Phantom Edition", description: "Versão ultra-limitada da MBox com itens exclusivos.", price: 0, pointsRequired: 5000, category: "exclusivos", icon: "📦", tag: "ULTRA RARO", exclusiveToPoints: true, active: true },
  // Acompanhamentos exclusivos — adquiridos SOMENTE com méritos (somem se a Loja de Méritos estiver off).
  { id: "p-acx-1", name: "Batata Trufada Confidencial", description: "Batata rústica com óleo de trufa e parmesão. Só para agentes com méritos.", price: 0, pointsRequired: 600, category: "acomp", icon: "🍟", tag: "SÓ MÉRITOS", exclusiveToPoints: true, active: true },
  { id: "p-acx-2", name: "Anéis de Cebola Dourados", description: "Onion rings empanados em panko dourado. Resgate com méritos.", price: 0, pointsRequired: 900, category: "acomp", icon: "🧅", tag: "SÓ MÉRITOS", exclusiveToPoints: true, active: true },
  { id: "p-acx-3", name: "Nuggets Black Label", description: "12 nuggets premium com molho secreto da Ordem. Exclusivo por méritos.", price: 0, pointsRequired: 1200, category: "acomp", icon: "🍗", tag: "SÓ MÉRITOS", exclusiveToPoints: true, active: true },
];

const REWARDS = [
  { id: "r-1", name: "Frete Grátis", description: "Em qualquer pedido", pointsRequired: 500, icon: "🚚", active: true, category: "benefits", type: "digital" },
  { id: "r-2", name: "Burger Grátis", description: "Smash burger clássico", pointsRequired: 1500, icon: "🍔", active: true, category: "physical", type: "physical" },
  { id: "r-3", name: "Combo VIP", description: "Burger + Batata + Bebida", pointsRequired: 3000, icon: "📦", active: true, category: "physical", type: "physical" },
  { id: "r-4", name: "MBox Surpresa", description: "Uma MBox mistério por nossa conta", pointsRequired: 5000, icon: "🎁", active: true, category: "experiences", type: "physical" },
];

// Criar convite demo
const DEMO_INVITE = "MRBUR-GENESIS-X7K9";
const demoInviteData = {
  id: DEMO_INVITE,
  token: DEMO_INVITE,
  criadoPor: "admin-seed", // Convite do sistema (simula admin)
  roleCriador: "admin",
  emailDestino: null,
  status: "ativo",
  dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
  dataExpiracao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
  dataUso: null,
  usadoPor: null,
  limiteUso: 100, // Demo permite muitos usos
  totalUsos: 0
};

// Função auxiliar para rank baseado em pontos
function rankFromPoints(points) {
  if (points >= 5000) return { level: 6, name: "MESTRE" };
  if (points >= 3000) return { level: 5, name: "ÔMEGA" };
  if (points >= 2000) return { level: 4, name: "SIGMA" };
  if (points >= 1000) return { level: 3, name: "DELTA" };
  if (points >= 500) return { level: 2, name: "GAMA" };
  return { level: 1, name: "ALFA" };
}

// Agentes de exemplo
const SAMPLE_AGENTS = [
  { codename: "falcao-dourado",  name: "Agente Ômega",  points: 6200 },
  { codename: "cobra-prime",     name: "Agente Sigma",  points: 3800 },
  { codename: "lobo-cipher",     name: "Agente Delta",  points: 2100 },
  { codename: "pantera-negra",   name: "Agente Gama",   points: 950 },
  { codename: "coruja-stealth",  name: "Agente Beta",   points: 420 },
  { codename: "raposa-zero",     name: "Agente Alfa",   points: 80 },
];

async function seedCatalog() {
  console.log('📦 Criando catálogo de produtos...');
  const batch = db.batch();
  
  for (const p of PRODUCTS) {
    const ref = db.collection('products').doc(p.id);
    batch.set(ref, { ...p, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  
  for (const r of REWARDS) {
    const ref = db.collection('rewards').doc(r.id);
    batch.set(ref, { ...r, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  
  await batch.commit();
  console.log('✅ Catálogo criado com sucesso!');
}

async function seedInvite(code = DEMO_INVITE) {
  const doc = await db.collection('invites').doc(code).get();
  if (doc.exists) {
    console.log(`⚠️  Convite ${code} já existe — mantido.`);
    return code;
  }
  
  const inviteData = code === DEMO_INVITE ? demoInviteData : {
    id: code,
    token: code,
    criadoPor: "seed",
    roleCriador: "admin",
    emailDestino: null,
    status: "ativo",
    dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
    dataExpiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    dataUso: null,
    usadoPor: null,
    limiteUso: 1,
    totalUsos: 0
  };
  
  await db.collection('invites').doc(code).set(inviteData);
  console.log(`✅ Convite ${code} criado!`);
  return code;
}

async function seedRandomInvites(n = 3) {
  const codes = [];
  for (let i = 0; i < n; i++) {
    const code = "MRBUR-" + Math.random().toString(36).slice(2, 7).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    await db.collection('invites').doc(code).set({
      id: code,
      token: code,
      criadoPor: "seed",
      roleCriador: "admin",
      emailDestino: null,
      status: "ativo",
      dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
      dataExpiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      dataUso: null,
      usadoPor: null,
      limiteUso: 1,
      totalUsos: 0
    });
    codes.push(code);
  }
  console.log(`✅ ${n} convites aleatórios criados:`, codes);
  return codes;
}

async function seedSampleAgents() {
  console.log('👥 Criando agentes de exemplo...');
  const batch = db.batch();
  
  for (const a of SAMPLE_AGENTS) {
    const r = rankFromPoints(a.points);
    const uid = "seed-" + a.codename;
    const ref = db.collection('users').doc(uid);
    batch.set(ref, {
      uid,
      name: a.name,
      codename: a.codename,
      email: `${a.codename}@mrbur.demo`,
      phone: "",
      address: {},
      points: a.points,
      level: r.level,
      rank: r.name,
      role: "agent",
      invitesAvailable: 0,
      invitedBy: null,
      invitedByRole: null,
      invitedById: null,
      inviteId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  
  await batch.commit();
  console.log('✅ Agentes de exemplo criados!');
}

async function seedAdminProfile(adminUid, email = "") {
  const doc = await db.collection('users').doc(adminUid).get();
  const existing = doc.exists ? doc.data() : {};
  
  await db.collection('users').doc(adminUid).set({
    name: existing.name || "Comando da Ordem",
    codename: existing.codename || "comando-supremo",
    email: existing.email || email,
    phone: existing.phone || "",
    address: existing.address || {},
    points: existing.points || 0,
    level: existing.level || 1,
    rank: existing.rank || "MESTRE",
    invitesAvailable: 99,
    invitedBy: existing.invitedBy || null,
    invitedByRole: existing.invitedByRole || null,
    invitedById: existing.invitedById || null,
    inviteId: existing.inviteId || null,
    createdAt: existing.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    uid: adminUid,
    role: "admin",
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  
  console.log(`✅ Admin definido para uid: ${adminUid}`);
}

async function seedEverything(adminUid = null, adminEmail = "") {
  try {
    console.log('🚀 Iniciando seed completo...\n');
    
    await seedCatalog();
    await seedSampleAgents();
    await seedInvite(DEMO_INVITE);
    await seedRandomInvites(4);
    await seedMissions();
    
    if (adminUid) {
      await seedAdminProfile(adminUid, adminEmail);
    } else {
      console.log('⚠️  Nenhum adminUid fornecido — pulando criação de admin.');
      console.log('   Para criar um admin, rode: node seed.js <adminUid> <adminEmail>');
    }
    
    console.log('\n🎉 Seed COMPLETO concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    throw error;
  }
}

/** Cria documentos de missões no Firestore */
async function seedMissions() {
  const MISSIONS = [
    { id: 'first_order', name: 'Primeira Mordida', description: 'Faça seu primeiro pedido', icon: '🎯', reward: 100, type: 'single', condition: 'orders_count >= 1' },
    { id: 'orders_3', name: 'Agente Ativo', description: 'Complete 3 pedidos', icon: '📦', reward: 150, type: 'cumulative', target: 3, condition: 'orders_count >= 3' },
    { id: 'orders_10', name: 'Veterano da Ordem', description: 'Complete 10 pedidos', icon: '🏆', reward: 500, type: 'cumulative', target: 10, condition: 'orders_count >= 10' },
    { id: 'points_500', name: 'Recruta Promissor', description: 'Acumule 500 pontos', icon: '⚡', reward: 50, type: 'cumulative', target: 500, condition: 'points >= 500' },
    { id: 'points_1000', name: 'Agente Destaque', description: 'Acumule 1000 pontos', icon: '🌟', reward: 100, type: 'cumulative', target: 1000, condition: 'points >= 1000' },
    { id: 'invite_1', name: 'Recrutador', description: 'Convide 1 amigo para a Ordem', icon: '🤝', reward: 200, type: 'cumulative', target: 1, condition: 'invites_used >= 1' },
    { id: 'invite_3', name: 'Líder de Esquadrão', description: 'Convide 3 amigos para a Ordem', icon: '👥', reward: 500, type: 'cumulative', target: 3, condition: 'invites_used >= 3' },
    { id: 'week_streak', name: 'Fidelidade Inabalável', description: 'Faça pedidos em 3 dias diferentes da semana', icon: '🔥', reward: 300, type: 'streak', target: 3, condition: 'week_days >= 3' },
    { id: 'mbox_1', name: 'Explorador MBox', description: 'Peça sua primeira MBox', icon: '📦', reward: 200, type: 'single', condition: 'mbox_count >= 1' },
    { id: 'pwa_install', name: 'Instalador de Elite', description: 'Instale o app MrBur em seu dispositivo', icon: '📱', reward: 100, type: 'single', condition: 'pwa_installed' }
  ];

  for (const mission of MISSIONS) {
    await db.collection('missions').doc(mission.id).set({ ...mission, active: true, order: MISSIONS.indexOf(mission) + 1, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  console.log('✅ Missões criadas no Firestore.');
}

// Executa o seed
const args = process.argv.slice(2);
const adminUid = args[0] || null;
const adminEmail = args[1] || "";

seedEverything(adminUid, adminEmail)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
