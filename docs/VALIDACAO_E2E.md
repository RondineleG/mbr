# Workflow de Validação — MrBur "A Ordem"

Validação **automatizada** de todas as funcionalidades do MVP via Playwright (pasta `e2e/`),
mais o roteiro **manual** para o que depende de estado de produção (entrega ao vivo, push real).

## Como rodar

```bash
npm ci
npx playwright install --with-deps chromium   # 1ª vez

npm run test:e2e            # local: sobe public/ em :5050, login no Firebase real
npm run test:e2e:prod       # mesma suíte contra https://trabalhohowx.web.app
npx playwright show-report  # abre o relatório HTML do último run
```

> O front-end é servido estático em `localhost:5050`, mas **Auth/Firestore são o Firebase real**.
> Por isso os testes usam as contas de avaliação (`agente1@mrbur.com`, `admin@mrbur.com`).

### Flags

| Var | Efeito |
| --- | --- |
| `E2E_BASE=https://trabalhohowx.web.app` | roda contra produção em vez do server local |
| `E2E_PLACE_ORDER=1` | habilita o teste que **cria um pedido real** no Firestore (desligado por padrão p/ não poluir produção a cada CI) |

## Cobertura por funcionalidade

| Área | Spec | O que valida |
| --- | --- | --- |
| Login / shell / navegação | `user.spec.js` | login revela app, bottom-nav, side-menu, tema claro/escuro |
| Clube (gamificação) | `user.spec.js` | abas Resgatar / Extrato / Missões / Ranking renderizam |
| Cardápio + Monte Seu Lanche | `user.spec.js`, `checkout.spec.js` | categorias, Pão+Carne pré-selecionados, montagem completa |
| **Checkout / pedido** | `checkout.spec.js` | montar → sacola → quantidade → modal de pagamento (cartão/Pix) → finalização real (gated) |
| **Gate de convites / cadastro** | `onboarding.spec.js` | abas Agente/Convite, rejeição de convite inválido (sem criar conta), máscara do código |
| **Versão Web / Desktop** | `web.spec.js` | `web.html?preview=1` carrega shell, navegação lateral, sacola, montador |
| **Motoboy / entrega** | `motoboy.spec.js` | gate de acesso (shell ou redireciona não-motoboy), toggle 📡 Localização (geo concedida) |
| **Notificações + Chat** | `notify-chat.spec.js` | toggle de notificações no perfil, chat com entregador (quando há pedido a caminho) |
| Admin: dashboard/seções | `admin.spec.js` | login, 7 KPIs, navegação por seções, pedidos em tempo real, dossiê do agente |
| Admin: relatórios | `reports.spec.js` | KPIs, gráfico por dia, seletor de período, painéis (top produtos/pagamento/entregas) |

### Testes resilientes (auto-skip)

Alguns fluxos dependem de estado que pode não existir no ambiente; nesses casos o teste
faz `test.skip` em vez de falhar — mantendo o CI verde e sinalizando o gap:

- **Motoboy**: pula se `agente1` não estiver marcado `motoboy:true` (o gate redirecionar **é** o comportamento correto). Para forçar: `node scripts/ensure-motoboy.js`.
- **Chat**: pula se não houver pedido em entrega (status SENT/DELIVERED) para abrir o chat.
- **Web · montador**: pula se o módulo "Monte Seu Lanche" estiver desativado na config web.
- **Checkout · pedido real**: pula a menos que `E2E_PLACE_ORDER=1`.

## CI

`.github/workflows/ci.yml` roda a suíte a cada PR e push na `main`, e publica o
`playwright-report/` como artefato (14 dias). Trace e screenshot são capturados em falha.

`retries` e `maxFailures` são condicionais a `process.env.CI`:

| | `retries` | `maxFailures` |
| --- | --- | --- |
| CI (IP limpo, 1×/PR) | 2 | 0 (roda tudo) |
| Local | 0 | 6 (aborta cedo) |

> ⚠️ **Gotcha — throttle do Firebase Auth.** Cada teste faz um sign-in real. Rodar a
> suíte inteira **várias vezes seguidas localmente** (com retries) dispara centenas de
> logins do mesmo IP e o Firebase responde `auth/too-many-requests` — aí o gate do admin
> não renderiza e tudo que usa `admin@mrbur.com` (admin/reports/user specs) falha por
> timeout. Não é bug do app: o throttle reseta em ~1h. Por isso `retries=0` local e a
> validação “oficial” é o CI. Para iterar localmente, rode **um spec por vez**.

## Validação manual (não automatizável de forma confiável)

O tempo-real entre papéis e o push nativo precisam de 2 sessões simultâneas — ver o
roteiro do `README.md` ("Roteiro sugerido"):

1. **Tempo real**: Admin muda status do pedido → cliente vê mudar na hora (`onSnapshot`).
2. **Rastreio ao vivo**: motoboy ativa 📡 Localização → cliente vê o pin se mover no mapa em Pedidos.
3. **Push real**: com permissão concedida no device, a mudança de status dispara notificação do SO.
