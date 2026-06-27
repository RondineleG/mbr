import { test, expect } from '@playwright/test';
import { loginApp, AGENTE1 } from './helpers.js';

// A versão Web usa a sessão Firebase (mesma origem). ?preview=1 ignora a flag
// global config/webPage, permitindo validar sem afetar produção.
test.describe('Versão Web / Desktop (?preview=1)', () => {
  test('shell carrega com navegação lateral', async ({ page }) => {
    await loginApp(page, AGENTE1);
    await page.goto('/web.html?preview=1');
    await expect(page.locator('#webApp')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.web-navitem[data-go="inicio"]')).toBeVisible();
    await expect(page.locator('.web-navitem[data-go="sacola"]')).toBeVisible();
    await expect(page.locator('#webBlocked')).toBeHidden();
  });

  test('navega até a Sacola e mostra o carrinho', async ({ page }) => {
    await loginApp(page, AGENTE1);
    await page.goto('/web.html?preview=1');
    await expect(page.locator('#webApp')).toBeVisible({ timeout: 30000 });
    await page.click('.web-navitem[data-go="sacola"]');
    await expect(page.locator('#webSection')).not.toBeEmpty();
  });

  test('monta um lanche e adiciona à sacola (se o módulo estiver ativo)', async ({ page }) => {
    await loginApp(page, AGENTE1);
    await page.goto('/web.html?preview=1');
    await expect(page.locator('#webApp')).toBeVisible({ timeout: 30000 });

    const montar = page.locator('.web-navitem', { hasText: /monte|lanche/i }).first();
    test.skip(!(await montar.count()), 'módulo "Monte Seu Lanche" não está ativo na versão web');
    await montar.click();

    const ingrediente = page.locator('[data-mb-step]').first();
    await expect(ingrediente).toBeVisible({ timeout: 15000 });
    await ingrediente.click();
    await page.click('[data-mb-add="1"]');

    // Vai pra sacola e confirma o botão de finalizar.
    await page.click('.web-navitem[data-go="sacola"]');
    await expect(page.locator('[data-checkout="1"]')).toBeVisible({ timeout: 15000 });
  });
});
