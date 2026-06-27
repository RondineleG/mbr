import { test, expect } from '@playwright/test';
import { loginApp, AGENTE1 } from './helpers.js';

test.describe('Cliente · Notificações e Chat', () => {
  test.use({ permissions: ['notifications'] });

  test('perfil tem o toggle de notificações de pedido', async ({ page }) => {
    await loginApp(page, AGENTE1);
    await page.click('#topbarAvatar');
    await expect(page.locator('#page-perfil')).toHaveClass(/active/);
    await expect(page.locator('[data-action="notify-toggle"]')).toBeVisible();
    // Estado inicial pintado (ativadas, desativadas ou não suportado).
    await expect(page.locator('#profNotifyValue')).not.toHaveText('');
  });

  test('alternar notificações mantém um estado coerente (sem quebrar)', async ({ page }) => {
    await loginApp(page, AGENTE1);
    await page.click('#topbarAvatar');
    const valor = page.locator('#profNotifyValue');
    const icone = page.locator('#profNotifyIcon');
    await expect(valor).not.toHaveText('');

    // Clicar não pode quebrar a UI; o estado resultante deve ser um dos válidos.
    await page.click('[data-action="notify-toggle"]');
    await expect(icone).toHaveText(/🔔|🔕/);
    await expect(valor).toHaveText(/Ativadas|Avisar quando|Não suportado|bloqueada/i);
  });

  test('chat com o entregador abre quando há pedido a caminho', async ({ page }) => {
    await loginApp(page, AGENTE1);
    // Aba de pedidos do cliente (dentro da Sacola).
    await page.click('#nav-sacola');
    const orders = page.locator('.sacola-tab[data-tab="orders"]');
    if (await orders.count()) await orders.click();

    const chatBtn = page.locator('[data-action="order-chat"]').first();
    test.skip(!(await chatBtn.count()), 'nenhum pedido em entrega (SENT/DELIVERED) para abrir o chat');
    await chatBtn.click();

    await expect(page.locator('#chatInput')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#chatSend')).toBeVisible();
    await page.fill('#chatInput', 'Olá, e2e 👋');
    await page.click('#chatSend');
    await expect(page.locator('#chatMsgs')).toContainText('e2e');
    await page.click('#chatClose');
  });
});
