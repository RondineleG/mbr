/* Captura index.html (PWA mobile) e web.html em larguras de desktop p/ diagnosticar layout. */
import { chromium } from "playwright";
import { loginApp, CREDS, skipBoot, dismissModals, sleep } from "./lib.mjs";

const OUT = "/tmp/claude-1000/-mnt-windows-Dev-MVP/5759e16c-9c9e-4ee4-b7a4-395d26a1df0c/scratchpad";
const BASE = "http://localhost:5050";

(async () => {
  const browser = await chromium.launch({ headless: true });

  // 1) index.html (o que o PWA abre) em janela de desktop — logado
  for (const [w, h, tag] of [[1280, 800, "desktop"], [420, 880, "phone"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "pt-BR" });
    const page = await ctx.newPage();
    await loginApp(page, CREDS.agente1);
    await sleep(1500);
    await page.screenshot({ path: `${OUT}/layout-index-${tag}.png` });
    console.log(`📸 layout-index-${tag}.png (${w}x${h})`);
    await ctx.close();
  }

  // 2) web.html?preview=1 (versão web/desktop com sidebar) — exige login
  for (const [w, h, tag] of [[1280, 800, "desktop"], [1440, 900, "wide"], [900, 800, "estreito"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "pt-BR" });
    const page = await ctx.newPage();
    await loginApp(page, CREDS.agente1);          // autentica no mesmo contexto
    await page.goto(`${BASE}/web.html?preview=1`, { waitUntil: "domcontentloaded" });
    await page.locator("#webApp").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    await sleep(2500);
    await dismissModals(page);
    await page.screenshot({ path: `${OUT}/layout-web-${tag}.png` });
    console.log(`📸 layout-web-${tag}.png (${w}x${h})`);
    await ctx.close();
  }

  await browser.close();
})();
