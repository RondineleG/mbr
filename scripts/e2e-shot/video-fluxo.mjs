/* ═══════════════════════════════════════════════════════════════
   VÍDEO DO FLUXO INTEGRADO — grava 1 vídeo .webm por persona enquanto
   um pedido real percorre as 3 contas em tempo real:
   cliente monta+pede → admin recebe+aprova+atribui motoboy+envia →
   motoboy recebe+rastreia+chat → cliente responde no chat →
   motoboy marca entregue → cliente vê o pedido entregue + méritos.

   Saída: docs/e2e/videos/{cliente,admin,motoboy}.webm + RESUMO.md
   Uso:   node scripts/e2e-shot/video-fluxo.mjs   (server em :5050 no ar)
   ═══════════════════════════════════════════════════════════════ */
import { createRequire } from "module";
import fs from "node:fs";
import { open, closeVideo, shooter, loginApp, loginAdmin, loginMotoboy, nav, adminNav, dismissModals, CREDS, sleep } from "./lib.mjs";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const sa = require("../../service-account.json");
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const aauth = admin.auth();

const VDIR = "docs/e2e/videos";
const SDIR = "docs/e2e/videos/shots";
fs.mkdirSync(VDIR, { recursive: true });

// ── Rastreador de passos: registra ✅/❌, tempo (p/ sincronizar narração) e nunca aborta ──
const steps = [];
let T0 = Date.now();
async function step(label, fn) {
  const t = Date.now() - T0; // tempo (ms) desde o início da gravação, no INÍCIO do passo
  try { await fn(); steps.push({ label, ok: true, t }); console.log(`  ✅ ${label}`); }
  catch (e) { steps.push({ label, ok: false, err: e.message, t }); console.log(`  ❌ ${label} — ${e.message}`); }
}

(async () => {
  const shot = shooter(SDIR);
  const C = await open({ video: VDIR }); // cliente
  const A = await open({ video: VDIR }); // admin
  const M = await open({ video: VDIR }); // motoboy
  T0 = Date.now(); // referência de tempo p/ a timeline (≈ início das gravações)
  let orderId = null, numero = null;

  try {
    const u1 = await aauth.getUserByEmail(CREDS.agente1.email);
    const u3 = await aauth.getUserByEmail(CREDS.agente3.email);

    // ── 1) CLIENTE: login + monta um lanche inédito (vira "criação") ──
    await step("Cliente · login no app", async () => { await loginApp(C.page, CREDS.agente1); });
    await shot(C.page, "01-cliente-home", { full: true });

    await step("Cliente · abre o cardápio / Monte Seu Lanche", async () => {
      await nav(C.page, "cardapio");
      await dismissModals(C.page);
      await C.page.locator('#stepContent .menu-item').first().waitFor({ state: "visible", timeout: 35000 });
    });
    await step("Cliente · adiciona adicional (Extras) → vira criação", async () => {
      await C.page.locator('#stepTabs [data-action="build-step"][data-step="2"]').first().click().catch(() => {});
      await sleep(800);
      await C.page.locator('[data-action="build-toggle"][data-step="queijos"][data-idx="3"]').first().click().catch(() => {});
      await sleep(600);
    });
    await shot(C.page, "02-cliente-monta-lanche");
    await step("Cliente · avança até a revisão e adiciona à sacola", async () => {
      const total = await C.page.locator('#stepTabs [data-action="build-step"]').count();
      await C.page.locator(`#stepTabs [data-action="build-step"][data-step="${Math.max(0, total - 1)}"]`).first().click().catch(() => {});
      await sleep(800);
      await C.page.locator('[data-action="build-add-go"]').first().click();
      await sleep(1500);
    });

    // ── 2) CLIENTE: sacola → checkout → pagamento (cartão, demo) → pedido ──
    await step("Cliente · abre a sacola", async () => { await nav(C.page, "sacola"); });
    await shot(C.page, "03-cliente-sacola");
    await step("Cliente · checkout + dados do cartão", async () => {
      await C.page.locator('[data-action="checkout"]').first().click();
      await sleep(1500);
      await C.page.locator("#pcNum").waitFor({ state: "visible", timeout: 8000 });
      await C.page.fill("#pcNum", "4111 1111 1111 1111");
      await C.page.fill("#pcName", "AGENTE ALFA");
      await C.page.fill("#pcExp", "12/30");
      await C.page.fill("#pcCvv", "123");
    });
    await shot(C.page, "04-cliente-pagamento");
    await step("Cliente · confirma o pagamento (cria o pedido)", async () => {
      await C.page.locator("#payConfirm").first().click();
      await sleep(3500);
      await dismissModals(C.page);
    });
    await shot(C.page, "05-cliente-pedido-criado", { full: true });

    // ── Descobre o ID do pedido recém-criado (Admin SDK) ──
    await step("Sistema · localiza o pedido recém-criado no Firestore", async () => {
      for (let i = 0; i < 12 && !orderId; i++) {
        const snap = await db.collection("orders").where("userId", "==", u1.uid).get();
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
        const newest = docs[0];
        if (newest && Date.now() - (newest.criadoEm || 0) < 180000) { orderId = newest.id; numero = newest.numeroPedido; }
        else await sleep(2000);
      }
      if (!orderId) throw new Error("não achei o pedido recém-criado");
      // Destrava a edição de status (a regra trava durante a janela de cancelamento).
      await db.collection("orders").doc(orderId).update({ cancelavelAte: Date.now() - 60000 });
      console.log(`     📦 pedido ${numero} (${orderId})`);
    });

    // ── 3) ADMIN: recebe e processa o pedido em tempo real ──
    await step("Admin · login no painel", async () => { await loginAdmin(A.page, CREDS.admin); await dismissModals(A.page); });
    const sel = `[data-action="order-status"][data-id="${orderId}"]`;
    await step("Admin · vai para Pedidos e localiza o pedido", async () => {
      await adminNav(A.page, "pedidos");
      await A.page.locator(sel).first().waitFor({ state: "visible", timeout: 15000 });
      await A.page.locator(sel).first().scrollIntoViewIfNeeded();
    });
    await shot(A.page, "06-admin-pedido-recebido", { full: true });
    await step("Admin · status → Em análise", async () => { await A.page.locator(sel).first().selectOption("analisando"); await sleep(2200); });
    await step("Admin · status → Aprovado (aceita o pedido)", async () => { await A.page.locator(sel).first().selectOption("aprovado"); await sleep(2200); });
    await shot(A.page, "07-admin-aprovado");
    await step("Admin · atribui o motoboy ao pedido", async () => {
      const assign = `[data-action="order-assign"][data-id="${orderId}"]`;
      await A.page.locator(assign).first().selectOption(u3.uid);
      await sleep(2200);
    });
    await shot(A.page, "08-admin-motoboy-atribuido");
    await step("Admin · status → Em produção", async () => { await A.page.locator(sel).first().selectOption("producao"); await sleep(2000); });
    await step("Admin · status → Enviado (saiu para entrega)", async () => { await A.page.locator(sel).first().selectOption("enviado"); await sleep(2500); });
    await shot(A.page, "09-admin-enviado", { full: true });

    // ── 4) MOTOBOY: recebe a entrega, liga rastreio, abre o chat ──
    await step("Motoboy · login na Central de Entregas", async () => { await loginMotoboy(M.page, CREDS.agente3); await dismissModals(M.page); await sleep(2500); });
    await shot(M.page, "10-motoboy-entrega-recebida", { full: true });
    await step("Motoboy · liga o rastreio 📡 (despacho de saída)", async () => {
      await M.page.locator("#motoShareBtn").click();
      await sleep(5000); // grava ao menos uma posição
    });
    await step("Motoboy · mapa/rota do pedido ativo", async () => {
      if (await M.page.locator("#motoRouteWrap").isVisible().catch(() => false)) {
        await M.page.locator("#motoRouteWrap").scrollIntoViewIfNeeded();
        await sleep(1500);
      } else throw new Error("mapa/rota não visível");
    });
    await shot(M.page, "11-motoboy-rota-mapa", { full: true });
    await step("Motoboy · abre o chat e escreve ao cliente", async () => {
      await M.page.locator(`[data-action="moto-chat"][data-id="${orderId}"]`).first().click();
      await sleep(1200);
      await M.page.fill("#chatInput", "Olá! Já saí com seu pedido, chego em ~15 min. 🛵");
      await M.page.locator("#chatSend").click();
      await sleep(1800);
    });
    await shot(M.page, "12-motoboy-mensagem-enviada");

    // ── 5) CLIENTE: vê rastreio + responde no chat ──
    await step("Cliente · vê o pedido a caminho (rastreio em tempo real)", async () => {
      await nav(C.page, "pedidos");
      await sleep(2500);
      await dismissModals(C.page);
    });
    await shot(C.page, "13-cliente-rastreio", { full: true });
    await step("Cliente · abre o chat e recebe a mensagem do motoboy", async () => {
      await C.page.locator(`[data-action="order-chat"][data-order-id="${orderId}"]`).first().click();
      await sleep(1500);
      const txt = await C.page.locator("#chatMsgs").textContent();
      if (!/saí com seu pedido/i.test(txt || "")) throw new Error("mensagem do motoboy não chegou ao cliente");
    });
    await shot(C.page, "14-cliente-recebe-mensagem");
    await step("Cliente · responde no chat", async () => {
      await C.page.fill("#chatInput", "Perfeito, muito obrigado! Estou te aguardando. 🙏");
      await C.page.locator("#chatSend").click();
      await sleep(1800);
    });
    await shot(C.page, "15-cliente-responde");
    await step("Motoboy · recebe a resposta do cliente no chat", async () => {
      await sleep(1500);
      const txt = await M.page.locator("#chatMsgs").textContent();
      if (!/te aguardando/i.test(txt || "")) throw new Error("resposta do cliente não chegou ao motoboy");
    });
    await shot(M.page, "16-motoboy-recebe-resposta");

    // ── 5b) CHAT CLIENTE ↔ PLATAFORMA (canal cp) ──
    await step("Cliente · fecha o chat do entregador e abre 'Falar com a loja'", async () => {
      await C.page.locator("#chatClose").click().catch(() => {});
      await sleep(500);
      await C.page.locator(`[data-action="order-chat-support"][data-order-id="${orderId}"]`).first().click();
      await sleep(1000);
      await C.page.fill("#chatInput", "Oi! Posso trocar o ponto da carne para bem passado?");
      await C.page.locator("#chatSend").click();
      await sleep(1500);
    });
    await shot(C.page, "20-cliente-fala-com-loja");
    await step("Admin · abre o chat com o cliente e recebe a mensagem", async () => {
      await A.page.locator(`[data-action="order-chat-cliente"][data-id="${orderId}"]`).first().click();
      await sleep(1500);
      const txt = await A.page.locator("#chatMsgs").textContent();
      if (!/bem passado/i.test(txt || "")) throw new Error("mensagem do cliente não chegou à plataforma");
    });
    await shot(A.page, "21-admin-recebe-do-cliente");
    await step("Admin · responde ao cliente (plataforma)", async () => {
      await A.page.fill("#chatInput", "Claro! Já avisei a cozinha. 👨‍🍳");
      await A.page.locator("#chatSend").click();
      await sleep(1500);
    });
    await step("Cliente · recebe a resposta da plataforma", async () => {
      await sleep(1200);
      const txt = await C.page.locator("#chatMsgs").textContent();
      if (!/avisei a cozinha/i.test(txt || "")) throw new Error("resposta da plataforma não chegou ao cliente");
    });
    await shot(C.page, "22-cliente-recebe-da-loja");

    // ── 5c) CHAT MOTOBOY ↔ PLATAFORMA (canal mp) ──
    await step("Admin/Cliente · fecham os chats abertos", async () => {
      await A.page.locator("#chatClose").click().catch(() => {});
      await C.page.locator("#chatClose").click().catch(() => {});
      await sleep(500);
    });
    await step("Motoboy · fecha o chat do cliente e abre 'Suporte'", async () => {
      await M.page.locator("#chatClose").click().catch(() => {});
      await sleep(500);
      await M.page.locator(`[data-action="moto-chat-support"][data-id="${orderId}"]`).first().click();
      await sleep(1000);
      await M.page.fill("#chatInput", "O portão do condomínio está fechado, tem outro acesso?");
      await M.page.locator("#chatSend").click();
      await sleep(1500);
    });
    await shot(M.page, "23-motoboy-fala-com-suporte");
    await step("Admin · abre o chat com o motoboy e recebe a mensagem", async () => {
      await A.page.locator(`[data-action="order-chat-motoboy"][data-id="${orderId}"]`).first().click();
      await sleep(1500);
      const txt = await A.page.locator("#chatMsgs").textContent();
      if (!/portão/i.test(txt || "")) throw new Error("mensagem do motoboy não chegou à plataforma");
    });
    await shot(A.page, "24-admin-recebe-do-motoboy");
    await step("Admin · responde ao motoboy (plataforma)", async () => {
      await A.page.fill("#chatInput", "Use a portaria de serviço, já liberei com o porteiro. 🛎️");
      await A.page.locator("#chatSend").click();
      await sleep(1500);
    });
    await step("Motoboy · recebe a resposta do suporte", async () => {
      await sleep(1200);
      const txt = await M.page.locator("#chatMsgs").textContent();
      if (!/portaria de serviço/i.test(txt || "")) throw new Error("resposta do suporte não chegou ao motoboy");
    });
    await shot(M.page, "25-motoboy-recebe-do-suporte");
    await step("Todos · fecham os chats de plataforma", async () => {
      await A.page.locator("#chatClose").click().catch(() => {});
      await M.page.locator("#chatClose").click().catch(() => {});
      await sleep(500);
    });

    // ── 6) MOTOBOY: marca como ENTREGUE ──
    await step("Motoboy · fecha o chat e marca como Entregue", async () => {
      await M.page.locator("#chatClose").click().catch(() => {});
      await sleep(600);
      await M.page.locator(`[data-action="moto-delivered"][data-id="${orderId}"]`).first().click();
      await sleep(3000);
      await dismissModals(M.page);
    });
    await shot(M.page, "17-motoboy-entregue", { full: true });

    // ── 7) CLIENTE: pedido entregue + méritos creditados ──
    await step("Cliente · vê o pedido como Entregue", async () => {
      await C.page.locator("#chatClose").click().catch(() => {});
      await sleep(600);
      await nav(C.page, "pedidos");
      await sleep(2500);
    });
    await shot(C.page, "18-cliente-pedido-entregue", { full: true });
    await step("Cliente · Clube → extrato de méritos creditados", async () => {
      await nav(C.page, "clube");
      await C.page.locator('[data-action="clube-tab"][data-tab="historico"]').first().click().catch(() => {});
      await sleep(1800);
    });
    await shot(C.page, "19-cliente-extrato-meritos", { full: true });
  } catch (e) {
    console.error("❌ fluxo:", e.message);
  } finally {
    // Fecha cada contexto salvando o vídeo com nome legível.
    const vC = await closeVideo(C, VDIR, "cliente");
    const vA = await closeVideo(A, VDIR, "admin");
    const vM = await closeVideo(M, VDIR, "motoboy");

    // Relatório em markdown.
    const ok = steps.filter((s) => s.ok).length;
    const lines = [
      `# Vídeo do fluxo integrado — 3 personas`,
      ``,
      `Pedido: **${numero || "—"}** (${orderId || "—"})`,
      ``,
      `Passos: **${ok}/${steps.length}** OK`,
      ``,
      `## Vídeos`,
      `- 🧑 Cliente: \`${vC || "falhou"}\``,
      `- 🛠️ Admin: \`${vA || "falhou"}\``,
      `- 🛵 Motoboy: \`${vM || "falhou"}\``,
      ``,
      `## Passos`,
      ...steps.map((s) => `- ${s.ok ? "✅" : "❌"} ${s.label}${s.err ? ` — _${s.err}_` : ""}`),
    ];
    fs.writeFileSync(`${VDIR}/RESUMO.md`, lines.join("\n"));

    // Timeline (ms desde o início da gravação) p/ sincronizar narração/legendas.
    fs.writeFileSync(`${VDIR}/timeline.json`, JSON.stringify({
      pedido: numero, orderId, totalMs: Date.now() - T0,
      videos: { cliente: `${VDIR}/cliente.webm`, admin: `${VDIR}/admin.webm`, motoboy: `${VDIR}/motoboy.webm` },
      steps,
    }, null, 2));
    console.log(`\n📝 ${VDIR}/RESUMO.md — ${ok}/${steps.length} passos OK`);
    console.log(`⏱️  ${VDIR}/timeline.json (${Math.round((Date.now() - T0) / 1000)}s)`);
    process.exit(0);
  }
})();
