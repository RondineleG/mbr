/* Captura da persona MOTOBOY (agente3, motoboy:true). Central de Entregas:
   resumo/KPIs, entregas em rota, rota PCV + mapa Leaflet, rastreio (📡 Localização). */
import { open, shooter, loginMotoboy, dismissModals, CREDS, sleep } from "./lib.mjs";

const DIR = "docs/e2e/02-motoboy";

(async () => {
  const { browser, page } = await open();
  const shot = shooter(DIR);
  try {
    // Login em "/"; o app redireciona o motoboy para /motoboy.html (Central de Entregas).
    await loginMotoboy(page, CREDS.agente3);
    await sleep(1500);
    await dismissModals(page);
    await shot(page, "central-entregas", { full: true });

    // Resumo/KPIs no topo
    await page.locator("#motoSummary").scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, "resumo-kpis");

    // Rota + mapa (só aparece com entregas ativas geolocalizadas)
    const rota = page.locator("#motoRouteWrap");
    if (await rota.isVisible().catch(() => false)) {
      await rota.scrollIntoViewIfNeeded().catch(() => {});
      await sleep(1500); // tiles do Leaflet
      await shot(page, "rota-mapa", { full: true });
    } else {
      await shot(page, "sem-rota-ativa");
    }

    // Entregas em rota / concluídas
    await page.locator("#motoActive").scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, "entregas-em-rota");
    await page.locator("#motoDone").scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, "entregas-concluidas");

    // Rastreio ao vivo: liga o compartilhamento de localização (📡 ON)
    await page.locator("#motoShareBtn").scrollIntoViewIfNeeded().catch(() => {});
    await page.locator("#motoShareBtn").click().catch(() => {});
    await sleep(1500);
    await shot(page, "localizacao-on");

    console.log("✅ motoboy: captura concluída");
  } catch (e) {
    console.error("❌ motoboy:", e.message);
  } finally {
    await browser.close();
  }
})();
