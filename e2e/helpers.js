// Helpers compartilhados de login/navegação.
export const ADMIN = { email: 'admin@mrbur.com', pass: 'admin123456' };

// Contas de avaliação (clientes). agente1 é o candidato a motoboy no roteiro.
export const AGENTE1 = { email: 'agente1@mrbur.com', pass: 'agente123456' };
export const AGENTE2 = { email: 'agente2@mrbur.com', pass: 'agente123456' };

/** Dispensa a animação de boot e loga no app principal. */
export async function loginApp(page, creds = ADMIN) {
  // Silencia o modal "📲 Instalar o MrBur" (pwaSuggest), que abre ~1,5s após o
  // login e intercepta cliques no fluxo. Snooze por 24h via localStorage.
  await page.addInitScript(() => {
    try { localStorage.setItem('pwaModalSnoozeAt', String(Date.now())); } catch { /* sem storage */ }
  });
  await page.goto('/');
  // Dispensa a cena de boot (botão PULAR), se presente.
  const skip = page.locator('#bootSkip');
  try { await skip.click({ timeout: 10000 }); } catch { /* boot já terminou */ }
  // Espera o overlay de boot sumir do DOM antes de interagir (evita interceptar cliques).
  await page.locator('#boot').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});

  await page.locator('#loginEmail').waitFor({ state: 'visible', timeout: 25000 });
  await page.fill('#loginEmail', creds.email);
  await page.fill('#loginPass', creds.pass);
  await page.click('#loginBtn');

  // App revelado = login OK (timeout maior p/ absorver cold start do 1º teste).
  await page.locator('#app').waitFor({ state: 'visible', timeout: 45000 });
}

/** Loga no painel admin (admin.html). */
export async function loginAdmin(page, creds = ADMIN) {
  await page.goto('/admin.html');
  await page.locator('#adminEmail').waitFor({ state: 'visible', timeout: 25000 });
  await page.fill('#adminEmail', creds.email);
  await page.fill('#adminPass', creds.pass);
  // Re-tenta o clique de login (absorve falhas transitórias de signIn/Firestore),
  // mas com backoff p/ não disparar sign-ins em rajada e estressar o throttle.
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.click('#adminLoginBtn').catch(() => {});
    try {
      await page.locator('#adminShell').waitFor({ state: 'visible', timeout: 20000 });
      return;
    } catch { await page.waitForTimeout(2500); }
  }
  await page.locator('#adminShell').waitFor({ state: 'visible', timeout: 20000 });
}
