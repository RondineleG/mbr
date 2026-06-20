/* ═══════════════════════════════════════════════════════════════
   FLUXO INTEGRADO — um pedido real percorrendo as 3 personas em tempo real:
   cliente monta+pede → admin recebe+processa+envia → motoboy recebe+chat →
   cliente responde → motoboy marca entregue → cliente vê méritos.
   Usa 3 contextos de browser simultâneos e o Admin SDK p/ achar o pedido.
   ═══════════════════════════════════════════════════════════════ */
import { createRequire } from "module";
import { open, shooter, loginApp, loginAdmin, loginMotoboy, nav, adminNav, dismissModals, cardapioCat, CREDS, BASE, sleep } from "./lib.mjs";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const sa = require("../../service-account.json");
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const aauth = admin.auth();

const DIR = "docs/e2e/04-fluxo-integrado";

(async () => {
  const shot = shooter(DIR);
  const C = await open(); // cliente
  const A = await open(); // admin
  const M = await open(); // motoboy
  try {
    const u1 = await aauth.getUserByEmail(CREDS.agente1.email);
    const u3 = await aauth.getUserByEmail(CREDS.agente3.email);

    // ── 1) CLIENTE: login + monta um lanche INÉDITO (com adicional pago) ──
    await loginApp(C.page, CREDS.agente1);
    await shot(C.page, "cliente-home", { full: true });
    await nav(C.page, "cardapio");
    await dismissModals(C.page);
    await C.page.locator('#stepTabs [data-action="build-step"]').first().waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
    // vai à etapa "Extras" (índice 2) e adiciona Bacon Artesanal (idx 3) → vira criação
    await C.page.locator('#stepTabs [data-action="build-step"][data-step="2"]').first().click().catch(() => {});
    await sleep(800);
    await C.page.locator('[data-action="build-toggle"][data-step="queijos"][data-idx="3"]').first().click().catch(() => {});
    await sleep(600);
    await shot(C.page, "cliente-monta-lanche");
    // revisão (último passo)
    const steps = await C.page.locator('#stepTabs [data-action="build-step"]').count();
    await C.page.locator(`#stepTabs [data-action="build-step"][data-step="${Math.max(0, steps - 1)}"]`).first().click().catch(() => {});
    await sleep(800);
    await shot(C.page, "cliente-revisao-criacao");
    await C.page.locator('[data-action="build-add-go"]').first().click().catch(() => {});
    await sleep(1500);

    // ── 2) CLIENTE: sacola + checkout + pagamento (cartão, demo) ──
    await nav(C.page, "sacola");
    await shot(C.page, "cliente-sacola");
    await C.page.locator('[data-action="checkout"]').first().click().catch(() => {});
    await sleep(1500);
    await C.page.locator("#pcNum").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    await C.page.fill("#pcNum", "4111 1111 1111 1111").catch(() => {});
    await C.page.fill("#pcName", "AGENTE ALFA").catch(() => {});
    await C.page.fill("#pcExp", "12/30").catch(() => {});
    await C.page.fill("#pcCvv", "123").catch(() => {});
    await shot(C.page, "cliente-pagamento");
    await C.page.locator("#payConfirm").first().click().catch(() => {});
    await sleep(3500); // cria o pedido + navega p/ Pedidos
    await dismissModals(C.page);
    await shot(C.page, "cliente-pedido-criado", { full: true });

    // ── Descobre o ID do pedido recém-criado (Admin SDK, sem índice composto) ──
    let orderId = null, numero = null;
    for (let i = 0; i < 12 && !orderId; i++) {
      const snap = await db.collection("orders").where("userId", "==", u1.uid).get();
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
      const newest = docs[0];
      if (newest && Date.now() - (newest.criadoEm || 0) < 180000) { orderId = newest.id; numero = newest.numeroPedido; }
      else await sleep(2000);
    }
    if (!orderId) throw new Error("não achei o pedido recém-criado");
    console.log(`📦 pedido: ${numero} (${orderId})`);

    // Destrava a edição de status (simula "pós-corte das 13h": a regra trava o
    // status durante a janela de cancelamento). Sem isto o admin só vê o 🔒.
    await db.collection("orders").doc(orderId).update({ cancelavelAte: Date.now() - 60000 });

    // ── 3) ADMIN: recebe e processa o pedido em tempo real ──
    await loginAdmin(A.page, CREDS.admin);
    await dismissModals(A.page);
    await adminNav(A.page, "pedidos");   // o painel abre no Dashboard — vai p/ Pedidos
    const sel = `[data-action="order-status"][data-id="${orderId}"]`;
    await A.page.locator(sel).first().waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
    await A.page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {});
    await shot(A.page, "admin-pedido-recebido", { full: true });

    for (const [status, label] of [["analisando", "analisando"], ["aprovado", "aprovado"]]) {
      await A.page.locator(sel).first().selectOption(status).catch(() => {});
      await sleep(2200);
      await shot(A.page, `admin-status-${label}`);
    }
    // Atribui o motoboy (liberado após aprovado)
    const assign = `[data-action="order-assign"][data-id="${orderId}"]`;
    await A.page.locator(assign).first().selectOption(u3.uid).catch(() => {});
    await sleep(2200);
    await shot(A.page, "admin-motoboy-atribuido");
    // Produção → Enviado
    await A.page.locator(sel).first().selectOption("producao").catch(() => {});
    await sleep(2000);
    await A.page.locator(sel).first().selectOption("enviado").catch(() => {});
    await sleep(2500);
    await shot(A.page, "admin-pedido-enviado", { full: true });

    // ── 4) MOTOBOY: recebe a entrega, liga localização, abre o chat ──
    await loginMotoboy(M.page, CREDS.agente3);
    await dismissModals(M.page);
    await sleep(2500); // realtime: pedido "enviado" aparece em rota
    await shot(M.page, "motoboy-entrega-recebida", { full: true });
    // liga rastreio (📡) → começa a escrever tracking
    await M.page.locator("#motoShareBtn").click().catch(() => {});
    await sleep(5000); // deixa gravar ao menos uma posição
    // mapa/rota (agora há pedido geolocalizado ativo)
    if (await M.page.locator("#motoRouteWrap").isVisible().catch(() => false)) {
      await M.page.locator("#motoRouteWrap").scrollIntoViewIfNeeded().catch(() => {});
      await sleep(1500);
      await shot(M.page, "motoboy-rota-mapa", { full: true });
    }
    // abre o chat e manda mensagem ao cliente
    await M.page.locator(`[data-action="moto-chat"][data-id="${orderId}"]`).first().click().catch(() => {});
    await sleep(1200);
    await M.page.fill("#chatInput", "Olá! Já saí com seu pedido, chego em ~15 min. 🛵").catch(() => {});
    await M.page.locator("#chatSend").click().catch(() => {});
    await sleep(1800);
    await shot(M.page, "motoboy-mensagem-enviada");

    // ── 5) CLIENTE: vê rastreio + responde no chat ──
    await nav(C.page, "pedidos");
    await sleep(2500); // realtime: status enviado + tracking
    await dismissModals(C.page);
    await shot(C.page, "cliente-rastreio", { full: true });
    await C.page.locator(`[data-action="order-chat"][data-order-id="${orderId}"]`).first().click().catch(() => {});
    await sleep(1500); // carrega a mensagem do motoboy
    await shot(C.page, "cliente-recebe-mensagem");
    await C.page.fill("#chatInput", "Perfeito, muito obrigado! Estou te aguardando. 🙏").catch(() => {});
    await C.page.locator("#chatSend").click().catch(() => {});
    await sleep(1800);
    await shot(C.page, "cliente-responde");

    // motoboy vê a resposta
    await sleep(1500);
    await shot(M.page, "motoboy-recebe-resposta");
    await M.page.locator("#chatClose").click().catch(() => {});
    await sleep(600);

    // ── 6) MOTOBOY: marca como ENTREGUE ──
    await M.page.locator(`[data-action="moto-delivered"][data-id="${orderId}"]`).first().click().catch(() => {});
    await sleep(3000);
    await dismissModals(M.page);
    await shot(M.page, "motoboy-marca-entregue", { full: true });

    // ── 7) CLIENTE: pedido entregue + méritos creditados ──
    await C.page.locator("#chatClose").click().catch(() => {});
    await sleep(600);
    await nav(C.page, "pedidos");
    await sleep(2500);
    await shot(C.page, "cliente-pedido-entregue", { full: true });
    await nav(C.page, "clube");
    await C.page.locator('[data-action="clube-tab"][data-tab="historico"]').first().click().catch(() => {});
    await sleep(1800);
    await shot(C.page, "cliente-extrato-meritos", { full: true });

    console.log(`✅ fluxo integrado concluído · pedido ${numero}`);
  } catch (e) {
    console.error("❌ fluxo:", e.message);
  } finally {
    await C.browser.close(); await A.browser.close(); await M.browser.close();
    process.exit(0);
  }
})();
