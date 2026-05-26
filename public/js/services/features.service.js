/* ═══════════════════════════════════════════════════════════════
   FEATURES SERVICE — controle de funcionalidades por papel (feature flags)
   Doc: config/features = { agent: {chave:bool}, client: {chave:bool} }
   Admin sempre vê tudo. Flag ausente ⇒ habilitada (fail-open seguro).
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, setDoc, watchDoc } from "../firebase/db.service.js";

/** Funcionalidades controláveis pelo admin. `home` é sempre habilitada. */
export const FEATURES = [
  { key: "cardapio", label: "Cardápio", icon: "📋" },
  { key: "monteSeuLanche", label: "Monte Seu Lanche", icon: "🔧" },
  { key: "sacola", label: "Sacola / Carrinho", icon: "🛒" },
  { key: "pedidos", label: "Pedidos", icon: "📦" },
  { key: "clube", label: "Clube", icon: "✨" },
  { key: "lojaMeritos", label: "Loja de Méritos", icon: "🎁" },
  { key: "missoes", label: "Missões", icon: "🎯" },
  { key: "convites", label: "Convites", icon: "🎫" },
  { key: "busca", label: "Busca", icon: "🔍" },
  { key: "perfil", label: "Perfil", icon: "👤" },
];

/** Papéis configuráveis (admin não entra: sempre liberado).
    Só existe "agent" (o usuário final; o motoboy também é agente). */
export const ROLES = [
  { key: "agent", label: "Agente" },
];

const PATH = "config/features";

/** Lê o doc de flags (ou {} se não existir). */
export async function loadFeatures() {
  try {
    return (await getDoc(PATH)) || {};
  } catch {
    return {};
  }
}

/** Observa o doc de flags em tempo real. */
export function watchFeatures(cb) {
  return watchDoc(PATH, (data) => cb(data || {}));
}

/** Persiste o doc de flags (merge). */
export async function saveFeatures(data) {
  return setDoc(PATH, data);
}

// ── Página Web/Desktop (admin-only) — liga/desliga em config/webPage ──
const WEB_PATH = "config/webPage";
/** A Versão Web/Desktop está habilitada? (padrão: habilitada). */
export async function loadWebEnabled() {
  try { const d = await getDoc(WEB_PATH); return d?.enabled !== false; } catch { return true; }
}
/** Liga/desliga a Versão Web/Desktop. */
export async function setWebEnabled(enabled) { return setDoc(WEB_PATH, { enabled: !!enabled }); }

/**
 * Decide se a funcionalidade está habilitada para o perfil.
 * - admin: sempre true
 * - flag ausente/indefinida: true (fail-open)
 * - home: sempre true
 */
export function isEnabled(features, role, key) {
  if (key === "home") return true;
  if (role === "admin") return true;
  const forRole = features?.[role];
  if (!forRole) return true;
  return forRole[key] !== false;
}
