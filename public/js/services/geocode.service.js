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

/** Geocodifica um endereço (Nominatim) → {lat,lng} ou null. */
export async function geocode(addr) {
  if (!addr) return null;
  const q = [addr.street, addr.number, addr.neighborhood, addr.city, addr.uf, "Brasil"].filter(Boolean).join(", ");
  if (!q) return null;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, {
      headers: { "Accept": "application/json" },
    });
    const arr = await r.json();
    if (!Array.isArray(arr) || !arr.length) return null;
    return { lat: +Number(arr[0].lat).toFixed(6), lng: +Number(arr[0].lon).toFixed(6) };
  } catch { return null; }
}
