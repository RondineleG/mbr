/* ═══════════════════════════════════════════════════════════════
   GEO — distância (Haversine), frete por km e roteirização (TSP).
   ═══════════════════════════════════════════════════════════════ */
import { STORE, DELIVERY_BASE, DELIVERY_PER_KM, DELIVERY_FEE } from "./constants.js";

const toRad = (x) => (x * Math.PI) / 180;

/** Distância em km entre dois pontos {lat,lng}. */
export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return 0;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Frete: base + R$/km da sede ao destino. Sem coords → frete padrão. */
export function deliveryFeeFor(dest) {
  if (!dest || dest.lat == null) return DELIVERY_FEE;
  const km = haversineKm(STORE, dest);
  return Math.round((DELIVERY_BASE + DELIVERY_PER_KM * km) * 100) / 100;
}

/** km da sede ao destino (para exibição). */
export const kmFromStore = (dest) => Math.round(haversineKm(STORE, dest) * 10) / 10;

/**
 * Roteirização (Problema do Caixeiro Viajante) por vizinho-mais-próximo:
 * parte da origem, visita cada ponto uma vez e retorna à origem.
 * @returns {{ order:number[], legs:number[], totalKm:number }}
 *   order = índices dos `points` na sequência de visita.
 */
export function tspNearestNeighbor(origin, points) {
  const idx = points.map((_, i) => i);
  const order = [], legs = [];
  let cur = origin, total = 0;
  const remaining = new Set(idx);
  while (remaining.size) {
    let best = -1, bestD = Infinity;
    for (const i of remaining) { const d = haversineKm(cur, points[i]); if (d < bestD) { bestD = d; best = i; } }
    order.push(best); legs.push(Math.round(bestD * 10) / 10); total += bestD;
    cur = points[best]; remaining.delete(best);
  }
  const back = haversineKm(cur, origin); legs.push(Math.round(back * 10) / 10); total += back;
  return { order, legs, totalKm: Math.round(total * 10) / 10 };
}
