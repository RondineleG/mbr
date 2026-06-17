# <img src="public/icon-192.png" alt="MrBur" width="30" align="top"> MrBur — A Ordem

**Plataforma Gamificada de Fidelização e Pedidos para Hamburguerias Premium.**

App mobile-first, dark premium e cinematográfico, com linguagem de agentes/codinomes,
ranks, méritos (pontos), recompensas, missões e pedidos em tempo real — construído em
**HTML + CSS + JavaScript Vanilla (ES Modules)** sobre **Firebase**.

---

## ✨ Recursos

- **Autenticação real** (Firebase Auth — email/senha): cadastro, login, logout, recuperação de senha, sessão persistente.
- **Gate de convites** — cadastro só com código válido (collection `invites`), preservando a exclusividade.
- **Onboarding** em 3 passos que grava o dossiê real do agente (codinome **permanente**).
- **Catálogo dinâmico** (Firestore) + montador "Monte Seu Lanche".
- **Carrinho** com quantidade, persistência e checkout que cria pedidos reais.
- **Tempo real** — status do pedido muda no admin e reflete na hora no cliente (`onSnapshot`).
- **Gamificação** — 1 R$ = 1 mérito, ranks/níveis, extrato, recompensas com resgate, missões, ranking.
- **Perfil** editável (telefone, endereço, tema), codinome bloqueado.
- **Admin** (`admin.html`) — dashboard, CRUD de produtos (+ upload de imagem), pedidos em tempo real com troca de status, agentes (ranking/pontos/histórico).
- **Premium UX** — splash, skeleton loading, toasts, modais, microinterações, tema claro/escuro, responsivo.

---

## 🔐 Acesso para avaliação

App em produção: **https://trabalhohowx.web.app** (Modo PRODUÇÃO, Firebase real).

Contas de teste para avaliar cada papel:

| Papel    | E-mail               | Senha          | Onde acessar            |
| -------- | -------------------- | -------------- | ----------------------- |
| Admin    | `admin@mrbur.com`    | `mrbur2025`    | `/admin.html`           |
| Agente 1 | `agente1@mrbur.com`  | `agente123456` | `/` (app do cliente)    |
| Agente 2 | `agente2@mrbur.com`  | `agente123456` | `/`                     |
| Agente 3 | `agente3@mrbur.com`  | `agente123456` | `/`                     |

### Roteiro sugerido (avaliação)
1. **Cliente** — entre em `/` como `agente1@mrbur.com`. Em **Cardápio → Monte Seu Lanche**, monte um lanche, adicione à sacola e finalize o pedido (pagamento de demonstração: cartão / Pix / méritos).
2. **Admin** — entre em `/admin.html` como `admin@mrbur.com`. Veja o pedido em **Pedidos** (tempo real), mude o status e confira **Dashboard** e **Relatórios**.
3. **Motoboy** — no Admin → **Agentes**, ative o toggle **motoboy** em `agente1`. Saia e entre em `/motoboy.html` como `agente1@mrbur.com`: marque "Saiu para entrega" e ative **📡 Localização** — o cliente vê o **rastreamento ao vivo** em **Pedidos**.
4. **Notificações** — no app do cliente, **Perfil → 🔔 Notificações de pedido**; ao mudar o status no Admin, chega a notificação.
5. **Versão Web/Desktop** — `/web.html?preview=1` (monte → sacola → finalizar pedido).

> **Modo DEMO** (sem Firebase, 100% local): sirva `public/` e use o convite `MBR-GEN-2025` para cadastrar, ou "⚙️ Criar admin demo" em `admin.html`.

> ⚠️ Contas de **avaliação/demonstração** — o pagamento é **simulado** (nenhuma cobrança real). Após a avaliação, troque as senhas (rode `npm run create-users` com novos valores) ou desative as contas.

---

## 🗂️ Estrutura

```
public/
├── index.html            # app do cliente (shell, sem lógica inline)
├── admin.html            # painel de comando
├── firebase-config.js    # credenciais + init preguiçoso (demo vs real)
├── css/                  # tokens · base · components · auth · app · admin
└── js/
    ├── firebase/         # adapters real/demo de auth, firestore e storage + fachadas
    ├── services/         # user · order · product · reward · invite · points
    ├── app/              # state (store) · router · session · main
    ├── components/       # toast · modal · skeleton · topbar
    ├── pages/            # login · onboarding · home · cardapio · clube · busca · sacola · pedidos · perfil
    ├── admin/            # admin-main · dashboard · products · orders · customers · store
    └── utils/            # constants · format · dom
prototype/index.html      # protótipo original (referência, intacto)
docs/                     # documentação e relatórios (SEED, PWA, RELATORIO_* + imagens)
firestore.rules · storage.rules · firestore.indexes.json · firebase.json · .firebaserc
```

## 🏛️ Arquitetura

- **Store central** (`app/state.js`) com pub/sub; páginas assinam e re-renderizam.
- **Fachadas de backend** (`firebase/*.service.js`) escolhem implementação **real**
  (Firebase SDK) ou **demo** (localStorage) via `IS_DEMO` — o resto do app não muda.
- **Event delegation** (`utils/dom.js`) com `data-action` em vez de `onclick` inline.
- **Realtime** por `onSnapshot` (real) ou evento `storage` entre abas (demo).

## 🔒 Segurança

- Security Rules por papel (`role:"admin"`), dono lê/escreve o próprio doc, catálogo
  somente-leitura para clientes, pedidos imutáveis pelo cliente após criação.
- **Limitação MVP:** o ajuste de pontos ocorre no cliente. Em produção endurecida,
  considerar mover a lógica de pontos para backend mais robusto.
