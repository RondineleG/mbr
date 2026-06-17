import { test, expect } from '@playwright/test';
import { loginAdmin } from './helpers.js';

test.describe('Admin · Relatórios', () => {
  test('aba Relatórios aparece e ativa a seção', async ({ page }) => {
    await loginAdmin(page);
    const nav = page.locator('[data-action="admin-nav"][data-section="relatorios"]');
    await expect(nav).toBeVisible();
    await nav.click();
    await expect(page.locator('#section-relatorios')).toHaveClass(/active/);
  });

  test('KPIs (7) e gráfico de faturamento por dia renderizam', async ({ page }) => {
    await loginAdmin(page);
    await page.click('[data-action="admin-nav"][data-section="relatorios"]');
    await expect(page.locator('#repKpis .kpi')).toHaveCount(7);
    // Gráfico de barras (CSS) com uma barra por dia do período.
    await expect(page.locator('#repChart .rep-bar').first()).toBeVisible();
  });

  test('seletor de período alterna o estado ativo', async ({ page }) => {
    await loginAdmin(page);
    await page.click('[data-action="admin-nav"][data-section="relatorios"]');
    const d30 = page.locator('[data-action="report-period"][data-days="30"]');
    const d7 = page.locator('[data-action="report-period"][data-days="7"]');
    await d30.click();
    await expect(d30).toHaveClass(/active/);
    await expect(d30).not.toHaveClass(/ghost/);
    await expect(d7).toHaveClass(/ghost/);
  });

  test('painéis (top produtos, pagamento, entregas) renderizam', async ({ page }) => {
    await loginAdmin(page);
    await page.click('[data-action="admin-nav"][data-section="relatorios"]');
    for (const id of ['repProducts', 'repPay', 'repMoto']) {
      await expect(page.locator(`#${id}`)).not.toBeEmpty();
      await expect(page.locator(`#${id} .admin-subtitle`)).toBeVisible();
    }
  });

  test('navegação completa do admin inclui Relatórios', async ({ page }) => {
    await loginAdmin(page);
    for (const s of ['relatorios', 'pedidos', 'produtos', 'clientes', 'dashboard', 'relatorios']) {
      await page.click(`[data-action="admin-nav"][data-section="${s}"]`);
      await expect(page.locator(`#section-${s}`)).toHaveClass(/active/);
    }
  });
});
