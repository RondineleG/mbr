import { test, expect } from '@playwright/test';
import { loginApp, AGENTE1 } from './helpers.js';

// motoboy.html não tem formulário: usa a sessão Firebase (mesma origem do app).
// Concedemos geolocalização p/ exercitar o "📡 Localização" sem prompt nativo.
test.use({
  permissions: ['geolocation'],
  geolocation: { latitude: -23.5505, longitude: -46.6333 },
});

test.describe('Motoboy · Painel de entregas', () => {
  test('gate de acesso resolve (shell de entregas OU redireciona quem não é motoboy)', async ({ page }) => {
    await loginApp(page, AGENTE1);
    await page.goto('/motoboy.html');

    // O gate é assíncrono: ou revela #motoShell, ou redireciona pra "/" (não-motoboy).
    await expect.poll(async () => {
      if (await page.locator('#motoShell').isVisible().catch(() => false)) return 'shell';
      if (!page.url().includes('motoboy')) return 'redirect';
      return 'pending';
    }, { timeout: 30000 }).not.toBe('pending');

    const noShell = await page.locator('#motoShell').isVisible().catch(() => false);
    test.skip(!noShell, 'agente1 não está marcado como motoboy neste ambiente (gate redirecionou — OK)');

    // É motoboy: o painel mostra quem está logado e o toggle de localização.
    await expect(page.locator('#motoWho')).not.toHaveText('');
    await expect(page.locator('#motoShareBtn')).toBeVisible();
  });

  test('toggle de localização alterna ON/OFF', async ({ page }) => {
    await loginApp(page, AGENTE1);
    await page.goto('/motoboy.html');
    const shell = page.locator('#motoShell');
    const visible = await shell.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
    test.skip(!visible, 'agente1 não é motoboy neste ambiente');

    const btn = page.locator('#motoShareBtn');
    await expect(btn).toContainText('OFF');
    await btn.click();
    await expect(btn).toContainText('ON', { timeout: 15000 });
  });
});
