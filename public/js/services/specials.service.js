/* ═══════════════════════════════════════════════════════════════
   SPECIALS — Lanche do Dia (config/lancheDia) e MBox (config/mbox).
   Composição reaproveita os ingredientes do Monte Seu Lanche, mas
   SEM acréscimo: itens entram só como composição (preço fixo do combo).

   config/lancheDia = { price, dias: { seg:{name,icon,desc,composicao:[{name,icon}]}, ... } }
   config/mbox      = { price, name, icon, desc, composicao:[{name,icon}] }
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, setDoc, watchDoc, getCollection } from "../firebase/db.service.js";
import { WEEKDAYS, LANCHE_DIA_PRICE, MBOX_PRICE, MBOX_CUTOFF_DAY, MBOX_CUTOFF_HOUR, MBOX_STOCK } from "../utils/constants.js";

const DIA_PATH = "config/lancheDia";
const MBOX_PATH = "config/mbox";

const emptyDias = () => Object.fromEntries(WEEKDAYS.map((w) => [w.key, { name: "", icon: "🍔", desc: "", composicao: [] }]));

/* ─── Lanche do Dia ─── */
export async function loadLancheDia() {
  try {
    const d = await getDoc(DIA_PATH);
    if (d) return { price: Number(d.price) || LANCHE_DIA_PRICE, dias: { ...emptyDias(), ...(d.dias || {}) } };
  } catch { /* sem doc → vazio */ }
  return { price: LANCHE_DIA_PRICE, dias: emptyDias() };
}
export async function saveLancheDia(cfg) {
  return setDoc(DIA_PATH, { price: Number(cfg.price) || LANCHE_DIA_PRICE, dias: cfg.dias });
}
export function watchLancheDia(cb) {
  return watchDoc(DIA_PATH, (d) => cb(d
    ? { price: Number(d.price) || LANCHE_DIA_PRICE, dias: { ...emptyDias(), ...(d.dias || {}) } }
    : { price: LANCHE_DIA_PRICE, dias: emptyDias() }));
}

/** Chave do dia da semana atual ("seg"…"sab") ou null aos domingos. */
export function currentDailyKey(now = Date.now()) {
  const day = new Date(now).getDay(); // 0=dom … 6=sáb
  return WEEKDAYS.find((w) => w.day === day)?.key || null;
}

/** O lanche configurado para hoje (ou null se domingo / não cadastrado). */
export function dailyForToday(cfg, now = Date.now()) {
  const key = currentDailyKey(now);
  if (!key) return null;
  const d = cfg?.dias?.[key];
  if (!d || !d.composicao?.length) return null;
  return { key, ...d, price: cfg.price };
}

/* ─── MBox ─── */
export async function loadMbox() {
  try {
    const d = await getDoc(MBOX_PATH);
    if (d) return { price: Number(d.price) || MBOX_PRICE, name: d.name || "MBox Surpresa", icon: d.icon || "📦", desc: d.desc || "", composicao: d.composicao || [] };
  } catch { /* sem doc */ }
  return { price: MBOX_PRICE, name: "MBox Surpresa", icon: "📦", desc: "", composicao: [] };
}
export async function saveMbox(cfg) {
  return setDoc(MBOX_PATH, { price: Number(cfg.price) || MBOX_PRICE, name: cfg.name || "MBox Surpresa", icon: cfg.icon || "📦", desc: cfg.desc || "", composicao: cfg.composicao || [] });
}
export function watchMbox(cb) {
  return watchDoc(MBOX_PATH, (d) => cb(d
    ? { price: Number(d.price) || MBOX_PRICE, name: d.name || "MBox Surpresa", icon: d.icon || "📦", desc: d.desc || "", composicao: d.composicao || [] }
    : { price: MBOX_PRICE, name: "MBox Surpresa", icon: "📦", desc: "", composicao: [] }));
}

/* ─── Agendamento da MBox ─────────────────────────────────────────
   Pedidos até sexta 22h entram para o SÁBADO desta semana; após a sexta
   22h, vão para o sábado da semana seguinte. Cancelável/alterável até a
   sexta 22h anterior à entrega. ───────────────────────────────────── */
export function mboxSchedule(now = Date.now()) {
  const d = new Date(now);
  // Próximo sábado (>= hoje).
  const sat = new Date(d); sat.setHours(0, 0, 0, 0);
  sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7));
  // Corte = sexta 22h imediatamente antes desse sábado.
  let cutoff = new Date(sat); cutoff.setDate(cutoff.getDate() - 1); cutoff.setHours(MBOX_CUTOFF_HOUR, 0, 0, 0);
  // Já passou do corte (ou estamos no próprio sábado/depois) → sábado da semana seguinte.
  if (now >= cutoff.getTime()) {
    sat.setDate(sat.getDate() + 7);
    cutoff = new Date(sat); cutoff.setDate(cutoff.getDate() - 1); cutoff.setHours(MBOX_CUTOFF_HOUR, 0, 0, 0);
  }
  return { agendado: true, dataEntrega: sat.getTime(), cancelavelAte: cutoff.getTime() };
}

/* ─── Estoque da MBox por sábado ──────────────────────────────────
   Contagem ao vivo a partir dos pedidos (status != cancelado): MBox = 1
   unidade, MBox Dupla = 2. Limite compartilhado por sábado. ──────── */
export const mboxUnitsOf = (order) =>
  (order.items || []).reduce((a, it) => a + (it.mbox ? (it.qty || 1) * (it.mboxUnits || 1) : 0), 0);

export async function mboxReservedUnits(satTs) {
  const orders = await getCollection("orders", { where: [["dataEntrega", "==", satTs]] });
  return orders.reduce((sum, o) => o.status === "cancelado" ? sum : sum + mboxUnitsOf(o), 0);
}

/** Unidades restantes para o próximo sábado de entrega. */
export async function mboxRemainingForNext(now = Date.now()) {
  const { dataEntrega } = mboxSchedule(now);
  let reserved = 0;
  try { reserved = await mboxReservedUnits(dataEntrega); } catch { /* sem acesso/offline → assume cheio */ }
  return { sat: dataEntrega, remaining: Math.max(0, MBOX_STOCK - reserved), reserved, total: MBOX_STOCK };
}

export { MBOX_CUTOFF_DAY, MBOX_STOCK };
