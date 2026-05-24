import { test, expect } from '@playwright/test';
import { loginApp } from './helpers.js';

test.describe('App do usuário', () => {
  test('login revela o app com topbar e nome do agente', async ({ page }) => {
    await loginApp(page);
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('#agentName')).not.toHaveText('');
    await expect(page.locator('#page-home')).toHaveClass(/active/);
  });

  test('navegação entre páginas pela bottom nav', async ({ page }) => {
    await loginApp(page);
    // ids da bottom nav (seletor por atributo casaria com sidemenu/quick-cards também).
    const pages = ['cardapio', 'clube', 'busca', 'sacola', 'home'];
    for (const p of pages) {
      await page.click(`#nav-${p}`);
      await expect(page.locator(`#page-${p}`)).toHaveClass(/active/);
    }
  });

  test('side menu (hambúrguer) abre e fecha', async ({ page }) => {
    await loginApp(page);
    await page.click('[data-action="toggle-sidemenu"]');
    await expect(page.locator('#sidemenu')).toHaveClass(/open/);
    await page.click('.sidemenu-close');
    await expect(page.locator('#sidemenu')).not.toHaveClass(/open/);
  });

  test('alternar tema muda o data-theme', async ({ page }) => {
    await loginApp(page);
    const before = await page.evaluate(() => document.body.getAttribute('data-theme'));
    await page.click('#themeBtn');
    await expect.poll(() => page.evaluate(() => document.body.getAttribute('data-theme'))).not.toBe(before);
  });

  test('clube: abas Resgatar / Extrato / Missões / Ranking renderizam', async ({ page }) => {
    await loginApp(page);
    await page.click('#nav-clube');
    for (const tab of ['recompensas', 'historico', 'missoes', 'ranking']) {
      await page.click(`[data-action="clube-tab"][data-tab="${tab}"]`);
      await expect(page.locator('#clubeDynamic')).not.toBeEmpty();
    }
  });

  test('clube NÃO tem mais a aba "Metiqos"', async ({ page }) => {
    await loginApp(page);
    await page.click('#nav-clube');
    await expect(page.locator('[data-tab="metiqos"]')).toHaveCount(0);
  });

  test('cardápio mostra categorias', async ({ page }) => {
    await loginApp(page);
    await page.click('#nav-cardapio');
    await expect(page.locator('.cardapio-cats')).toBeVisible();
    await expect(page.locator('[data-action="cardapio-cat"]').first()).toBeVisible();
  });

  test('Monte Seu Lanche: Pão e Carne vêm pré-selecionados', async ({ page }) => {
    await loginApp(page);
    await page.click('#nav-cardapio');
    // Passo 0 = Pão: deve haver 1 item já selecionado.
    await expect(page.locator('#stepContent .menu-item.selected')).toHaveCount(1);
    // Passo 1 = Carnes: também 1 pré-selecionado.
    await page.click('.step-tab[data-step="1"]');
    await expect(page.locator('#stepContent .menu-item.selected')).toHaveCount(1);
  });

  test('sacola renderiza (mesmo vazia)', async ({ page }) => {
    await loginApp(page);
    await page.click('#nav-sacola');
    await expect(page.locator('#page-sacola')).toHaveClass(/active/);
    await expect(page.locator('#sacolaContent')).not.toBeEmpty();
  });

  test('perfil mostra dados do agente', async ({ page }) => {
    await loginApp(page);
    await page.click('#topbarAvatar');
    await expect(page.locator('#page-perfil')).toHaveClass(/active/);
    await expect(page.locator('#profileCodename')).not.toHaveText('');
  });
});
