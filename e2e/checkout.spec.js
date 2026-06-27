import { test, expect } from '@playwright/test';
import { loginApp, AGENTE1 } from './helpers.js';

// Monta um lanche pelo "Monte Seu Lanche" (Pão + Carne já vêm pré-selecionados),
// avança todos os passos e adiciona à sacola, indo direto pro carrinho.
async function montarEAdicionar(page) {
  await page.click('#nav-cardapio');
  await expect(page.locator('#page-cardapio')).toHaveClass(/active/);
  // O montador só pinta os itens depois do catálogo chegar (Firestore onSnapshot);
  // espera QUALQUER item renderizar (Pão/Carne já vêm pré-selecionados).
  await page.locator('#stepContent .menu-item').first().waitFor({ state: 'visible', timeout: 35000 });

  // Avança enquanto o botão "Próximo →" estiver visível; no passo de revisão ele some.
  const next = page.locator('#stepBtn');
  for (let i = 0; i < 12 && await next.isVisible().catch(() => false); i++) {
    await next.click();
  }

  await page.click('[data-action="build-add-go"]');
  await expect(page.locator('#page-sacola')).toHaveClass(/active/);
  await expect(page.locator('.sacola-item').first()).toBeVisible({ timeout: 15000 });
}

test.describe('Cliente · Checkout (Monte Seu Lanche → Sacola → Pagamento)', () => {
  test('monta um lanche e adiciona à sacola', async ({ page }) => {
    await loginApp(page, AGENTE1);
    await montarEAdicionar(page);
    await expect(page.locator('#checkoutBtn')).toBeVisible();
    await expect(page.locator('#checkoutBtn')).toContainText(/CONFIRMAR PEDIDO/i);
  });

  test('quantidade no carrinho aumenta/diminui', async ({ page }) => {
    await loginApp(page, AGENTE1);
    await montarEAdicionar(page);
    const mais = page.locator('.qty-btn[data-delta="1"]').first();
    const valor = page.locator('.qty-val').first();
    const antes = (await valor.textContent())?.trim();
    await mais.click();
    await expect.poll(() => valor.textContent().then(t => t?.trim())).not.toBe(antes);
  });

  test('checkout abre o modal de pagamento com cartão / pix (demonstração)', async ({ page }) => {
    await loginApp(page, AGENTE1);
    await montarEAdicionar(page);
    await page.click('#checkoutBtn');

    // Modal de pagamento (payment.js) com as abas de método e o botão Pagar.
    await expect(page.locator('.pay-tab[data-pay="cartao"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.pay-tab[data-pay="pix"]')).toBeVisible();
    await expect(page.locator('#payConfirm')).toContainText(/Pagar/i);

    // Alterna pra Pix: troca o formulário visível.
    await page.click('.pay-tab[data-pay="pix"]');
    await expect(page.locator('#payPix')).toBeVisible();
    await expect(page.locator('#ppCode')).toBeVisible();

    // Por padrão NÃO finalizamos (evita criar pedido real em produção a cada CI).
    // O modal fecha removendo a classe .show do overlay (não sai do DOM).
    await page.click('#payCancel');
    await expect(page.locator('.modal-overlay.show')).toBeHidden();
    await expect(page.locator('#page-sacola')).toHaveClass(/active/);
  });

  // Fluxo completo que CRIA um pedido real no Firestore. Só roda sob demanda:
  //   E2E_PLACE_ORDER=1 npm run test:e2e
  test('finaliza o pedido de ponta a ponta (cria pedido real)', async ({ page }) => {
    test.skip(!process.env.E2E_PLACE_ORDER, 'defina E2E_PLACE_ORDER=1 para criar um pedido real');
    await loginApp(page, AGENTE1);
    await montarEAdicionar(page);
    await page.click('#checkoutBtn');
    await page.click('.pay-tab[data-pay="pix"]');
    await page.click('#payConfirm');

    // Sucesso = redireciona pra Pedidos e a sacola esvazia.
    await expect(page.locator('#page-pedidos')).toHaveClass(/active/, { timeout: 30000 });
  });
});
