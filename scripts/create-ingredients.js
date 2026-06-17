/* ═══════════════════════════════════════════════════════════════
   CREATE INGREDIENTS — Cria ingredientes exclusivos compráveis com méritos
   Uso: node create-ingredients.js
   ═══════════════════════════════════════════════════════════════ */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trabalhohowx'
});

const db = admin.firestore();

// Definição dos ingredientes exclusivos por méritos
const INGREDIENTS = [
  {
    id: 'molho_gorgonzola',
    name: 'Molho Gorgonzola',
    description: 'Molho especial de gorgonzola da casa',
    icon: '🧀',
    price: 0, // Não pode ser comprado com dinheiro
    pointsRequired: 500, // Custo em méritos
    category: 'acomp',
    exclusiveToPoints: true, // Exclusivo para méritos
    stock: null, // Ilimitado
    active: true,
    featured: true
  },
  {
    id: 'bacon_extra',
    name: 'Bacon Extra',
    description: 'Porção extra de bacon crocante',
    icon: '🥓',
    price: 0,
    pointsRequired: 300,
    category: 'acomp',
    exclusiveToPoints: true,
    stock: null,
    active: true,
    featured: true
  },
  {
    id: 'cheddar_extra',
    name: 'Cheddar Extra',
    description: 'Porção extra de cheddar derretido',
    icon: '🧈',
    price: 0,
    pointsRequired: 250,
    category: 'acomp',
    exclusiveToPoints: true,
    stock: null,
    active: true,
    featured: false
  },
  {
    id: 'onion_rings',
    name: 'Onion Rings',
    description: 'Anéis de cebola crocantes',
    icon: '🧅',
    price: 0,
    pointsRequired: 350,
    category: 'acomp',
    exclusiveToPoints: true,
    stock: null,
    active: true,
    featured: true
  },
  {
    id: 'picles_artesanal',
    name: 'Picles Artesanal',
    description: 'Picles feito na casa',
    icon: '🥒',
    price: 0,
    pointsRequired: 200,
    category: 'acomp',
    exclusiveToPoints: true,
    stock: null,
    active: true,
    featured: false
  },
  {
    id: 'molho_bbq',
    name: 'Molho BBQ',
    description: 'Molho barbecue defumado',
    icon: '🍖',
    price: 0,
    pointsRequired: 150,
    category: 'acomp',
    exclusiveToPoints: true,
    stock: null,
    active: true,
    featured: false
  },
  {
    id: 'molho_cheddar',
    name: 'Molho Cheddar',
    description: 'Molho de cheddar cremoso',
    icon: '🧀',
    price: 0,
    pointsRequired: 200,
    category: 'acomp',
    exclusiveToPoints: true,
    stock: null,
    active: true,
    featured: false
  }
];

async function createIngredients() {
  console.log('🚀 Criando ingredientes exclusivos por méritos...\n');

  const batch = db.batch();

  INGREDIENTS.forEach(ingredient => {
    const docRef = db.collection('products').doc(ingredient.id);
    batch.set(docRef, {
      ...ingredient,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`📝 Ingrediente: ${ingredient.name} - ${ingredient.pointsRequired} méritos`);
  });

  await batch.commit();
  console.log('\n✅ Ingredientes criados com sucesso!');
  console.log('\n📊 Resumo:');
  console.log(`   Total de ingredientes: ${INGREDIENTS.length}`);
  console.log(`   Mais caro: ${INGREDIENTS.reduce((a, b) => a.pointsRequired > b.pointsRequired ? a : b).name} (${INGREDIENTS.reduce((a, b) => a.pointsRequired > b.pointsRequired ? a : b).pointsRequired} méritos)`);
  console.log(`   Mais barato: ${INGREDIENTS.reduce((a, b) => a.pointsRequired < b.pointsRequired ? a : b).name} (${INGREDIENTS.reduce((a, b) => a.pointsRequired < b.pointsRequired ? a : b).pointsRequired} méritos)`);
}

createIngredients()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro ao criar ingredientes:', error);
    process.exit(1);
  });
