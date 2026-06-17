/* ═══════════════════════════════════════════════════════════════
   MIGRATE INVITES — Migra convites antigos para o novo formato
   Uso: node migrate-invites.js
   ═══════════════════════════════════════════════════════════════ */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'trabalhohowx'
});

const db = admin.firestore();

async function migrateInvites() {
  console.log('🔄 Iniciando migração de convites...\n');

  const snapshot = await db.collection('invites').get();
  
  if (snapshot.empty) {
    console.log('❌ Nenhum convite encontrado para migrar');
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  const batch = db.batch();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const oldId = doc.id;
    
    // Verificar se já está no novo formato
    if (data.id && data.id === oldId && data.criadoPor) {
      console.log(`⏭️  Pulando (já no novo formato): ${data.code || oldId}`);
      skipped++;
      continue;
    }

    try {
      // Determinar o código correto
      const code = data.code || data.id || oldId;
      const newDocId = code.toUpperCase();
      
      // Criar dados no novo formato
      const newData = {
        id: newDocId,
        token: newDocId,
        criadoPor: data.createdBy || data.criadoPor || null,
        roleCriador: data.roleCreator || data.roleCriador || "admin",
        emailDestino: data.emailDestino || null,
        status: normalizeStatus(data.status),
        dataCriacao: normalizeTimestamp(data.createdAt || data.dataCriacao),
        dataExpiracao: normalizeTimestamp(data.expiresAt || data.dataExpiracao),
        dataUso: null,
        usadoPor: data.usedBy || data.usadoPor || null,
        limiteUso: data.maxUses || data.limiteUso || 1,
        totalUsos: data.usesCount || data.totalUsos || 0
      };

      // Se o ID atual é diferente do novo ID, precisamos recriar
      if (oldId !== newDocId) {
        const newDocRef = db.collection('invites').doc(newDocId);
        batch.set(newDocRef, newData);
        
        // Deletar o documento antigo
        batch.delete(doc.ref);
        
        console.log(`📝 Migrando: ${oldId} → ${newDocId} (${code})`);
      } else {
        // Apenas atualizar o documento existente
        batch.update(doc.ref, newData);
        console.log(`📝 Atualizando: ${newDocId} (${code})`);
      }
      
      migrated++;
      
      // Executar batch a cada 500 operações
      if (migrated % 500 === 0) {
        await batch.commit();
        console.log(`✅ Batch de ${migrated} convites processado`);
      }
    } catch (err) {
      console.error(`❌ Erro ao migrar ${oldId}:`, err.message);
      errors++;
    }
  }

  // Executar batch final
  if (migrated > 0) {
    await batch.commit();
  }

  console.log('\n📊 Resumo da migração:');
  console.log(`   ✅ Migrados: ${migrated}`);
  console.log(`   ⏭️  Pulados: ${skipped}`);
  console.log(`   ❌ Erros: ${errors}`);
  console.log(`   📦 Total processado: ${snapshot.size}`);
}

function normalizeStatus(status) {
  if (!status) return "ativo";
  const statusMap = {
    "available": "ativo",
    "active": "ativo",
    "used": "usado",
    "cancelled": "cancelado",
    "revoked": "cancelado",
    "expired": "expirado"
  };
  return statusMap[status.toLowerCase()] || status.toLowerCase();
}

function normalizeTimestamp(ts) {
  if (!ts) return admin.firestore.FieldValue.serverTimestamp();
  if (ts._seconds) {
    return new admin.firestore.Timestamp(ts._seconds, ts._nanoseconds || 0);
  }
  if (ts.toDate) return ts;
  return ts;
}

migrateInvites()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  });
