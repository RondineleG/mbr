# Relatório de Funcionalidades — MrBur "A Ordem" MVP

**Data:** 22/05/2026
**Escopo:** Revisão funcional completa do MVP (sem alterar layout/design).
**Modo testado:** Carregando contra Firebase real (`trabalhohowx`), com perfil simulado para exercer fluxos protegidos.

---

## ✅ O que está funcionando

| Área | Status |
|------|--------|
| Splash, login (UI), abas Agente/Convite | OK |
| Onboarding (3 passos) | OK (UI completa, validação OK) |
| Roteador + navegação entre páginas | OK (com ressalva sobre `missoes` e `convites` — abaixo) |
| Store central com pub/sub e persistência de carrinho/tema | OK |
| Service Worker registrado (PWA) | OK (com gaps, ver §6) |
| Topbar + sidemenu + bottomnav | OK |
| Home (rank, recompensas em destaque) | OK |
| Cardápio – Monte Seu Lanche (wizard) | OK |
| Cardápio – categorias (dia/mbox/acomp/bebidas/sobremesas) | OK |
| Sacola: render, qty, remover, limpar | OK |
| Pedidos: render de timeline + repetir pedido | OK |
| Perfil: render, edição de campos, troca de tema | OK |
| Busca: filtro sobre catálogo, tags, atalho para categorias | OK |
| Logout | OK |
| Admin: gate de acesso por role, bootstrap, promote-self | OK |
| Admin: CRUD produtos com upload de imagem | OK |
| Admin: theme toggle (não persiste), sidebar mobile | Parcial |

---

## 🔴 Bugs críticos (quebra de funcionalidade no MVP)

### B1. Página de "Missões" não existe no HTML — completamente inacessível
- Sidebar/bottomnav apontam para `data-page="missoes"`.
- O renderer em <ref_snippet file="/mnt/windows/Dev/MVP/public/js/app/main.js" lines="26-35" /> chama `renderMissions()`.
- `renderMissions()` faz `setHtml("missionsContent", ...)` em <ref_snippet file="/mnt/windows/Dev/MVP/public/js/pages/mission.page.js" lines="17-54" />.
- **Não existe `<div id="page-missoes">` nem `<div id="missionsContent">` em `public/index.html`** (confirmado via grep — 0 ocorrências).
- Resultado: ao clicar em "Missões" no menu lateral, o usuário fica em uma tela em branco — nenhum HTML é injetado.
- Adicionalmente, `mission.page.js` confere `store.get("page") === "missions"` (linhas 182 e 238) — mas a página é `"missoes"` (sem o "n" final). Inconsistência interna.
- `mission.page.js:213` referencia `missionService.MISSIONS[...]` que **não é exportado** do service (vai resultar `undefined`).

**Impacto:** todo o módulo de Missões é inutilizável pela UI cliente — usuário acessa apenas pelo Clube → tab "Missões".

---

### B2. `cardapio.page.js` — `toastError is not defined` (ReferenceError em runtime)
- <ref_snippet file="/mnt/windows/Dev/MVP/public/js/pages/cardapio.page.js" lines="9-9" />: importa apenas `toast, toastInfo`.
- Mas usa `toastError(...)` em 6 lugares (linhas 176, 190, 195, 201, 218, 220, 222).
- **Confirmado em runtime** (teste com Playwright):
  ```
  Uncaught ReferenceError: toastError is not defined
    at addProduct (cardapio.page.js:176:5)
    at buyWithPoints (cardapio.page.js:222:7)
  ```
- **Impacto:** quebra ao tentar:
  1. adicionar produto exclusivo-de-méritos ao carrinho;
  2. comprar com méritos quando saldo insuficiente;
  3. comprar com méritos quando produto fora de estoque;
  4. qualquer erro genérico na compra com méritos.

**Fix:** adicionar `toastError` na lista de imports.

---

### B3. `convites.page.js` — `$$ is not defined` (ReferenceError em runtime)
- <ref_snippet file="/mnt/windows/Dev/MVP/public/js/pages/convites.page.js" lines="4-4" /> importa apenas `$, onAction, show`.
- Linha 208 chama `$$(".convite-filter-btn")`.
- **Confirmado em runtime:** clicar em qualquer botão de filtro (`Ativos`, `Usados`, `Expirados`, `Cancelados`) dispara `ReferenceError: $$ is not defined` e a página fica em estado inconsistente.

**Fix:** adicionar `$$` na lista de imports.

---

### B4. `convites.page.js#renderStats` — Stats nunca são pintadas no DOM
<ref_snippet file="/mnt/windows/Dev/MVP/public/js/pages/convites.page.js" lines="41-49" />

```js
$("#convitesStatsTotal")?.textContent || (stats.totalEnviados || 0);
```

Isso é uma **expressão de leitura** com fallback — não atribui nada ao DOM. Deveria ser:

```js
const t = $("#convitesStatsTotal"); if (t) t.textContent = stats.totalEnviados || 0;
```

**Impacto:** os 5 cards de estatística do topo da página de Convites (Enviados, Usados, Expirados, Ativos, Conversão) **permanecem em "0"** mesmo havendo dados.

---

### B5. Inconsistência ORDER_STATUS entre cliente e admin
- Cliente (`order.service.js`) salva status em **português**: `recebido`, `analisando`, `aprovado`, `producao`, `enviado`, `entregue`, `cancelado`.
- Admin importa `ORDER_STATUS, ORDER_FLOW` de `utils/constants.js` que usa **inglês**: `received`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`.
- Existem **duas constantes `ORDER_STATUS` distintas** no projeto (uma em `services/order.service.js`, outra em `utils/constants.js`).

**Resultado:**
1. `dashboard.js`: KPIs `revenue` e `pending` são sempre 0 (filtra por status que nunca existe).
2. `orders.admin.js`: select de mudança de status oferece valores em **inglês** que, ao serem salvos, **não são reconhecidos pelos badges do cliente** (cliente renderiza o status cru pois cai no fallback).
3. Os filtros do admin (`Recebidos`, `Em preparo`, `Em entrega`, `Entregues`) usam `data-status="received|preparing|out_for_delivery|delivered"` — **nenhum filtro funciona em pedidos reais** (que estão em PT).
4. `customers.admin.js#viewCustomer` filtra `orders.filter(o => o.status === 'delivered')` → sempre 0 pedidos concluídos no dossiê do agente.

**Fix:** unificar para PT (a versão do `order.service.js`) ou EN. Atualizar `constants.js`, `admin.html` (filtros), `dashboard.js`, `customers.admin.js`.

---

### B6. `mission.service.js` — usa `.data()` em objeto plano
<ref_snippet file="/mnt/windows/Dev/MVP/public/js/services/mission.service.js" lines="281-301" />

```js
const userDoc = await tx.get(`users/${uid}`);
if (!userDoc) throw new Error('User not found');
const currentPoints = userDoc.data().points || 0;  // ❌ userDoc é objeto plano
```

Mesmo problema na linha 409 (`claimMissionReward`).

A fachada `firestore-real.js#runTransaction` retorna um objeto plano `{ id, ...data }` (não um snapshot). Chamar `.data()` lança `TypeError: userDoc.data is not a function`.

**Impacto:**
- Recompensas automáticas de missão **não creditam pontos** (cai no `catch` e só loga "Erro ao adicionar recompensa").
- `claimMissionReward` quebra ao tentar resgatar — toastError "Não foi possível resgatar a recompensa".

**Fix:** trocar `userDoc.data().points` por `userDoc.points`.

---

### B7. `invite.service.js` — `dataExpiracao` nunca é definida para "+7 dias"
<ref_snippet file="/mnt/windows/Dev/MVP/public/js/services/invite.service.js" lines="131-152" />

```js
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const invite = {
  ...
  dataExpiracao: tsNow(expiresAt),   // ❌ tsNow é serverTimestamp(), não aceita argumentos
  ...
};
```

`tsNow` é `serverTimestamp()` — sentinela do Firestore que ignora qualquer argumento. O resultado é que `dataExpiracao` será o **timestamp do servidor no momento da criação** (igual a `dataCriacao`).

**Impacto:**
- Todo convite é criado como **expirado imediatamente** (no real) ou como `Date.now()` no demo (também já expirado no critério `now > expiryTime`).
- Em `checkInvite` e `consumeInvite`, a verificação `if (now > expiryTime)` marca o convite como expirado já na 1ª tentativa de uso.
- **Fluxo de cadastro por convite recém-criado quebra.**

**Fix:** salvar `dataExpiracao: expiresAt.getTime()` (ou um `Timestamp` real, mas o demo só sabe lidar com number/ms).

---

### B8. Seed cria invites em formato incompatível com o app
<ref_snippet file="/mnt/windows/Dev/MVP/public/js/seed.js" lines="49-71" />

`seedInvite` e `seedRandomInvites` salvam:
```js
{ id: code, used: false, usedBy: null, createdBy: "seed", createdAt: tsNow() }
```

Mas `invite.service.js` espera campos `status`, `dataCriacao`, `dataExpiracao`, `criadoPor`, `limiteUso`, `totalUsos` etc.

**Resultado:**
- `checkInvite` aplica fallback `status = "ativo"`, então o convite passa a validação inicial.
- Porém **nenhum dos convites semeados tem `dataExpiracao`**, então a verificação de expiração é pulada — funciona acidentalmente.
- O painel `Convites` (cliente) e o admin exibem campos vazios ("—") porque dependem dos campos novos (`criadoPor`, `dataCriacao`, etc.).
- Os `SEED_*.md` e `migrate-invites.js` na raiz indicam que isso já é problema conhecido.

**Fix:** atualizar `seed.js` para emitir o formato canonical (status, dataCriacao, dataExpiracao = +7d, criadoPor, limiteUso=1, totalUsos=0).

---

### B9. Seed não popula collection `missions`
- `mission.service.js#loadMissions` consulta `missions` do Firestore (`where active=true, orderBy order asc`).
- Se a coleção estiver vazia (caso comum em ambiente novo), cai no fallback `getDefaultMissions()` — funciona, mas:
  - O admin (`missions.admin.js`) lista a coleção real → **sempre mostra "Nenhuma missão encontrada"**.
  - As missões "ativas" no app cliente são apenas as 10 hardcoded; admin não as enxerga, não consegue pausar nem editar.

**Fix:** adicionar `seedMissions()` em `seed.js` e chamá-lo em `seedEverything()` / `seedAll()` / `ensureSeed()`.

---

### B10. Seed REWARDS sem `category` e `type`
- `seed.js` cria recompensas só com `name/description/pointsRequired/icon/active`.
- `reward.service.js#createReward` define defaults `category: "general"` e `type: "physical"`.
- `clube.page.js` filtra por categoria (`benefits`, `physical`, `experiences`, `status`) — os seeded ficam sob "general" e desaparecem dos filtros.
- `redeem(uid, reward)` em `reward.service.js` checa estoque para `type === "physical"` — recompensas seeded (sem `type`) **nunca verificam estoque**.

**Fix:** padronizar o `REWARDS` do seed com `category` e `type` explícitos.

---

### B11. `pedidos.page.js` — `toastSuccess` chamado com 2 argumentos
<ref_snippet file="/mnt/windows/Dev/MVP/public/js/pages/pedidos.page.js" lines="163-163" />

```js
toastSuccess("🛒", "Itens adicionados à sacola");
```

Mas `toastSuccess(t) => toast("success", "✅", t)` aceita **apenas 1 argumento**. O emoji `"🛒"` vira o **texto** do toast (substituindo o ✅) e a real mensagem "Itens adicionados à sacola" é descartada.

**Fix:** trocar por `toast("success", "🛒", "Itens adicionados à sacola")` ou `toastSuccess("Itens adicionados à sacola")`.

---

### B12. Rota `convites` não exige autenticação
<ref_snippet file="/mnt/windows/Dev/MVP/public/js/app/router.js" lines="13-25" />

`ROUTE_CONFIG.auth` lista cardapio, clube, sacola, pedidos, perfil, missoes, busca — **mas omite `convites`**. Logo, sem login, `navigate("convites")` cai no `return true` final do `checkRouteAccess` e abre a página vazia. Como a página depende de `store.get("profile")`, ela falha graciosamente, mas semanticamente é um buraco.

**Fix:** adicionar `"convites"` ao array `auth`.

---

### B13. Admin — tema light/dark não persiste em localStorage
- <ref_snippet file="/mnt/windows/Dev/MVP/public/js/admin/admin-main.js" lines="48-55" />: `toggleAdminTheme()` apenas inverte a variável `isDark` (inicializada como `true`) e aplica `data-theme` ao body.
- **Não há leitura nem escrita em localStorage** ao carregar a página.
- Diferente do app cliente (<ref_snippet file="/mnt/windows/Dev/MVP/public/js/app/session.js" lines="28-31" />), que chama `applyTheme()` no `startSessionObserver` e lê de `store.get("theme")`.
- Resultado: ao recarregar o admin, o tema volta sempre para dark, ignorando a preferência do usuário.

**Fix:**
1. No `boot()` de `admin-main.js`, ler `localStorage.getItem("admin-theme")` e aplicar inicialmente.
2. Em `toggleAdminTheme()`, salvar `localStorage.setItem("admin-theme", isDark ? "dark" : "light")`.

---

## 🟡 Bugs de gravidade média

### M1. `calculateUserStats` quebra `weekDays` em produção
<ref_snippet file="/mnt/windows/Dev/MVP/public/js/services/mission.service.js" lines="358-364" />

```js
if (order.criadoEm) {
  const date = new Date(order.criadoEm);   // ❌ Timestamp do Firestore não é serializável diretamente
  orderDays.add(date.getDay());
}
```

No Firestore real, `order.criadoEm` é um objeto `Timestamp`, não milliseconds. `new Date(Timestamp)` resulta em `Invalid Date`, `getDay()` retorna `NaN`. Missão "Fidelidade Inabalável" (`week_streak`) nunca completa.

**Fix:** usar `toDate(order.criadoEm)` do `format.js` (já existe) ou checar `order.criadoEm?.toDate?.()`.

### M2. `mission.service.js#getUserMissionProgress` pode quebrar `setDoc` no demo
- `setDoc(\`missionProgress/${uid}\`, ...)` é chamado mas o demo precisa que o documento exista para incrementos atômicos. Em primeiro acesso (`getUserMissionProgress` retorna placeholder mas não chama `setDoc`), o resgate de missão falha.

### M3. `points.service.js#adjustPoints` faz 2 reads desnecessários
<ref_snippet file="/mnt/windows/Dev/MVP/public/js/services/points.service.js" lines="14-35" />

```js
const users = await getCollection("users", { where: [["uid", "==", uid]] });
const current = users[0]?.points || 0;
```

Faz uma query collection em vez de `getDoc("users/" + uid)`. Mais custoso e sujeito a permissões diferentes.

### M4. Storage rules limitam tipo MIME estritamente
<ref_snippet file="/mnt/windows/Dev/MVP/storage.rules" lines="15-16" />

`request.resource.contentType.matches('image/.*')` — se a imagem for enviada como `application/octet-stream` (alguns browsers para HEIC, drag-drop), upload falha silenciosamente no admin de produtos.

### M5. Firestore rules sem regra para coleção `pointTransactions`
- `product.service.js#buyWithPoints` faz `addDoc("pointTransactions", ...)`.
- `firestore.rules` não tem `match /pointTransactions/{id}` → cai no default = **bloqueado**.
- Compra com pontos vai ter sucesso na lógica mas falhar no log de transação (silenciosamente, pois está em try/catch implícito do flow).

### M6. Firestore rules permite admin promover qualquer usuário a admin
`/users/{uid}`: `allow update: if isAdmin() || owner(uid)`. Como o `role` está no doc do user e não bloqueado, um **admin pode alterar `role` de qualquer um, e o próprio admin pode rebaixar-se**. Para MVP é aceitável, mas para produção precisa custom claims.

### M7. Bootstrap admin no admin.html depende de o Firestore estar em "modo de teste"
- Texto do botão diz "Modo de teste" mas o usuário precisa ir manualmente ao console do Firebase. Se as rules estiverem como o arquivo atual (`if signedIn()`), o bootstrap funciona, mas o primeiro user é criado com `role:"agent"` — depois precisa promote-self.

### M8. `pedidos.page.js#initPedidos` registra `document.addEventListener("click", ...)` extra
- Já existe delegation via `onAction("repeat-order", ...)` mas o código registra **outro** click listener manual em paralelo. Funciona mas duplica handlers e dificulta manutenção.

### M9. Admin "Missões" e "Recompensas" — edição não implementada
<ref_snippet file="/mnt/windows/Dev/MVP/public/js/admin/rewards.admin.js" lines="121-124" />
<ref_snippet file="/mnt/windows/Dev/MVP/public/js/admin/missions.admin.js" lines="121-124" />

Ambos exibem toast "Funcionalidade de edição em desenvolvimento". A criação usa `prompt()` nativo (vai contra o design system de modais customizados).

### M10. Falta a aba "missoes" do clube no `clubeDynamic` quando entrada por sidebar
- O usuário acessa "Missões" via sidebar (`data-page="missoes"`) → cai em página inexistente (B1).
- Via Clube → tab "Missões" funciona via `clube.page.js#renderMissions()` (mas com toastSuccess + bug B6 de pontos).

### M11. `home.page.js` importa `renderRewardCards` de `clube.page.js`
- Acoplamento estranho: home chama `clube.page.js` mesmo sem o usuário ter visitado o Clube.
- Funciona, mas viola coesão. Considerar mover para um componente dedicado.

### M12. `seed.js` cria `SAMPLE_AGENTS` com `uid: "seed-..."` — mas docs reais usam UID do auth
- Os agentes de exemplo são pseudo-usuários sem conta de auth.
- Aparecem no ranking, mas o admin pode tentar atribuir um pedido a esse "agente" e o `watchUserOrders("seed-...")` nunca retornará nada útil.
- Risco: confusão entre usuários reais e seed.

---

## 🟢 Bugs menores / melhorias

### N1. Arquivos órfãos ou de demo na raiz
- `prototype/index.html` (vazio — referência intencional segundo README)
- `index.html` (raiz, **117 KB**) — protótipo monolítico antigo, **mantido na raiz por engano** (o app real está em `public/`).
- `create-*.js`, `seed.js`, `seed-rest.js`, `seed-rest.js`, `migrate-invites.js`, `fix-admin.js` — scripts Node de seed/migration; documentar em README qual é o "oficial" ou consolidar.
- `service-account.json` na raiz versionado: **rever .gitignore** para garantir que credenciais não vazem.

### N2. Duplicação `skeletonList/skeletonCards`
- `js/components/skeleton.js` e `js/utils/loading.js` exportam os mesmos nomes.
- Imports espalhados pelo projeto usam um ou outro inconsistentemente.

### N3. Service Worker (`sw.js`) — gaps
- O array `ASSETS_CACHE` define os caminhos de CSS/JS, **mas nunca é usado no `install` event** (apenas `STATIC_CACHE` é cacheado).
- Lista não inclui `admin.html`, `/css/admin.css`, `/js/admin/*.js`, `/js/seed.js`, `/js/firebase/firestore-real.js`, `/js/firebase/storage.service.js`, `/js/utils/logger.js`, `/js/firebase/auth-demo.js`, `/js/firebase/firestore-demo.js`, `/js/firebase/auth.service.js`.
- Resultado: PWA offline para cliente funciona parcialmente; **admin offline NÃO funciona**.

### N4. `firestore.indexes.json` incompleto
Faltam índices que o app vai precisar conforme o uso crescer:
- `missions { active asc, order asc }` (usado em `mission.service.js#loadMissions`)
- `pointsHistory { userId asc, createdAt desc }` (extrato do clube)
- `metiqosHistory { userId asc, createdAt desc }`
- `redemptions { userId asc, createdAt desc }`
- `invites { dataCriacao desc }` e `invites { status asc, dataCriacao desc }`
- `products { pointsRequired > 0, active asc, pointsRequired asc }` (loja de pontos)

Sem esses, o app **vai funcionar até crescer** e depois disparar 400 com link clicável de criação. Melhor pré-criar.

### N5. `firebase-config.js` com `apiKey` real commitada
- O comentário no arquivo argumenta que "é pública por natureza", mas para projeto MVP em produção convém:
  - usar `.env` e build-time injection (ou Hosting `__/firebase/init.json`);
  - aplicar **App Check** + **Domain Restrictions** na console.

### N6. Toast: campo `text` aceita texto via `textContent` — sem suporte a HTML
- OK para segurança, mas se algum lugar passar um HTML, ele será exibido literalmente.

### N7. Modal não suporta múltiplos prompts em paralelo
- O `resolver` global é singleton. Se duas chamadas a `modalPrompt`/`modalConfirm` rodarem antes da primeira resolver, a segunda **substitui** a primeira sem nunca resolvê-la (memory leak de promise).
- `perfil.page.js#showMyInvites` cria seu próprio modal manualmente porque o `modalCustom` não fecha automaticamente — sintoma da limitação.

### N8. `login.page.js` — `loginHint` "Demo: MRBUR-GENESIS-X7K9"
- O hint sempre aparece para o usuário. Em produção, com convites reais, é confuso.
- Sugestão: esconder se `IS_DEMO === false`.

### N9. `onboarding.page.js` — codinome obrigatório, mas falha de UX
- `validate()` rejeita codinome vazio com "Clique em GERAR para criar seu codinome", mas o botão é "🎲 GERAR" e a label diz "permanente". Usuário não percebe o que precisa fazer.
- Bug pequeno: aceita codinome de 3+ caracteres digitado manualmente, contradizendo "Clique em GERAR" (logicamente OK; mensagem confusa).

### N10. `route-guards` — sem proteção para `convites` (M12 acima)
### N11. PWA — Service Worker registrado **fora do módulo** no `index.html`
- Script de registro inline (linhas 448-460) — funciona, mas duplica lógica de boot.

### N12. Logger persiste em memória, não em IndexedDB
- Em sessão longa, `logs.slice(-100)` evita estouro, mas `sendToLoggingService` é apenas `console.error` — promessa de "Sentry/LogRocket" não cumprida (não bloqueia MVP).

### N13. `admin/missions.admin.js#createMission` usa `prompt()` nativo
- 6 prompts em sequência. UX ruim e cancelável apenas em 1.
- Idem `rewards.admin.js` e `invites.admin.js`.
- Substituir por `modalCustom` com form embed (já há padrão em `products.admin.js`).

### N14. Páginas que fazem query de `invites` ao carregar quebram para users sem perm
- `convites.page.js#loadInvites` chama `listInvites()` sem checar role. Para um cliente comum, as rules permitem `list invites: signedIn` — funciona. Mas `getCollection` ordena por `dataCriacao` desc. Sem índice (N4), Firestore pode retornar erro.

### N15. `pedidos.page.js#renderPedidos` chama `getOrderStats` mas já está em store
- Faz fetch redundante. As stats podem ser calculadas do `store.get("orders")` (já em realtime).

---

## 🗺️ Visão geral por fluxo

### Cadastro por convite
1. Convite demo `MRBUR-GENESIS-X7K9` em seed → funciona porque o convite não tem `dataExpiracao` (B8 acidentalmente protege).
2. Novos convites criados pelo admin via "Gerar 5 convites" no Dashboard → **funcionam graças à falta de dataExpiracao no seed**.
3. Novos convites criados via `createInvite` (formulário do cliente/admin) → **falham** pelo bug B7 (`dataExpiracao` é igual a `dataCriacao`).

### Checkout / pedido
1. Adicionar item ao carrinho: OK.
2. Confirmar pedido: cria order com status `"recebido"` (PT).
3. Admin abre Pedidos → render usa `ORDER_STATUS[o.status]` que **não tem chave "recebido"**, cai no fallback `ORDER_STATUS.received` (ícone errado).
4. Admin tenta mudar status no `<select>`: valores são em **inglês**, salvos como `"preparing"`, `"out_for_delivery"` etc.
5. Cliente recebe atualização (realtime), tenta renderizar badge em `pedidos.page.js` → `badges["preparing"]` não existe, fallback `${status}` (literal "preparing").
6. Pedido nunca é marcado como `"entregue"` (admin envia `"delivered"`) → **pontos nunca são creditados** (`updateStatus` compara `status === ORDER_STATUS.DELIVERED` que é `"entregue"`).

**Toda a engrenagem de pedidos está partida** entre os dois lados. (Bug B5)

### Sistema de pontos / missões
- Pedido entregue (se chegar lá) credita pontos via `adjustPoints` — OK.
- Missões automáticas: `updateMissionProgress` é chamado, mas `addPointsReward` quebra em runtime (B6) → recompensa de missão não credita.
- Resgate manual de missão: bate em B6.
- Loja de méritos (`buyWithPoints`): funciona até o `addDoc("pointTransactions", ...)` que está bloqueado pelas rules (M5).

### Painel admin
- Login + bootstrap: OK.
- Dashboard: KPIs furados (B5).
- Pedidos: filtros furados (B5), status select envia valores errados.
- Produtos: CRUD funcional.
- Agentes (clientes): OK.
- Missões: lista coleção `missions` vazia (B9) → eternamente "Nenhuma missão"; ações de pause/delete OK; **edição não implementada (M9)**; criação via `prompt()` nativo.
- Recompensas: CRUD parcialmente funcional, **edição não implementada (M9)**.
- Convites: render OK, **filtros são funcionais via UI**, mas `dataExpiracao` está bugada (B7).

---

## 🎯 Recomendações de priorização

### 🔥 P0 — Quebra de funcionalidade no MVP (1-2h de trabalho)
1. **B2** Adicionar `toastError` ao import de `cardapio.page.js`.
2. **B3** Adicionar `$$` ao import de `convites.page.js`.
3. **B4** Corrigir `renderStats` em `convites.page.js` (atribuir, não comparar).
4. **B5** Unificar `ORDER_STATUS` em uma única fonte (escolher PT ou EN, ajustar admin.html, dashboard.js, customers.admin.js).
5. **B6** Trocar `userDoc.data().points` por `userDoc.points` em `mission.service.js` (2 locais).
6. **B7** Trocar `tsNow(expiresAt)` por `expiresAt.getTime()` em `invite.service.js`.
7. **B11** Trocar `toastSuccess("🛒", ...)` em `pedidos.page.js`.
8. **B13** Implementar persistência de tema no admin (localStorage).

### 🚧 P1 — Funcionalidade incompleta visível ao usuário (4-6h)
9. **B1** Adicionar `<div class="page" id="page-missoes">…</div>` no `index.html` com o markup esperado pelo `mission.page.js` (`#missionsContent`, etc) — ou remover a entrada do sidemenu e deixar só via Clube.
10. **B8** Atualizar `seed.js` para usar formato canonical de invites (`status`, `dataExpiracao` calculado, `criadoPor`, `limiteUso`, `totalUsos`).
11. **B9** Adicionar `seedMissions()` em `seed.js`.
12. **B10** Padronizar `REWARDS` no seed com `category` e `type`.
13. **B12** Adicionar `"convites"` ao `ROUTE_CONFIG.auth`.
14. **M1** Trocar `new Date(order.criadoEm)` por `toDate(order.criadoEm)` em `mission.service.js`.
15. **M5** Adicionar regra para coleção `pointTransactions` em `firestore.rules`.
16. **M9** Implementar edição em `missions.admin.js` e `rewards.admin.js`.

### 📋 P2 — Melhorias estruturais (não bloqueiam MVP)
17. **N3** Completar `STATIC_CACHE` no SW + cachear `ASSETS_CACHE` no install.
18. **N4** Pré-criar índices do Firestore.
19. **N13** Substituir `prompt()` nativos por `modalCustom` no admin.
20. **N1** Limpar arquivos de seed/migration redundantes da raiz e revisar `.gitignore` (service-account.json).
21. **N7** Modal: tornar `resolver` por instância (`Map<modalId, fn>`) em vez de singleton global.

---

## 📌 Checklist rápido de aceitação

Para o MVP funcionar end-to-end na produção (Firebase real), o mínimo a executar:

- [ ] Aplicar fixes B2, B3, B5, B6, B7, B11, B13 (P0).
- [ ] Atualizar `seed.js` (B8, B9, B10) e rodar `seedEverything` em um projeto vazio.
- [ ] Atualizar `firestore.rules` com regra para `pointTransactions`.
- [ ] Adicionar `<div id="page-missoes">` ou remover o link do sidemenu.
- [ ] Re-executar o teste de pedidos end-to-end (criação cliente → mudança status admin → status no cliente → pontos creditados).
- [ ] Pré-criar índices do Firestore.

**Estimativa total para sair do estado atual e ter um MVP funcional:** 1-2 dias de trabalho focado, sem mexer no design.

---

> Relatório gerado a partir de revisão estática do código + testes em runtime com Playwright contra `http://localhost:5050/` rodando `python3 -m http.server` sobre `public/`. Nenhuma alteração foi feita no código durante esta revisão.
