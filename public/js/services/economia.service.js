/* ═══════════════════════════════════════════════════════════════
   ECONOMIA SERVICE — parâmetros do programa de méritos, via banco.
   Doc: config/economia = { meritoValue: number }
   meritoValue = valor de 1 mérito em R$ ao RESGATAR (pagar com méritos).
   Fallback: MERITO_VALUE_BRL (constante) quando o doc não existe.
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, setDoc } from "../firebase/db.service.js";
import { MERITO_VALUE_BRL } from "../utils/constants.js";

const PATH = "config/economia";

/** Valor (R$) de 1 mérito no resgate. Lê do banco; cai no padrão se ausente. */
export async function getMeritoValue() {
  try {
    const c = await getDoc(PATH);
    const v = Number(c?.meritoValue);
    return v > 0 ? v : MERITO_VALUE_BRL;
  } catch {
    return MERITO_VALUE_BRL;
  }
}

/** Admin: define o valor do mérito (R$). */
export async function setMeritoValue(value) {
  const v = Number(value);
  if (!(v > 0)) throw new Error("INVALID_VALUE");
  return setDoc(PATH, { meritoValue: v }, { merge: true });
}

export { MERITO_VALUE_BRL as DEFAULT_MERITO_VALUE };
