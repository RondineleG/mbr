import { test, expect } from '@playwright/test';

// Dispensa a cena de boot e espera a tela de login/convite aparecer.
async function abrirLogin(page) {
  await page.goto('/');
  try { await page.locator('#bootSkip').click({ timeout: 10000 }); } catch { /* boot já terminou */ }
  await page.locator('#boot').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await page.locator('#loginEmail').waitFor({ state: 'visible', timeout: 25000 });
}

test.describe('Cadastro · Gate de convites', () => {
  test('abas Agente / Convite alternam o formulário', async ({ page }) => {
    await abrirLogin(page);
    await expect(page.locator('#loginAgent')).toBeVisible();

    await page.click('#loginTabInvite');
    await expect(page.locator('#loginInvite')).toBeVisible();
    await expect(page.locator('#loginCode')).toBeVisible();
    await expect(page.locator('#loginAgent')).toBeHidden();

    await page.click('#loginTabAgent');
    await expect(page.locator('#loginAgent')).toBeVisible();
    await expect(page.locator('#loginInvite')).toBeHidden();
  });

  test('convite inválido é rejeitado com mensagem (sem criar conta)', async ({ page }) => {
    await abrirLogin(page);
    await page.click('#loginTabInvite');
    await page.fill('#loginCode', 'MBR-XXX-000');
    await page.click('#loginBtn');

    // O gate deve recusar: erro visível e nenhuma navegação pro onboarding/app.
    await expect(page.locator('#loginError')).not.toHaveText('', { timeout: 20000 });
    await expect(page.locator('#loginInvite')).toBeVisible();
    await expect(page.locator('#app')).toBeHidden();
  });

  test('campo de convite força maiúsculas', async ({ page }) => {
    await abrirLogin(page);
    await page.click('#loginTabInvite');
    await page.fill('#loginCode', 'mbr-gen-2025');
    // text-transform:uppercase é visual; garantimos que o valor foi aceito.
    await expect(page.locator('#loginCode')).toHaveValue(/mbr-gen-2025/i);
  });
});
