/* ═══════════════════════════════════════════════════════════════
   SEED ALTERNATIVO — Firebase REST API (sem Admin SDK)
   Usa a API key pública do projeto para popular dados
   ATENÇÃO: Requer que você esteja autenticado no app web primeiro
   para obter um token de autenticação válido
   ═══════════════════════════════════════════════════════════════ */

const API_KEY = "AIzaSyC3ksjEPoHlSrOchpXXSjGOiQQvkrVg4W4";
const PROJECT_ID = "projetohowx";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const PRODUCTS = [
  { id: "p-dia-1", name: "Lanche Classificado", description: "Receita secreta do dia — só descobre quem pedir.", price: 29.9, category: "dia", icon: "🕵️", tag: "LIMITADO · 20/DIA", featured: true, active: true },
  { id: "p-dia-2", name: "Combo Infiltrado", description: "Lanche do dia + batata temperada + bebida à escolha.", price: 44.9, category: "dia", icon: "📋", tag: "COMBO", active: true },
  { id: "p-mbox-1", name: "MBox Mistério", description: "Hambúrguer exclusivo + bebida + acompanhamento + sobremesa + colecionável surpresa.", price: 75.0, category: "mbox", icon: "📦", tag: "SÓ SÁBADO · 50 UN.", active: true },
  { id: "p-mbox-2", name: "MBox Dupla", description: "2 MBox para compartilhar a experiência secreta com um aliado.", price: 140.0, category: "mbox", icon: "📦", tag: "SÓ SÁBADO", active: true },
  { id: "p-ac-1", name: "Batata da Ordem", description: "Frita com tempero secreto", price: 18.9, category: "acomp", icon: "🍟", active: true },
  { id: "p-ac-2", name: "Onion Rings Cipher", description: "Empanados com molho ranch", price: 22.9, category: "acomp", icon: "🧅", active: true },
  { id: "p-ac-3", name: "Nuggets Stealth", description: "8 un. com 3 molhos", price: 24.9, category: "acomp", icon: "🍗", active: true },
  { id: "p-ac-4", name: "Loaded Fries Intel", description: "Batata + cheddar + bacon + cebolinha", price: 28.9, category: "acomp", icon: "🧀", active: true },
  { id: "p-be-1", name: "Soda Classified", description: "Refrigerante lata 350ml", price: 7.9, category: "bebidas", icon: "🥫", active: true },
  { id: "p-be-2", name: "Suco Operativo", description: "Natural 500ml (laranja/limão/maracujá)", price: 12.9, category: "bebidas", icon: "🧃", active: true },
  { id: "p-be-3", name: "Milkshake Phantom", description: "500ml (choc/morango/baunilha/Ovomaltine)", price: 19.9, category: "bebidas", icon: "🥤", active: true },
  { id: "p-be-4", name: "Água da Fonte", description: "Mineral 500ml", price: 4.9, category: "bebidas", icon: "💧", active: true },
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

// Converte objeto para formato Firestore REST API
function toFirestoreValue(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreValue(value) } };
    }
  }
  return fields;
}

async function createDocument(collection, docId, data, authToken) {
  const url = `${BASE_URL}/${collection}/${docId}?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      fields: toFirestoreValue({
        ...data,
        createdAt: { timestampValue: new Date().toISOString() }
      })
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao criar ${collection}/${docId}: ${error}`);
  }

  return response.json();
}

async function seedCatalog(authToken) {
  console.log('📦 Criando catálogo de produtos...');
  
  for (const p of PRODUCTS) {
    await createDocument('products', p.id, p, authToken);
    console.log(`  ✅ Produto ${p.id} criado`);
  }
  
  for (const r of REWARDS) {
    await createDocument('rewards', r.id, r, authToken);
    console.log(`  ✅ Recompensa ${r.id} criada`);
  }
  
  console.log('✅ Catálogo criado com sucesso!');
}

async function seedInvite(authToken, code = DEMO_INVITE) {
  try {
    await createDocument('invites', code, {
      id: code,
      used: false,
      usedBy: null,
      createdBy: "seed"
    }, authToken);
    console.log(`✅ Convite ${code} criado!`);
  } catch (error) {
    if (error.message.includes('ALREADY_EXISTS')) {
      console.log(`⚠️  Convite ${code} já existe — mantido.`);
    } else {
      throw error;
    }
  }
}

async function seedEverything(authToken) {
  try {
    console.log('🚀 Iniciando seed via REST API...\n');
    
    await seedCatalog(authToken);
    await seedInvite(authToken, DEMO_INVITE);
    
    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('\n⚠️  NOTA: Este método REST API tem limitações:');
    console.log('   - Não cria agentes de exemplo (requer permissões de admin)');
    console.log('   - Não cria perfil de admin (requer Admin SDK)');
    console.log('   - Para seed completo, use o script seed.js com service-account.json');
  } catch (error) {
    console.error('❌ Erro no seed:', error.message);
    throw error;
  }
}

// Executa o seed
const args = process.argv.slice(2);
const authToken = args[0];

if (!authToken) {
  console.error('❌ Token de autenticação não fornecido!');
  console.error('\nComo obter o token:');
  console.error('1. Abra o app web no navegador');
  console.error('2. Faça login');
  console.error('3. Abra o DevTools (F12)');
  console.error('4. Vá em Application → Local Storage');
  console.error('5. Copie o valor de firebase:auth::token');
  console.error('\nUso: node seed-rest.js <AUTH_TOKEN>');
  process.exit(1);
}

seedEverything(authToken)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
