/* ═══════════════════════════════════════════════════════════════
   FORMAT — moeda, datas, máscaras de input, helpers de codinome
   ═══════════════════════════════════════════════════════════════ */
import { CODENAME_NUCLEO, CODENAME_EPITETO, RANKS } from "./constants.js";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 29.9 → "R$ 29,90" */
export const money = (n) => BRL.format(Number(n) || 0);

/** Apenas o número: 29.9 → "29,90" */
export const moneyPlain = (n) => (Number(n) || 0).toFixed(2).replace(".", ",");

/** Timestamp (Date | number | Firestore Timestamp) → "22/05 às 19:42" */
export function dateShort(value) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Timestamp (Firestore Timestamp | {seconds} | number | Date) → ms (0 se nulo). */
export const toMillis = (v) =>
  v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (v instanceof Date ? v.getTime() : (typeof v === "number" ? v : 0)));

/** Normaliza qualquer formato de data para Date. */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value.toDate === "function") return value.toDate(); // Firestore Timestamp
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

/** Gera um codinome aleatório com concordância de gênero: "falcao-dourado", "raposa-dourada". */
export function randomCodename() {
  const n = CODENAME_NUCLEO[Math.floor(Math.random() * CODENAME_NUCLEO.length)];
  const e = CODENAME_EPITETO[Math.floor(Math.random() * CODENAME_EPITETO.length)];
  return `${n.w}-${e[n.g]}`;
}

/** "falcao-dourado" → "FD" (iniciais para o avatar). */
export function codenameInitials(codename) {
  if (!codename) return "??";
  return codename.split("-").map((w) => (w[0] || "").toUpperCase()).join("");
}

/** Pontos acumulados → objeto de rank { level, name, min, next, progress }. */
export function rankFromPoints(points) {
  const p = Number(points) || 0;
  let current = RANKS[0];
  for (const r of RANKS) if (p >= r.min) current = r;
  const next = RANKS.find((r) => r.min > current.min) || null;
  const progress = next
    ? Math.min(100, Math.round(((p - current.min) / (next.min - current.min)) * 100))
    : 100;
  return { ...current, next, progress, points: p };
}

/** "GUARDIÃO - NÍVEL 3" para exibição na topbar/perfil. */
export function rankLabel(points) {
  const r = rankFromPoints(points);
  return `${r.name} - NÍVEL ${r.level}`;
}

/* ─── Máscaras de input ─── */
export function maskPhone(el) {
  let v = el.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  else if (v.length > 0) v = `(${v}`;
  el.value = v;
}

export function maskCep(el) {
  let v = el.value.replace(/\D/g, "").slice(0, 8);
  if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
  el.value = v;
}

/** Monta endereço legível a partir do objeto address. */
export function formatAddress(addr) {
  if (!addr) return "—";
  const line = [addr.street, addr.number, addr.comp].filter(Boolean).join(", ");
  return line || "—";
}
