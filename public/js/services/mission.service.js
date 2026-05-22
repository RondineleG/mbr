/* ═══════════════════════════════════════════════════════════════
   MISSION SERVICE — Sistema de missões e progresso automático
   Gerencia missões, progresso do usuário e recompensas
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, getCollection, setDoc, updateDoc, addDoc, watchDoc, watchCollection, runTransaction, tsNow } from "../firebase/db.service.js";

// Cache de missões carregadas do banco
let missionsCache = null;
let missionsCacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Carrega missões do banco de dados
 */
export async function loadMissions() {
  // Verificar cache
  if (missionsCache && missionsCacheTimestamp && (Date.now() - missionsCacheTimestamp < CACHE_DURATION)) {
    return missionsCache;
  }

  try {
    const missions = await getCollection('missions', {
      where: [['active', '==', true]],
      orderBy: ['order', 'asc']
    });

    // Converter array para objeto por ID
    const missionsMap = {};
    missions.forEach(mission => {
      missionsMap[mission.id] = mission;
    });

    // Atualizar cache
    missionsCache = missionsMap;
    missionsCacheTimestamp = Date.now();

    return missionsMap;
  } catch (error) {
    console.error('Erro ao carregar missões:', error);
    // Retornar missões padrão em caso de erro
    return getDefaultMissions();
  }
}

/**
 * Missões padrão (fallback)
 */
function getDefaultMissions() {
  return {
    signup: {
      id: 'signup',
      name: 'Agente Recrutado',
      description: 'Complete seu cadastro na Ordem',
      icon: '🎖️',
      reward: 50,
      type: 'single',
      condition: 'signup_completed'
    },
    first_order: {
      id: 'first_order',
      name: 'Primeira Mordida',
      description: 'Faça seu primeiro pedido',
      icon: '🎯',
      reward: 100,
      type: 'single',
      condition: 'orders_count >= 1'
    },
    orders_3: {
      id: 'orders_3',
      name: 'Agente Ativo',
      description: 'Complete 3 pedidos',
      icon: '📦',
      reward: 150,
      type: 'cumulative',
      target: 3,
      condition: 'orders_count >= 3'
    },
    orders_10: {
      id: 'orders_10',
      name: 'Veterano da Ordem',
      description: 'Complete 10 pedidos',
      icon: '🏆',
      reward: 500,
      type: 'cumulative',
      target: 10,
      condition: 'orders_count >= 10'
    },
    points_500: {
      id: 'points_500',
      name: 'Recruta Promissor',
      description: 'Acumule 500 pontos',
      icon: '⚡',
      reward: 50,
      type: 'cumulative',
      target: 500,
      condition: 'points >= 500'
    },
    points_1000: {
      id: 'points_1000',
      name: 'Agente Destaque',
      description: 'Acumule 1000 pontos',
      icon: '🌟',
      reward: 100,
      type: 'cumulative',
      target: 1000,
      condition: 'points >= 1000'
    },
    invite_1: {
      id: 'invite_1',
      name: 'Recrutador',
      description: 'Convide 1 amigo para a Ordem',
      icon: '🤝',
      reward: 200,
      type: 'cumulative',
      target: 1,
      condition: 'invites_used >= 1'
    },
    invite_3: {
      id: 'invite_3',
      name: 'Líder de Esquadrão',
      description: 'Convide 3 amigos para a Ordem',
      icon: '👥',
      reward: 500,
      type: 'cumulative',
      target: 3,
      condition: 'invites_used >= 3'
    },
    week_streak: {
      id: 'week_streak',
      name: 'Fidelidade Inabalável',
      description: 'Faça pedidos em 3 dias diferentes da semana',
      icon: '🔥',
      reward: 300,
      type: 'streak',
      target: 3,
      condition: 'week_days >= 3'
    },
    mbox_1: {
      id: 'mbox_1',
      name: 'Explorador MBox',
      description: 'Peça sua primeira MBox',
      icon: '📦',
      reward: 200,
      type: 'single',
      condition: 'mbox_count >= 1'
    }
  };
}

/**
 * Busca o progresso de missões de um usuário
 */
export async function getUserMissionProgress(uid) {
  const doc = await getDoc(`missionProgress/${uid}`);
  return doc || {
    uid,
    missions: {},
    completed: [],
    claimed: [],
    totalRewards: 0,
    updatedAt: tsNow()
  };
}

/**
 * Atualiza o progresso de missões automaticamente
 * Chamado quando há mudanças relevantes (pedidos, pontos, convites)
 */
export async function updateMissionProgress(uid, userData) {
  const currentProgress = await getUserMissionProgress(uid);
  const completed = currentProgress.completed || [];
  const missions = currentProgress.missions || {};
  
  // Carregar missões do banco
  const MISSIONS = await loadMissions();
  
  let newCompletions = [];
  let totalRewards = currentProgress.totalRewards || 0;

  // Verificar cada missão
  for (const [missionId, mission] of Object.entries(MISSIONS)) {
    // Pular se já completada
    if (completed.includes(missionId)) continue;

    let progress = 0;
    let isComplete = false;

    // Calcular progresso baseado no tipo de missão
    switch (mission.type) {
      case 'single':
        // Missões de tipo único (primeira vez)
        if (missionId === 'signup' && userData.signupCompleted) {
          isComplete = true;
          progress = 100;
        } else if (missionId === 'first_order' && userData.ordersCount >= 1) {
          isComplete = true;
          progress = 100;
        } else if (missionId === 'mbox_1' && userData.mboxCount >= 1) {
          isComplete = true;
          progress = 100;
        }
        break;

      case 'cumulative':
        // Missões cumulativas
        const target = mission.target || 1;
        if (missionId === 'orders_3' || missionId === 'orders_10') {
          progress = Math.min(100, (userData.ordersCount / target) * 100);
          isComplete = userData.ordersCount >= target;
        } else if (missionId === 'points_500' || missionId === 'points_1000') {
          progress = Math.min(100, (userData.points / target) * 100);
          isComplete = userData.points >= target;
        } else if (missionId === 'invite_1' || missionId === 'invite_3') {
          progress = Math.min(100, (userData.invitesUsed / target) * 100);
          isComplete = userData.invitesUsed >= target;
        }
        break;

      case 'streak':
        // Missões de sequência
        if (missionId === 'week_streak') {
          const streakTarget = mission.target || 3;
          progress = Math.min(100, (userData.weekDays / streakTarget) * 100);
          isComplete = userData.weekDays >= streakTarget;
        }
        break;
    }

    // Atualizar progresso da missão
    missions[missionId] = {
      progress: Math.round(progress),
      completed: isComplete,
      updatedAt: tsNow()
    };

    // Se completou, adicionar às novas conclusões
    if (isComplete && !completed.includes(missionId)) {
      newCompletions.push(missionId);
      totalRewards += mission.reward;
    }
  }

  // Se houver novas conclusões, atualizar
  if (newCompletions.length > 0) {
    const updatedCompleted = [...completed, ...newCompletions];
    
    await setDoc(`missionProgress/${uid}`, {
      uid,
      missions,
      completed: updatedCompleted,
      totalRewards,
      updatedAt: tsNow()
    });

    // Dar recompensas (pontos)
    if (totalRewards > currentProgress.totalRewards) {
      const rewardDifference = totalRewards - currentProgress.totalRewards;
      await addPointsReward(uid, rewardDifference, newCompletions);
    }

    return { newCompletions, totalRewards };
  }

  // Atualizar progresso mesmo sem novas conclusões
  await setDoc(`missionProgress/${uid}`, {
    uid,
    missions,
    completed,
    totalRewards,
    updatedAt: tsNow()
  });

  return { newCompletions: [], totalRewards };
}

/**
 * Adiciona pontos de recompensa ao usuário
 */
async function addPointsReward(uid, points, completedMissions) {
  try {
    await runTransaction(async (tx) => {
      const userDoc = await tx.get(`users/${uid}`);
      if (!userDoc) throw new Error('User not found');
      
      const currentPoints = userDoc.data().points || 0;
      const newPoints = currentPoints + points;
      
      tx.update(`users/${uid}`, {
        points: newPoints
      });

      // Registrar no histórico de pontos
      const historyId = `points_${Date.now()}`;
      tx.set(`pointsHistory/${historyId}`, {
        userId: uid,
        type: 'mission_reward',
        amount: points,
        description: `Missões completadas: ${completedMissions.join(', ')}`,
        createdAt: tsNow()
      });
    });

    return true;
  } catch (error) {
    console.error('Erro ao adicionar recompensa:', error);
    return false;
  }
}

/**
 * Busca missões disponíveis com progresso do usuário
 */
export async function getMissionsWithProgress(uid) {
  const progress = await getUserMissionProgress(uid);
  const completed = progress.completed || [];
  const missions = progress.missions || {};
  
  // Carregar missões do banco
  const MISSIONS = await loadMissions();

  return Object.entries(MISSIONS).map(([id, mission]) => ({
    ...mission,
    progress: missions[id]?.progress || 0,
    completed: completed.includes(id),
    locked: isMissionLocked(id, completed)
  }));
}

/**
 * Verifica se uma missão está bloqueada (depende de outras)
 */
function isMissionLocked(missionId, completed) {
  // Exemplo: orders_10 só desbloqueia após orders_3
  if (missionId === 'orders_10' && !completed.includes('orders_3')) {
    return true;
  }
  if (missionId === 'points_1000' && !completed.includes('points_500')) {
    return true;
  }
  if (missionId === 'invite_3' && !completed.includes('invite_1')) {
    return true;
  }
  return false;
}

/**
 * Calcula estatísticas do usuário para missões
 */
export async function calculateUserStats(uid) {
  const orders = await getCollection('orders', {
    where: [['userId', '==', uid]]
  });

  const userDoc = await getDoc(`users/${uid}`);
  const user = userDoc || {};

  // Calcular dias diferentes da semana com pedidos
  const orderDays = new Set();
  orders.forEach(order => {
    if (order.criadoEm) {
      const date = new Date(order.criadoEm);
      orderDays.add(date.getDay()); // 0-6 (Domingo-Sábado)
    }
  });

  // Contar MBox
  const mboxCount = orders.filter(order => 
    order.items?.some(item => item.category === 'mbox' || item.name?.toLowerCase().includes('mbox'))
  ).length;

  return {
    ordersCount: orders.length,
    points: user.points || 0,
    invitesUsed: user.invitesUsed || 0,
    weekDays: orderDays.size,
    mboxCount: mboxCount
  };
}

/**
 * Resgata recompensa de uma missão específica
 */
export async function claimMissionReward(uid, missionId) {
  try {
    const progress = await getUserMissionProgress(uid);
    const completed = progress.completed || [];
    const claimed = progress.claimed || [];
    
    // Verificar se a missão foi completada e ainda não foi resgatada
    if (!completed.includes(missionId)) {
      throw new Error('Mission not completed');
    }
    if (claimed.includes(missionId)) {
      throw new Error('Mission already claimed');
    }
    
    // Carregar missões do banco
    const MISSIONS = await loadMissions();
    const mission = MISSIONS[missionId];
    if (!mission) {
      throw new Error('Mission not found');
    }
    
    // Adicionar pontos e marcar como resgatado
    await runTransaction(async (tx) => {
      const userDoc = await tx.get(`users/${uid}`);
      if (!userDoc) throw new Error('User not found');
      
      const currentPoints = userDoc.data().points || 0;
      const newPoints = currentPoints + mission.reward;
      
      tx.update(`users/${uid}`, {
        points: newPoints
      });

      // Registrar no histórico de pontos
      const historyId = `points_${Date.now()}`;
      tx.set(`pointsHistory/${historyId}`, {
        userId: uid,
        type: 'mission_claim',
        amount: mission.reward,
        description: `Missão resgatada: ${mission.name}`,
        createdAt: tsNow()
      });
      
      // Atualizar progresso da missão
      const updatedClaimed = [...claimed, missionId];
      tx.update(`missionProgress/${uid}`, {
        claimed: updatedClaimed,
        totalRewards: (progress.totalRewards || 0) + mission.reward
      });
    });

    return { success: true, reward: mission.reward };
  } catch (error) {
    console.error('Erro ao resgatar recompensa:', error);
    throw error;
  }
}

/**
 * Watch do progresso de missões em tempo real
 */
export function watchMissionProgress(uid, callback) {
  return watchDoc(`missionProgress/${uid}`, (data) => {
    if (data) {
      callback(data);
    } else {
      callback({
        uid,
        missions: {},
        completed: [],
        claimed: [],
        totalRewards: 0,
        updatedAt: tsNow()
      });
    }
  });
}