/* ═══════════════════════════════════════════════════════════════
   LANCHE SERVICE — "criações" do Monte Seu Lanche.
   Cada combinação ÚNICA de ingredientes vira um lanche com codinome
   determinístico (igual aos agentes: substantivo-adjetivo, minúsculo).
   O 1º a pedir uma combinação nova é o DONO e ganha +50 méritos;
   pedidos a partir de uma combinação existente contam como FORKS.
   Doc: lanches/{id}  (id derivado do hash da composição)
   ═══════════════════════════════════════════════════════════════ */
import { runTransaction, inc, tsNow } from "../firebase/db.service.js";
import { adjustPoints } from "./points.service.js";

export const CRIACAO_MERITOS = 50;

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
export async function registerLanche({ ingredientes, uid, nome }) {
  const key = lancheKey(ingredientes);
  const id = lancheId(key);
  return runTransaction(async (tx) => {
    const ex = await tx.get(`lanches/${id}`);
    if (!ex) {
      tx.set(`lanches/${id}`, {
        id, nome, ingredientes, criadoPor: uid, criadoEm: tsNow(),
        forks: 0, stars: 0,
      });
      return { id, nome, isNew: true, criadoPor: uid };
    }
    if (ex.criadoPor !== uid) tx.update(`lanches/${id}`, { forks: inc(1) });
    return { id, nome: ex.nome || nome, isNew: false, criadoPor: ex.criadoPor };
  });
}

/**
 * Processa os itens "Monte Seu Lanche" de um carrinho no checkout:
 * registra cada combinação e credita +50 méritos ao criador da combinação nova.
 * Best-effort: nunca quebra o fluxo do pedido.
 */
export async function registerLanchesFromCart(cart, uid, orderId) {
  for (const it of (cart || [])) {
    if (!it?.custom || !it?.combo?.length) continue;
    try {
      const res = await registerLanche({ ingredientes: it.combo, uid, nome: it.name });
      if (res?.isNew) await adjustPoints(uid, CRIACAO_MERITOS, `Criou o lanche ${res.nome}`, orderId);
    } catch (e) {
      console.warn("[lanche] registro adiado:", e?.message || e);
    }
  }
}
