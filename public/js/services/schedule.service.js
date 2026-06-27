/* ═══════════════════════════════════════════════════════════════
   SCHEDULE SERVICE — grade de horários parametrizável (via painel admin).
   Doc: config/horarios = {
     orderCutoffHour: 0..23   // hora de corte dos pedidos (ex.: 13 → mude p/ 18)
     deliveryWindow:  string  // janela de entrega exibida (ex.: "18h–22h")
     mboxCutoffHour:  0..23   // hora de corte da MBox (na véspera do sábado)
   }
   Fallback: constantes quando o doc não existe. Cache em memória (cfg) para
   uso síncrono no checkout; carregado no boot e re-lido após salvar no admin.
   ═══════════════════════════════════════════════════════════════ */
import { getDoc, setDoc } from "../firebase/db.service.js";
import { ORDER_CUTOFF_HOUR, DELIVERY_WINDOW, MBOX_CUTOFF_HOUR } from "../utils/constants.js";

const PATH = "config/horarios";

const cfg = {
  orderCutoffHour: ORDER_CUTOFF_HOUR,
  deliveryWindow: DELIVERY_WINDOW,
  mboxCutoffHour: MBOX_CUTOFF_HOUR,
};

const validHour = (v) => Number.isInteger(v) && v >= 0 && v <= 23;

function applyDoc(d) {
  if (!d) return cfg;
  const oc = Number(d.orderCutoffHour); if (validHour(oc)) cfg.orderCutoffHour = oc;
  const mc = Number(d.mboxCutoffHour); if (validHour(mc)) cfg.mboxCutoffHour = mc;
  if (typeof d.deliveryWindow === "string" && d.deliveryWindow.trim()) cfg.deliveryWindow = d.deliveryWindow.trim();
  return cfg;
}

/** Lê do banco e atualiza o cache (chamar no boot). */
export async function loadSchedule() {
  try { applyDoc(await getDoc(PATH)); } catch { /* mantém defaults */ }
  return cfg;
}

/** Snapshot atual (síncrono) + getters de conveniência. */
export const getSchedule = () => ({ ...cfg });
export const orderCutoffHour = () => cfg.orderCutoffHour;
export const deliveryWindow = () => cfg.deliveryWindow;
export const mboxCutoffHour = () => cfg.mboxCutoffHour;

/** Admin: salva a grade (valida horas 0–23) e atualiza o cache. */
export async function setSchedule(patch) {
  const out = {};
  if (patch.orderCutoffHour != null) {
    const h = Number(patch.orderCutoffHour); if (!validHour(h)) throw new Error("INVALID_HOUR"); out.orderCutoffHour = h;
  }
  if (patch.mboxCutoffHour != null) {
    const h = Number(patch.mboxCutoffHour); if (!validHour(h)) throw new Error("INVALID_HOUR"); out.mboxCutoffHour = h;
  }
  if (patch.deliveryWindow != null) {
    const w = String(patch.deliveryWindow).trim(); if (!w) throw new Error("INVALID_WINDOW"); out.deliveryWindow = w;
  }
  await setDoc(PATH, out, { merge: true });
  applyDoc(out);
  return getSchedule();
}
