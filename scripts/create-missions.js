/* ═══════════════════════════════════════════════════════════════
   CREATE MISSIONS — Cria missões no Firestore
   Uso: node create-missions.js
   ═══════════════════════════════════════════════════════════════ */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trabalhohowx'
});

const db = admin.firestore();

// Definição das missões
const MISSIONS = [
  {
    id: 'signup',
    name: 'Agente Recrutado',
    description: 'Complete seu cadastro na Ordem',
    icon: '🎖️',
    reward: 50,
    type: 'single',
    condition: 'signup_completed',
    active: true,
    order: 1
  },
  {
    id: 'first_order',
    name: 'Primeira Mordida',
    description: 'Faça seu primeiro pedido',
    icon: '🎯',
    reward: 100,
    type: 'single',
    condition: 'orders_count >= 1',
    active: true,
    order: 2
  },
  {
    id: 'orders_3',
    name: 'Agente Ativo',
    description: 'Complete 3 pedidos',
    icon: '📦',
    reward: 150,
    type: 'cumulative',
    target: 3,
    condition: 'orders_count >= 3',
    active: true,
    order: 3
  },
  {
    id: 'orders_10',
    name: 'Veterano da Ordem',
    description: 'Complete 10 pedidos',
    icon: '🏆',
    reward: 500,
    type: 'cumulative',
    target: 10,
    condition: 'orders_count >= 10',
    active: true,
    order: 4
  },
  {
    id: 'points_500',
    name: 'Recruta Promissor',
    description: 'Acumule 500 pontos',
    icon: '⚡',
    reward: 50,
    type: 'cumulative',
    target: 500,
    condition: 'points >= 500',
    active: true,
    order: 5
  },
  {
    id: 'points_1000',
    name: 'Agente Destaque',
    description: 'Acumule 1000 pontos',
    icon: '🌟',
    reward: 100,
    type: 'cumulative',
    target: 1000,
    condition: 'points >= 1000',
    active: true,
    order: 6
  },
  {
    id: 'invite_1',
    name: 'Recrutador',
    description: 'Convide 1 amigo para a Ordem',
    icon: '🤝',
    reward: 200,
    type: 'cumulative',
    target: 1,
    condition: 'invites_used >= 1',
    active: true,
    order: 7
  },
  {
    id: 'invite_3',
    name: 'Líder de Esquadrão',
    description: 'Convide 3 amigos para a Ordem',
    icon: '👥',
    reward: 500,
    type: 'cumulative',
    target: 3,
    condition: 'invites_used >= 3',
    active: true,
    order: 8
  },
  {
    id: 'week_streak',
    name: 'Fidelidade Inabalável',
    description: 'Faça pedidos em 3 dias diferentes da semana',
    icon: '🔥',
    reward: 300,
    type: 'streak',
    target: 3,
    condition: 'week_days >= 3',
    active: true,
    order: 9
  },
  {
    id: 'mbox_1',
    name: 'Explorador MBox',
    description: 'Peça sua primeira MBox',
    icon: '📦',
    reward: 200,
    type: 'single',
    condition: 'mbox_count >= 1',
    active: true,
    order: 10
  }
];

async function createMissions() {
  console.log('🚀 Criando missões no Firestore...\n');

  const batch = db.batch();

  MISSIONS.forEach(mission => {
    const docRef = db.collection('missions').doc(mission.id);
    batch.set(docRef, {
      ...mission,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`📝 Missão: ${mission.name} (${mission.id})`);
  });

  await batch.commit();
  console.log('\n✅ Missões criadas com sucesso!');
}

createMissions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro ao criar missões:', error);
    process.exit(1);
  });
