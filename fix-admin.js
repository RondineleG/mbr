/* ═══════════════════════════════════════════════════════════════
   FIX ADMIN — Reseta senha do usuário admin e garante perfil correto
   Uso: node fix-admin.js
   ═══════════════════════════════════════════════════════════════ */
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'projetohowx'
});

const auth = admin.auth();
const db = admin.firestore();

async function fixAdminUser() {
  try {
    const email = 'admin@mrbur.com';
    const newPassword = 'admin123456';

    console.log('🔧 Corrigindo usuário admin...');

    // Busca usuário pelo email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Usuário encontrado: ${userRecord.uid}`);

    // Reseta a senha
    await auth.updateUser(userRecord.uid, {
      password: newPassword
    });
    console.log(`✅ Senha resetada para: ${newPassword}`);

    // Garante que o perfil no Firestore está correto
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      console.log('⚠️  Perfil não existe no Firestore, criando...');
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        name: 'Comando Supremo',
        codename: 'comando-supremo',
        email: email,
        phone: '',
        address: {},
        points: 0,
        level: 1,
        rank: 'MESTRE',
        role: 'admin',
        invitesAvailable: 99,
        invitedBy: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      console.log('✅ Perfil existe no Firestore, atualizando role...');
      await db.collection('users').doc(userRecord.uid).update({
        role: 'admin',
        invitesAvailable: 99,
        rank: 'MESTRE',
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log('\n🎉 Admin corrigido com sucesso!');
    console.log('\n📋 Credenciais:');
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${newPassword}`);
    console.log(`   UID: ${userRecord.uid}`);

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log('❌ Usuário admin não encontrado no Auth');
      console.log('   Criando novo usuário admin...');
      
      const userRecord = await auth.createUser({
        email: 'admin@mrbur.com',
        password: 'admin123456',
        emailVerified: false,
        disabled: false
      });

      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        name: 'Comando Supremo',
        codename: 'comando-supremo',
        email: 'admin@mrbur.com',
        phone: '',
        address: {},
        points: 0,
        level: 1,
        rank: 'MESTRE',
        role: 'admin',
        invitesAvailable: 99,
        invitedBy: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Novo usuário admin criado!');
      console.log(`   Email: admin@mrbur.com`);
      console.log(`   Senha: admin123456`);
    } else {
      console.error('❌ Erro:', error);
      throw error;
    }
  }
}

fixAdminUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
