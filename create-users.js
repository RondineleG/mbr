/* ═══════════════════════════════════════════════════════════════
   CREATE USERS — Cria usuários no Firebase Auth + Firestore
   Uso: node create-users.js
   ═══════════════════════════════════════════════════════════════ */
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trabalhohowx'
});

const auth = admin.auth();
const db = admin.firestore();

// Função auxiliar para rank baseado em pontos
function rankFromPoints(points) {
  if (points >= 5000) return { level: 6, name: "MESTRE" };
  if (points >= 3000) return { level: 5, name: "ÔMEGA" };
  if (points >= 2000) return { level: 4, name: "SIGMA" };
  if (points >= 1000) return { level: 3, name: "DELTA" };
  if (points >= 500) return { level: 2, name: "GAMA" };
  return { level: 1, name: "ALFA" };
}

// Cria progresso inicial de missões para um usuário
async function createInitialMissionProgress(uid, userData) {
  try {
    const initialProgress = {
      uid,
      missions: {},
      completed: [],
      claimed: [],
      totalRewards: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Se o usuário já completou cadastro, marcar missão de signup
    if (userData.signupCompleted) {
      initialProgress.completed.push('signup');
      initialProgress.missions['signup'] = {
        progress: 100,
        completed: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      initialProgress.totalRewards += 50;
    }

    await db.collection('missionProgress').doc(uid).set(initialProgress);
    console.log(`✅ Progresso de missões inicializado: ${uid}`);
  } catch (error) {
    console.error(`❌ Erro ao criar progresso de missões: ${error.message}`);
  }
}

// Gera código de convite único
function generateInviteCode() {
  return 'MRB-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Cria convites para um usuário
async function createInvitesForUser(uid, count) {
  const inviteCodes = [];
  
  for (let i = 0; i < count; i++) {
    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias
    
    const inviteData = {
      id: code,
      token: code,
      criadoPor: uid,
      roleCriador: null,
      emailDestino: null,
      status: "ativo",
      dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
      dataExpiracao: expiresAt,
      dataUso: null,
      usadoPor: null,
      limiteUso: 1,
      totalUsos: 0
    };
    
    // Usar o código como ID do documento para compatibilidade com invite.service.js
    await db.collection('invites').doc(code).set(inviteData);
    inviteCodes.push(code);
  }
  
  return inviteCodes;
}

async function createUser(email, password, userData) {
  try {
    // Cria usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: false,
      disabled: false
    });

    console.log(`✅ Usuário criado no Auth: ${userRecord.uid}`);

    // Cria documento no Firestore
    const r = rankFromPoints(userData.points || 0);
    const firestoreData = {
      uid: userRecord.uid,
      name: userData.name || "Usuário",
      codename: userData.codename || "agente-novo",
      email: email,
      phone: userData.phone || "(11) 99999-9999",
      address: userData.address || {
        street: "Rua das Missões",
        number: "123",
        complement: "Apto 101",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zipCode: "01000-000"
      },
      points: userData.points || 0,
      level: r.level,
      rank: r.name,
      role: userData.role || "agent",
      invitesAvailable: userData.invitesAvailable || 0,
      invitedBy: userData.invitedBy || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userRecord.uid).set(firestoreData);
    console.log(`✅ Perfil criado no Firestore: ${userRecord.uid}`);
    console.log(`   Nome: ${userData.name}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Pontos: ${userData.points || 0}`);
    console.log(`   Rank: ${r.name}`);
    console.log(`   Telefone: ${userData.phone || "(11) 99999-9999"}`);
    console.log(`   Endereço: ${userData.address?.street || "Rua das Missões, 123"}`);

    // Criar progresso de missões inicial
    await createInitialMissionProgress(userRecord.uid, userData);

    // Criar convites se o usuário tiver invitesAvailable
    let inviteCodes = [];
    if (userData.invitesAvailable > 0) {
      inviteCodes = await createInvitesForUser(userRecord.uid, userData.invitesAvailable);
      console.log(`🎫 Convites criados: ${inviteCodes.join(', ')}`);
    }

    return { uid: userRecord.uid, ...firestoreData, inviteCodes };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log(`⚠️  Email ${email} já existe no Auth`);
      // Tenta buscar o usuário e atualizar o Firestore
      const userRecord = await auth.getUserByEmail(email);
      console.log(`   UID existente: ${userRecord.uid}`);
      
      const r = rankFromPoints(userData.points || 0);
      const firestoreData = {
        uid: userRecord.uid,
        name: userData.name || "Usuário",
        codename: userData.codename || "agente-novo",
        email: email,
        phone: userData.phone || "(11) 99999-9999",
        address: userData.address || {
          street: "Rua das Missões",
          number: "123",
          complement: "Apto 101",
          neighborhood: "Centro",
          city: "São Paulo",
          state: "SP",
          zipCode: "01000-000"
        },
        points: userData.points || 0,
        level: r.level,
        rank: r.name,
        role: userData.role || "agent",
        invitesAvailable: userData.invitesAvailable || 0,
        invitedBy: userData.invitedBy || null,
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('users').doc(userRecord.uid).set(firestoreData, { merge: true });
      console.log(`✅ Perfil atualizado no Firestore: ${userRecord.uid}`);
      
      // Criar progresso de missões se não existir
      await createInitialMissionProgress(userRecord.uid, userData);
      
      // Criar convites se o usuário tiver invitesAvailable
      let inviteCodes = [];
      if (userData.invitesAvailable > 0) {
        inviteCodes = await createInvitesForUser(userRecord.uid, userData.invitesAvailable);
        console.log(`🎫 Convites criados: ${inviteCodes.join(', ')}`);
      }
      
      return { uid: userRecord.uid, ...firestoreData, inviteCodes };
    } else {
      throw error;
    }
  }
}

async function createTestUsers() {
  console.log('🚀 Criando usuários de teste...\n');

  const allInviteCodes = {};

  // Usuário Admin
  console.log('👑 Criando usuário ADMIN...');
  const adminUser = await createUser(
    'admin@mrbur.com',
    'admin123456',
    {
      name: 'Comando Supremo',
      codename: 'comando-supremo',
      role: 'admin',
      points: 0,
      invitesAvailable: 99,
      phone: '(11) 98888-8888',
      address: {
        street: 'Av. Paulista',
        number: '1000',
        complement: 'Sala 1',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      }
    }
  );
  allInviteCodes['admin'] = adminUser.inviteCodes || [];

  // Usuários Normais (Agentes)
  console.log('\n👥 Criando usuários NORMAIS (agentes)...');
  
  const agente1 = await createUser(
    'agente1@mrbur.com',
    'agente123456',
    {
      name: 'Agente Alfa',
      codename: 'agente-alfa',
      role: 'agent',
      points: 100,
      invitesAvailable: 3,
      phone: '(11) 91111-1111',
      address: {
        street: 'Rua Augusta',
        number: '500',
        complement: 'Apto 12',
        neighborhood: 'Consolação',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01304-000'
      }
    }
  );
  allInviteCodes['agente1'] = agente1.inviteCodes || [];

  const agente2 = await createUser(
    'agente2@mrbur.com',
    'agente123456',
    {
      name: 'Agente Beta',
      codename: 'agente-beta',
      role: 'agent',
      points: 500,
      invitesAvailable: 5,
      phone: '(11) 92222-2222',
      address: {
        street: 'Rua Oscar Freire',
        number: '300',
        complement: 'Casa 1',
        neighborhood: 'Jardins',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01426-000'
      }
    }
  );
  allInviteCodes['agente2'] = agente2.inviteCodes || [];

  const agente3 = await createUser(
    'agente3@mrbur.com',
    'agente123456',
    {
      name: 'Agente Gama',
      codename: 'agente-gama',
      role: 'agent',
      points: 1500,
      invitesAvailable: 10,
      phone: '(11) 93333-3333',
      address: {
        street: 'Av. Rebouças',
        number: '2000',
        complement: 'Apto 45',
        neighborhood: 'Pinheiros',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '05402-000'
      }
    }
  );
  allInviteCodes['agente3'] = agente3.inviteCodes || [];

  console.log('\n🎉 Usuários criados com sucesso!');
  console.log('\n📋 Credenciais de teste:');
  console.log('   ADMIN: admin@mrbur.com / admin123456');
  console.log('   AGENTE 1: agente1@mrbur.com / agente123456');
  console.log('   AGENTE 2: agente2@mrbur.com / agente123456');
  console.log('   AGENTE 3: agente3@mrbur.com / agente123456');
  
  console.log('\n🎫 Códigos de Convite:');
  Object.entries(allInviteCodes).forEach(([user, codes]) => {
    if (codes.length > 0) {
      console.log(`   ${user.toUpperCase()}: ${codes.join(', ')}`);
    }
  });
}

// Executa a criação de usuários
createTestUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro ao criar usuários:', error);
    process.exit(1);
  });
