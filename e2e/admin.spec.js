import { test, expect } from '@playwright/test';
import { loginAdmin } from './helpers.js';

test.describe('Painel Admin', () => {
  test('login no Comando revela o shell', async ({ page }) => {
    await loginAdmin(page);
    await expect(page.locator('#adminShell')).toBeVisible();
    await expect(page.locator('#adminGate')).toBeHidden();
  });

  test('dashboard: 7 KPIs clicáveis + distribuição por status', async ({ page }) => {
    await loginAdmin(page);
    await expect(page.locator('#dashKpis .kpi')).toHaveCount(7);
    await expect(page.locator('#dashKpis .kpi.clickable').first()).toBeVisible();
    await expect(page.locator('#dashStatus .status-chip')).toHaveCount(7);
    // KPI navega para a seção (link no card).
    await page.click('#dashKpis .kpi[data-section="pedidos"]');
    await expect(page.locator('#section-pedidos')).toHaveClass(/active/);
  });

  test('navegação por todas as seções', async ({ page }) => {
    await loginAdmin(page);
    for (const s of ['pedidos', 'produtos', 'clientes', 'missoes', 'recompensas', 'convites', 'dashboard']) {
      await page.click(`[data-action="admin-nav"][data-section="${s}"]`);
      await expect(page.locator(`#section-${s}`)).toHaveClass(/active/);
    }
  });

  test('pedidos: lista com os pedidos de exemplo (data e cliente reais)', async ({ page }) => {
    await loginAdmin(page);
    await page.click('[data-action="admin-nav"][data-section="pedidos"]');
    const rows = page.locator('#ordersList .data-row');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThanOrEqual(10);
    // data não deve ser "—" (campo criadoEm corrigido)
    await expect(page.locator('#ordersList .data-meta').first()).not.toContainText('—');
    // cada pedido tem o seletor de status
    await expect(page.locator('#ordersList .status-select').first()).toBeVisible();
    // pedidos agrupados por dia (cabeçalho "Hoje"/"Ontem"/data)
    await expect(page.locator('#ordersList .orders-day').first()).toBeVisible();
  });

  test('clientes: lista de agentes e dossiê com extrato de méritos', async ({ page }) => {
    await loginAdmin(page);
    await page.click('[data-action="admin-nav"][data-section="clientes"]');
    const items = page.locator('#customersList .admin-item');
    await expect(items.first()).toBeVisible();
    // abre o dossiê do primeiro agente
    await page.locator('[data-action="cust-view"]').first().click();
    const modal = page.locator('.modal-overlay.show');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('EXTRATO DE MÉRITOS');
    await expect(modal).toContainText('MÉTRICAS');
    // não fica preso em "Carregando"
    await expect(modal).not.toContainText('Carregando dossiê');
  });

  test('detalhe do pedido mostra ingredientes do "Monte Seu Lanche"', async ({ page }) => {
    await loginAdmin(page);
    await page.click('[data-action="admin-nav"][data-section="pedidos"]');
    const views = page.locator('#ordersList [data-action="order-view"]');
    await views.first().waitFor();
    const count = await views.count();
    let foundIngredients = false;
    for (let i = 0; i < count; i++) {
      await views.nth(i).click();
      const modal = page.locator('.modal-overlay.show');
      await expect(modal).toBeVisible();
      const txt = (await modal.textContent()) || '';
      // pedido custom: nome "Monte Seu Lanche" + linha de ingredientes (🧩)
      if (txt.includes('Monte Seu Lanche') && txt.includes('🧩')) foundIngredients = true;
      await page.locator('#vclose').click();
      await expect(modal).toBeHidden();
      if (foundIngredients) break;
    }
    expect(foundIngredients).toBeTruthy();
  });

  test('filtro de pedidos: a aba selecionada fica ativa (sem ghost)', async ({ page }) => {
    await loginAdmin(page);
    await page.click('[data-action="admin-nav"][data-section="pedidos"]');
    const recebidos = page.locator('[data-action="order-filter"][data-status="recebido"]');
    const todos = page.locator('[data-action="order-filter"][data-status="all"]');
    await recebidos.click();
    // selecionada = ativa e SEM ghost; a anterior volta a ter ghost
    await expect(recebidos).toHaveClass(/active/);
    await expect(recebidos).not.toHaveClass(/ghost/);
    await expect(todos).toHaveClass(/ghost/);
  });

  test('produtos e recompensas renderizam listas', async ({ page }) => {
    await loginAdmin(page);
    await page.click('[data-action="admin-nav"][data-section="produtos"]');
    await expect(page.locator('#productsList')).not.toBeEmpty();
    await page.click('[data-action="admin-nav"][data-section="recompensas"]');
    await expect(page.locator('#rewardsList')).not.toBeEmpty();
  });
});
