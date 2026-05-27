/* ═══════════════════════════════════════════════════════════════
   BUILD STEPS — ingredientes do "Monte Seu Lanche" no Firestore.
   Doc: config/montar = { steps: [...], basePrice: number }
   Fallback: BUILD_STEPS/BUILD_BASE_PRICE (constants) quando não há doc.
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, setDoc, watchDoc } from "../firebase/db.service.js";
import { BUILD_STEPS, BUILD_BASE_PRICE } from "../utils/constants.js";

const PATH = "config/montar";

const clone = (v) => JSON.parse(JSON.stringify(v));

/** Carrega { steps, basePrice }. Cai no padrão se o doc não existir. */
export async function loadBuildSteps() {
  try {
    const d = await getDoc(PATH);
    if (d?.steps?.length) return { steps: d.steps, basePrice: Number(d.basePrice) || BUILD_BASE_PRICE };
  } catch { /* offline/sem doc → padrão */ }
  return { steps: clone(BUILD_STEPS), basePrice: BUILD_BASE_PRICE };
}

/** Persiste os ingredientes editados pelo admin. */
export async function saveBuildSteps(steps, basePrice) {
  return setDoc(PATH, { steps, basePrice: Number(basePrice) || BUILD_BASE_PRICE });
}

/** Observa mudanças ao vivo (cardápio reflete edições do admin sem reload). */
export function watchBuildSteps(cb) {
  return watchDoc(PATH, (d) => {
    if (d?.steps?.length) cb({ steps: d.steps, basePrice: Number(d.basePrice) || BUILD_BASE_PRICE });
    else cb({ steps: clone(BUILD_STEPS), basePrice: BUILD_BASE_PRICE });
  });
}

/** Padrão (para o admin oferecer "restaurar ingredientes originais"). */
export function defaultBuildSteps() {
  return { steps: clone(BUILD_STEPS), basePrice: BUILD_BASE_PRICE };
}
