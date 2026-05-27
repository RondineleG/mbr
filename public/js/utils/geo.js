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

// Distância total de um circuito origem → seq[...] → origem.
function circuitKm(origin, seq) {
  let d = 0, cur = origin;
  for (const p of seq) { d += haversineKm(cur, p); cur = p; }
  return d + haversineKm(cur, origin);
}

// Melhoria 2-opt: desfaz cruzamentos invertendo trechos enquanto reduz a distância.
function twoOpt(origin, seq) {
  let best = seq.slice(), improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const cand = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
        if (circuitKm(origin, cand) < circuitKm(origin, best) - 1e-9) { best = cand; improved = true; }
      }
    }
  }
  return best;
}

/**
 * Roteirização (Problema do Caixeiro Viajante): vizinho-mais-próximo + 2-opt.
 * Parte da origem, visita cada ponto uma vez e retorna à origem.
 * @returns {{ order:number[], legs:number[], totalKm:number }}
 *   order = índices dos `points` na sequência de visita já otimizada.
 */
export function tspNearestNeighbor(origin, points) {
  // 1) Construção: vizinho-mais-próximo.
  const remaining = new Set(points.map((_, i) => i));
  let cur = origin; const nn = [];
  while (remaining.size) {
    let best = -1, bestD = Infinity;
    for (const i of remaining) { const d = haversineKm(cur, points[i]); if (d < bestD) { bestD = d; best = i; } }
    nn.push(best); cur = points[best]; remaining.delete(best);
  }
  // 2) Melhoria: 2-opt sobre a sequência de pontos (carregando o índice original).
  const seq = nn.map((i) => ({ ...points[i], _i: i }));
  const opt = twoOpt(origin, seq);
  const order = opt.map((p) => p._i);
  // 3) Distâncias por trecho (incluindo o retorno à origem).
  const legs = []; let prev = origin, total = 0;
  for (const i of order) { const d = haversineKm(prev, points[i]); legs.push(Math.round(d * 10) / 10); total += d; prev = points[i]; }
  const back = haversineKm(prev, origin); legs.push(Math.round(back * 10) / 10); total += back;
  return { order, legs, totalKm: Math.round(total * 10) / 10 };
}

/** URL de navegação (Google Maps) origem → paradas (na ordem) → origem. */
export function googleMapsRouteUrl(origin, orderedPoints) {
  const o = `${origin.lat},${origin.lng}`;
  const wpts = orderedPoints.map((p) => `${p.lat},${p.lng}`).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${o}` +
    (wpts ? `&waypoints=${encodeURIComponent(wpts)}` : "") + `&travelmode=driving`;
}
