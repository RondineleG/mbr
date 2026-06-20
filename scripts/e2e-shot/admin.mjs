/* Captura da persona ADMIN (admin.html). Percorre todas as seções do painel. */
import { open, shooter, loginAdmin, adminNav, dismissModals, CREDS, sleep } from "./lib.mjs";

const DIR = "docs/e2e/03-admin";

const SECTIONS = [
  ["dashboard",   "dashboard"],
  ["relatorios",  "relatorios"],
  ["pedidos",     "pedidos"],
  ["produtos",    "produtos"],
  ["montar",      "monte-seu-lanche"],
  ["lanchedia",   "lanche-do-dia"],
  ["mbox",        "mbox"],
  ["clientes",    "agentes"],
  ["missoes",     "missoes"],
  ["recompensas", "recompensas"],
  ["convites",    "convites"],
  ["acessos",     "funcionalidades"],
];

(async () => {
  const { browser, page } = await open();
  const shot = shooter(DIR);
  try {
    await loginAdmin(page, CREDS.admin); // loga em "/" e cai no #adminShell via auto-redirect
    await dismissModals(page);
    await shot(page, "dashboard", { full: true }); // já entra no dashboard

    for (const [section, name] of SECTIONS) {
      await adminNav(page, section);
      await dismissModals(page);
      await shot(page, name, { full: true });
    }

    console.log("✅ admin: captura concluída");
  } catch (e) {
    console.error("❌ admin:", e.message);
  } finally {
    await browser.close();
  }
})();
