/* ═══════════════════════════════════════════════════════════════
   GEOCODE — CEP (ViaCEP) → endereço, e endereço → coordenadas (Nominatim/OSM).
   Tudo client-side e gratuito. Falhas degradam graciosamente (sem coords).
   ═══════════════════════════════════════════════════════════════ */

/** Consulta um CEP no ViaCEP. Retorna campos do endereço ou null. */
export async function lookupCep(cep) {
  const c = String(cep || "").replace(/\D/g, "");
  if (c.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
    const d = await r.json();
    if (!d || d.erro) return null;
    return { cep: d.cep || c, street: d.logradouro || "", neighborhood: d.bairro || "", city: d.localidade || "", uf: d.uf || "" };
  } catch { return null; }
}

// Uma consulta ao Nominatim. `params` é a querystring específica (q= ou postalcode=).
async function nominatim(params) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&${params}`, {
    headers: { "Accept": "application/json" },
  });
  const arr = await r.json();
  if (!Array.isArray(arr) || !arr.length) return null;
  return { lat: +Number(arr[0].lat).toFixed(6), lng: +Number(arr[0].lon).toFixed(6) };
}

/**
 * Geocodifica um endereço (Nominatim) → {lat,lng} ou null.
 * Tenta do mais específico ao mais amplo até obter um acerto — endereços
 * parciais (sem número, ou só bairro/cidade) ainda devolvem uma coordenada
 * aproximada, o que basta para frete, rota do motoboy e rastreio no mapa.
 */
export async function geocode(addr) {
  if (!addr) return null;
  const full = [addr.street, addr.number, addr.neighborhood, addr.city, addr.uf, "Brasil"].filter(Boolean).join(", ");
  const sansNumber = [addr.street, addr.neighborhood, addr.city, addr.uf, "Brasil"].filter(Boolean).join(", ");
  const area = [addr.neighborhood, addr.city, addr.uf, "Brasil"].filter(Boolean).join(", ");
  const cep = String(addr.cep || "").replace(/\D/g, "");
  const tries = [];
  if (full) tries.push(`q=${encodeURIComponent(full)}`);
  if (cep.length === 8) tries.push(`postalcode=${cep}`);
  if (sansNumber && sansNumber !== full) tries.push(`q=${encodeURIComponent(sansNumber)}`);
  if (area) tries.push(`q=${encodeURIComponent(area)}`);
  for (const p of tries) {
    try { const hit = await nominatim(p); if (hit) return hit; } catch { /* tenta a próxima estratégia */ }
  }
  return null;
}
