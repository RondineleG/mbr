/* Captura da persona CLIENTE (agente1). Cobre login, Monte Seu Lanche, sacola,
   pagamento (cartão/pix/méritos), pedidos, clube, busca, convites, perfil e a versão web. */
import { open, shooter, loginApp, nav, cardapioCat, dismissModals, CREDS, BASE, sleep } from "./lib.mjs";

const DIR = "docs/e2e/01-cliente";

(async () => {
  const { browser, page } = await open();
  const shot = shooter(DIR);
  try {
    // 1) Login
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.locator("#bootSkip").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    await shot(page, "boot-intro");
    await loginApp(page, CREDS.agente1);

    // 2) Home
    await shot(page, "home", { full: true });

    // 3) Cardápio — Monte Seu Lanche (wizard etapa a etapa)
    await nav(page, "cardapio");
    await dismissModals(page);
    // espera o wizard popular (steps vêm do Firestore)
    await page.locator('#stepTabs [data-action="build-step"]').first().waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
    await shot(page, "cardapio-monte-passo1");
    const steps = await page.locator('#stepTabs [data-action="build-step"]').count();
    for (let i = 1; i < Math.min(steps, 6); i++) {
      await page.locator(`#stepTabs [data-action="build-step"][data-step="${i}"]`).first().click().catch(() => {});
      await sleep(800);
      await shot(page, `cardapio-monte-passo${i + 1}`);
    }
    // Categorias do cardápio
    for (const c of ["dia", "mbox", "acomp", "bebidas", "sobremesas"]) {
      await cardapioCat(page, c);
      await shot(page, `cardapio-${c}`);
    }

    // 4) Monta um lanche e adiciona à sacola
    await cardapioCat(page, "monte");
    // vai para a etapa de revisão (último passo) e adiciona
    await page.locator(`[data-action="build-step"][data-step="${Math.max(0, steps - 1)}"]`).first().click().catch(() => {});
    await sleep(900);
    await shot(page, "cardapio-revisao");
    await page.locator('[data-action="build-add-go"]').first().click().catch(async () => {
      await page.locator('[data-action="build-add-continue"]').first().click().catch(() => {});
    });
    await sleep(1500);

    // 5) Sacola
    await nav(page, "sacola");
    await shot(page, "sacola", { full: true });

    // 6) Pagamento (abre o modal e percorre as abas)
    await page.locator('[data-action="checkout"]').first().click().catch(() => {});
    await sleep(1500);
    await page.locator("#payCartao, .pay-tabs").first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    await shot(page, "pagamento-cartao");
    await page.locator('[data-pay="pix"]').first().click().catch(() => {});
    await sleep(800);
    await shot(page, "pagamento-pix");
    await page.locator('[data-pay="meritos"]').first().click().catch(() => {});
    await sleep(800);
    await shot(page, "pagamento-meritos");
    await page.locator("#payCancel").first().click().catch(() => {}); // não finaliza (evita poluir prod)
    await sleep(800);
    await dismissModals(page); // garante que o modal de pagamento fechou antes de navegar

    // 7) Pedidos (timeline/status)
    await nav(page, "pedidos");
    await shot(page, "pedidos", { full: true });

    // 8) Clube — extrato + criações
    await nav(page, "clube");
    await shot(page, "clube", { full: true });
    for (const t of ["criacoes", "historico", "missoes", "ranking", "recompensas"]) {
      await page.locator(`[data-action="clube-tab"][data-tab="${t}"]`).first().click().catch(() => {});
      await sleep(1100);
      await shot(page, `clube-${t}`, { full: true });
    }

    // 9) Busca
    await nav(page, "busca");
    await shot(page, "busca");

    // 10) Convites
    await nav(page, "convites");
    await shot(page, "convites", { full: true });

    // 11) Perfil
    await nav(page, "perfil");
    await shot(page, "perfil", { full: true });

    // 12) Versão Web / Desktop (web.html)
    await page.goto(`${BASE}/web.html`, { waitUntil: "domcontentloaded" });
    await sleep(2500);
    await shot(page, "web-inicio", { full: true });
    for (const g of ["cardapio", "sacola", "pedidos", "clube"]) {
      await page.locator(`.web-navitem[data-go="${g}"], [data-go="${g}"]`).first().click().catch(() => {});
      await sleep(1500);
      await shot(page, `web-${g}`, { full: true });
    }

    console.log("✅ cliente: captura concluída");
  } catch (e) {
    console.error("❌ cliente:", e.message);
  } finally {
    await browser.close();
  }
})();
