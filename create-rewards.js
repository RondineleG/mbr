/* ═══════════════════════════════════════════════════════════════
   CREATE REWARDS — Cria recompensas no Firestore
   Uso: node create-rewards.js
   ═══════════════════════════════════════════════════════════════ */
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trabalhohowx'
});

const db = admin.firestore();

// Definição das recompensas por categoria
const REWARDS = [
  // Categoria: Benefícios (descontos e vantagens)
  {
    id: 'frete_gratis',
    name: 'Frete Grátis',
    description: 'Frete grátis no próximo pedido',
    icon: '🚚',
    category: 'benefits',
    type: 'discount',
    pointsRequired: 100,
    stock: null, // ilimitado
    active: true,
    order: 1
  },
  {
    id: 'desconto_10',
    name: '10% OFF',
    description: 'Desconto de 10% em qualquer pedido',
    icon: '🏷️',
    category: 'benefits',
    type: 'discount',
    pointsRequired: 150,
    stock: null,
    active: true,
    order: 2
  },
  {
    id: 'desconto_20',
    name: '20% OFF',
    description: 'Desconto de 20% em qualquer pedido',
    icon: '🎫',
    category: 'benefits',
    type: 'discount',
    pointsRequired: 300,
    stock: null,
    active: true,
    order: 3
  },
  
  // Categoria: Produtos físicos (itens exclusivos)
  {
    id: 'burger_gratis',
    name: 'Burger Grátis',
    description: 'Um burger à sua escolha',
    icon: '🍔',
    category: 'physical',
    type: 'physical',
    pointsRequired: 500,
    stock: 50,
    active: true,
    order: 4
  },
  {
    id: 'combo_vip',
    name: 'Combo VIP',
    description: 'Combo exclusivo com burger, batata e bebida',
    icon: '👑',
    category: 'physical',
    type: 'physical',
    pointsRequired: 800,
    stock: 30,
    active: true,
    order: 5
  },
  {
    id: 'mbox_surpresa',
    name: 'MBox Surpresa',
    description: 'MBox misteriosa com itens exclusivos',
    icon: '📦',
    category: 'physical',
    type: 'physical',
    pointsRequired: 1000,
    stock: 20,
    active: true,
    order: 6
  },
  {
    id: 'camiseta_mrbur',
    name: 'Camiseta MrBur',
    description: 'Camiseta exclusiva da marca',
    icon: '👕',
    category: 'physical',
    type: 'physical',
    pointsRequired: 1500,
    stock: 25,
    active: true,
    order: 7
  },
  {
    id: 'boné_exclusivo',
    name: 'Boné Exclusivo',
    description: 'Boné com logo da Ordem',
    icon: '🧢',
    category: 'physical',
    type: 'physical',
    pointsRequired: 1200,
    stock: 40,
    active: true,
    order: 8
  },
  
  // Categoria: Experiências (benefícios especiais)
  {
    id: 'acesso_early',
    name: 'Acesso Early',
    description: 'Acesso antecipado a novos produtos',
    icon: '⏰',
    category: 'experiences',
    type: 'benefit',
    pointsRequired: 2000,
    stock: null,
    active: true,
    order: 9
  },
  {
    id: 'menu_secreto',
    name: 'Menu Secreto',
    description: 'Acesso ao menu secreto da cozinha',
    icon: '🔮',
    category: 'experiences',
    type: 'benefit',
    pointsRequired: 2500,
    stock: null,
    active: true,
    order: 10
  },
  {
    id: 'evento_exclusivo',
    name: 'Evento Exclusivo',
    description: 'Convite para evento exclusivo da marca',
    icon: '🎉',
    category: 'experiences',
    type: 'benefit',
    pointsRequired: 3000,
    stock: 10,
    active: true,
    order: 11
  },
  
  // Categoria: Status (vantagens de VIP)
  {
    id: 'vip_mensal',
    name: 'VIP Mensal',
    description: 'Status VIP por 30 dias com benefícios exclusivos',
    icon: '💎',
    category: 'status',
    type: 'benefit',
    pointsRequired: 500,
    stock: null,
    active: true,
    order: 12
  },
  {
    id: 'vip_trimestral',
    name: 'VIP Trimestral',
    description: 'Status VIP por 90 dias com benefícios exclusivos',
    icon: '👑',
    category: 'status',
    type: 'benefit',
    pointsRequired: 1200,
    stock: null,
    active: true,
    order: 13
  }
];

async function createRewards() {
  console.log('🚀 Criando recompensas no Firestore...\n');

  const batch = db.batch();

  REWARDS.forEach(reward => {
    const docRef = db.collection('rewards').doc(reward.id);
    batch.set(docRef, {
      ...reward,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`📝 Recompensa: ${reward.name} (${reward.category}) - ${reward.pointsRequired} pontos`);
  });

  await batch.commit();
  console.log('\n✅ Recompensas criadas com sucesso!');
  console.log('\n📊 Resumo:');
  console.log(`   Total de recompensas: ${REWARDS.length}`);
  console.log(`   Benefícios: ${REWARDS.filter(r => r.category === 'benefits').length}`);
  console.log(`   Produtos físicos: ${REWARDS.filter(r => r.category === 'physical').length}`);
  console.log(`   Experiências: ${REWARDS.filter(r => r.category === 'experiences').length}`);
  console.log(`   Status: ${REWARDS.filter(r => r.category === 'status').length}`);
}

createRewards()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro ao criar recompensas:', error);
    process.exit(1);
  });
