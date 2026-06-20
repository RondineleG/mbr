/* ═══════════════════════════════════════════════════════════════
   Biblioteca de captura E2E (Playwright) — compartilhada pelas 3 personas.
   Sobe o app servido em http://localhost:5050 (mesma config Firebase de prod).
   ═══════════════════════════════════════════════════════════════ */
import { chromium } from "playwright";
import fs from "node:fs";

export const BASE = process.env.E2E_BASE || "http://localhost:5050";
export const CREDS = {
  admin:   { email: "admin@mrbur.com",   pass: "mrbur2025" },    // role admin → auto-redirect p/ /admin.html
  agente1: { email: "agente1@mrbur.com", pass: "agente123456" },
  agente2: { email: "agente2@mrbur.com", pass: "agente123456" },
  agente3: { email: "agente3@mrbur.com", pass: "agente123456" }, // motoboy → auto-redirect p/ /motoboy.html
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Abre um browser+contexto (geolocalização liberada p/ rastreio do motoboy). */
export async function open() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "pt-BR",
    geolocation: { latitude: -22.7392, longitude: -47.3312 },
    permissions: ["geolocation"],
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);
  return { browser, ctx, page };
}

/** Captura numerada e sequencial dentro de uma pasta de persona. */
export function shooter(dir) {
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  const log = [];
  return async function shot(page, name, { full = false } = {}) {
    n += 1;
    const file = `${String(n).padStart(2, "0")}-${name}.png`;
    try {
      await sleep(450); // deixa animações/listas assentarem
      await page.screenshot({ path: `${dir}/${file}`, fullPage: full });
      log.push({ file, name, ok: true });
      console.log(`  📸 ${file}`);
    } catch (e) {
      log.push({ file, name, ok: false, err: e.message });
      console.log(`  ⚠️  falhou ${file}: ${e.message}`);
    }
    return log;
  };
}

/** Dispensa o modal de instalação PWA ("Continuar no navegador") e overlays de modal. */
export async function dismissModals(page) {
  for (const sel of ["#pwaBrowser", ".modal-close", "#modalOverlay .modal-btn.ghost"]) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) { await el.click().catch(() => {}); await sleep(400); }
  }
  // tecla ESC fecha modais remanescentes
  await page.keyboard.press("Escape").catch(() => {});
}

/** Dispensa a animação de boot do app principal (remove o overlay à força se persistir). */
export async function skipBoot(page) {
  try { await page.locator("#bootSkip").click({ timeout: 6000 }); } catch {}
  const gone = await page.locator("#boot").waitFor({ state: "detached", timeout: 6000 }).then(() => true).catch(() => false);
  if (!gone) await page.evaluate(() => document.getElementById("boot")?.remove()).catch(() => {});
}

/**
 * Login em "/" e espera o destino. Por papel, o app redireciona sozinho:
 * admin → /admin.html (#adminShell), motoboy → /motoboy.html (#motoShell),
 * cliente fica em "/" (#app). `landSel` é o seletor do painel final.
 */
export async function loginAt(page, creds, landSel = "#app") {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await skipBoot(page);
  await page.locator("#loginEmail").waitFor({ state: "visible", timeout: 25000 });
  await page.fill("#loginEmail", creds.email);
  await page.fill("#loginPass", creds.pass);
  await page.click("#loginBtn");
  await page.locator(landSel).waitFor({ state: "visible", timeout: 45000 });
  await sleep(2500);                 // deixa perfil/produtos/Firestore assentarem
  await dismissModals(page);         // fecha o modal de instalação PWA que bloqueia cliques
}

/** Cliente: loga e fica no app principal (#app). */
export const loginApp   = (page, creds) => loginAt(page, creds, "#app");
/** Admin: loga e cai no painel (#adminShell, via auto-redirect). */
export const loginAdmin = (page, creds) => loginAt(page, creds, "#adminShell");
/** Motoboy: loga e cai na Central de Entregas (#motoShell, via auto-redirect). */
export const loginMotoboy = (page, creds) => loginAt(page, creds, "#motoShell");

/** Navega o app do cliente para uma página (home, cardapio, clube, busca, sacola, pedidos, convites, perfil). */
export async function nav(page, p) {
  await dismissModals(page);   // garante que nenhum modal/overlay intercepte o clique
  const active = () => page.locator(`#page-${p}.active`).waitFor({ state: "visible", timeout: 3500 }).then(() => true).catch(() => false);
  const loc = page.locator(`[data-action="nav"][data-page="${p}"]`);
  const count = await loc.count();
  for (let i = 0; i < count; i++) {
    const el = loc.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;  // pula itens de menu ocultos
    await el.click().catch(() => {});
    if (await active()) { await sleep(900); return; }
  }
  // fallback: abre o menu lateral e tenta de novo
  await page.locator('[data-action="toggle-sidemenu"], #menuBtn, .topbar-menu').first().click().catch(() => {});
  await sleep(400);
  await loc.first().click().catch(() => {});
  await active();
  await sleep(900);
}

/** Troca a categoria do cardápio (monte, dia, mbox, acomp, bebidas, sobremesas, exclusivos). */
export async function cardapioCat(page, c) {
  await page.locator(`[data-action="cardapio-cat"][data-cat="${c}"]`).first().click().catch(() => {});
  await sleep(1000);
}

/** Troca a seção do admin (dashboard, relatorios, pedidos, produtos, montar, lanchedia, mbox, clientes, missoes, recompensas, convites, acessos). */
export async function adminNav(page, section) {
  await page.locator(`[data-action="admin-nav"][data-section="${section}"]`).first().click().catch(() => {});
  await sleep(1600);
}

export { sleep };
