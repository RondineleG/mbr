/* ═══════════════════════════════════════════════════════════════
   LANCHE SERVICE — "criações" do Monte Seu Lanche.
   Cada combinação ÚNICA de ingredientes vira um lanche com codinome
   determinístico (igual aos agentes: substantivo-adjetivo, minúsculo).
   O 1º a pedir uma combinação nova é o DONO e ganha +50 méritos;
   pedidos a partir de uma combinação existente contam como FORKS.
   Doc: lanches/{id}  (id derivado do hash da composição)
   ═══════════════════════════════════════════════════════════════ */
import { runTransaction, inc, tsNow, getDoc, getCollection, addDoc, updateDoc, setDoc } from "../firebase/db.service.js";
import { adjustPoints } from "./points.service.js";

export const CRIACAO_MERITOS = 50;     // bônus do criador da combinação nova
export const CAMPEAO_MERITOS = 100;    // bônus do campeão semanal (mais forkado)

/** Chave da semana ISO (ex.: "2026-W25"). */
export function weekKey(ts = Date.now()) {
  const d = new Date(ts);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Substantivos (comida/fogo) com gênero + adjetivos com forma m/f → concordância.
const NOUN = [
  { w: "brasa", g: "f" }, { w: "fogo", g: "m" }, { w: "chama", g: "f" }, { w: "bacon", g: "m" },
  { w: "cheddar", g: "m" }, { w: "smash", g: "m" }, { w: "blend", g: "m" }, { w: "combo", g: "m" },
  { w: "churrasco", g: "m" }, { w: "picanha", g: "f" }, { w: "costela", g: "f" }, { w: "lenha", g: "f" },
  { w: "carvao", g: "m" }, { w: "chapa", g: "f" }, { w: "grelha", g: "f" }, { w: "forno", g: "m" },
  { w: "espeto", g: "m" }, { w: "fogueira", g: "f" }, { w: "molho", g: "m" }, { w: "queijo", g: "m" },
  { w: "banquete", g: "m" }, { w: "fartura", g: "f" }, { w: "labareda", g: "f" }, { w: "fornalha", g: "f" },
];
const ADJ = [
  { m: "intenso", f: "intensa" }, { m: "defumado", f: "defumada" }, { m: "dourado", f: "dourada" },
  { m: "crocante", f: "crocante" }, { m: "suculento", f: "suculenta" }, { m: "artesanal", f: "artesanal" },
  { m: "caramelizado", f: "caramelizada" }, { m: "supremo", f: "suprema" }, { m: "picante", f: "picante" },
  { m: "trufado", f: "trufada" }, { m: "lendario", f: "lendaria" }, { m: "ardente", f: "ardente" },
  { m: "robusto", f: "robusta" }, { m: "nobre", f: "nobre" }, { m: "selvagem", f: "selvagem" },
  { m: "brutal", f: "brutal" }, { m: "faminto", f: "faminta" }, { m: "colossal", f: "colossal" },
  { m: "sagrado", f: "sagrada" }, { m: "imperial", f: "imperial" }, { m: "flamejante", f: "flamejante" },
  { m: "saboroso", f: "saborosa" }, { m: "apimentado", f: "apimentada" }, { m: "real", f: "real" },
];

// Hash determinístico (FNV-1a) de string → inteiro 32-bit.
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

/** Chave estável da composição (ordenada, minúscula) — independe da ordem de seleção. */
export function lancheKey(ingredientes) {
  return [...(ingredientes || [])].map((s) => String(s).trim().toLowerCase()).sort().join("|");
}

/** Codinome determinístico do lanche (ex.: "chapa-sagrada"), com concordância de gênero. */
export function gerarNomeLanche(ingredientes) {
  const h = hash(lancheKey(ingredientes));
  const n = NOUN[h % NOUN.length];
  const a = ADJ[Math.floor(h / NOUN.length) % ADJ.length];
  return `${n.w}-${a[n.g]}`;
}

const lancheId = (key) => "L" + hash(key).toString(36);

/**
 * Registra o pedido de um lanche montado.
 * - 1ª vez (combinação nova): cria o doc, define o DONO, retorna isNew=true.
 * - Já existe e quem pede não é o dono: conta como FORK.
 */
export async function registerLanche({ ingredientes, uid, nome, criadorNome = null }) {
  const key = lancheKey(ingredientes);
  const id = lancheId(key);
  return runTransaction(async (tx) => {
    const ex = await tx.get(`lanches/${id}`);
    if (!ex) {
      tx.set(`lanches/${id}`, {
        id, nome, ingredientes, criadoPor: uid, criadoPorNome: criadorNome, criadoEm: tsNow(),
        forks: 0, stars: 0, starredBy: [],
      });
      return { id, nome, isNew: true, criadoPor: uid };
    }
    if (ex.criadoPor !== uid) tx.update(`lanches/${id}`, { forks: inc(1) });
    return { id, nome: ex.nome || nome, isNew: false, criadoPor: ex.criadoPor };
  });
}

/** Lista as criações (mais forkadas/estreladas primeiro). */
export async function listLanches() {
  const all = await getCollection("lanches");
  return all.sort((a, b) => (b.forks || 0) - (a.forks || 0) || (b.stars || 0) - (a.stars || 0));
}
export const getLanche = (id) => getDoc(`lanches/${id}`);

/** Alterna a estrela do usuário no lanche; retorna o novo estado (bool). */
export async function toggleStar(id, uid) {
  const l = await getDoc(`lanches/${id}`);
  if (!l) return false;
  const set = new Set(l.starredBy || []);
  const has = set.has(uid);
  has ? set.delete(uid) : set.add(uid);
  const arr = [...set];
  await updateDoc(`lanches/${id}`, { starredBy: arr, stars: arr.length });
  return !has;
}

/** Comentários estilo GitHub (coleção própria, por lanche). */
export const addLancheComment = (lancheId, uid, nome, texto) =>
  addDoc("lancheComentarios", { lancheId, uid, nome: nome || "agente", texto: String(texto).slice(0, 500), criadoEm: tsNow() });
export async function listLancheComments(lancheId) {
  const c = await getCollection("lancheComentarios", { where: [["lancheId", "==", lancheId]] });
  const ms = (v) => v?.toMillis?.() ?? (typeof v === "number" ? v : 0);
  return c.sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
}

/**
 * Processa os itens "Monte Seu Lanche" de um carrinho no checkout:
 * registra cada combinação e credita +50 méritos ao criador da combinação nova.
 * Best-effort: nunca quebra o fluxo do pedido.
 */
export async function registerLanchesFromCart(cart, uid, criadorNome, orderId) {
  for (const it of (cart || [])) {
    if (!it?.custom || !it?.combo?.length) continue;
    try {
      const res = await registerLanche({ ingredientes: it.combo, uid, nome: it.name, criadorNome });
      if (res?.isNew) {
        await adjustPoints(uid, CRIACAO_MERITOS, `Criou o lanche ${res.nome}`, orderId);
      } else if (res?.criadoPor && res.criadoPor !== uid) {
        // Pedido a partir de combinação existente = FORK → registra evento da semana.
        await addDoc("forkEvents", { lancheId: res.id, lancheNome: res.nome, week: weekKey(), criadoEm: tsNow() });
      }
    } catch (e) {
      console.warn("[lanche] registro adiado:", e?.message || e);
    }
  }
}

/** Top criações da semana corrente (mais forkadas), já com dados do lanche. */
export async function topForkedThisWeek(limit = 5) {
  const wk = weekKey();
  let events = [];
  try { events = await getCollection("forkEvents", { where: [["week", "==", wk]] }); } catch { events = []; }
  const counts = {};
  for (const e of events) counts[e.lancheId] = (counts[e.lancheId] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const out = [];
  for (const [id, forksWeek] of top) {
    const l = await getDoc(`lanches/${id}`);
    if (l) out.push({ ...l, forksWeek });
  }
  return out;
}

/** Prêmio do campeão da semana (admin): credita méritos ao criador do mais forkado. */
export async function awardWeeklyChampion(bonus = CAMPEAO_MERITOS) {
  const wk = weekKey();
  const prev = await getDoc("config/criacoesAward").catch(() => null);
  if (prev?.week === wk) { const e = new Error("ALREADY_AWARDED"); e.award = prev; throw e; }
  const top = await topForkedThisWeek(1);
  if (!top.length) throw new Error("NO_CHAMPION");
  const champ = top[0];
  await adjustPoints(champ.criadoPor, bonus, `Campeão das Criações (${wk}): ${champ.nome}`);
  await setDoc("config/criacoesAward", {
    week: wk, lancheId: champ.id, nome: champ.nome,
    criadoPor: champ.criadoPor, criadoPorNome: champ.criadoPorNome || null,
    forksWeek: champ.forksWeek, bonus, awardedAt: tsNow(),
  });
  return { ...champ, bonus };
}
export const getLastAward = () => getDoc("config/criacoesAward");
