# Estrutura Técnica - MrBur MVP

## Visão Geral

A aplicação está organizada em módulos funcionais seguindo uma arquitetura baseada em serviços e componentes reutilizáveis.

## Diretórios

### `/admin/`
Painel administrativo com funcionalidades específicas para gestão do sistema.

- `admin-main.js` - Entry point do admin, gerencia navegação e autenticação
- `admin-store.js` - Estado global do painel admin
- `dashboard.js` - Dashboard com KPIs e métricas
- `customers.admin.js` - Gestão de agentes/usuarios com métricas detalhadas
- `orders.admin.js` - Gestão de pedidos com filtros e atualizações em tempo real
- `products.admin.js` - Gestão do cardápio/produtos
- `missions.admin.js` - Gestão do sistema de gamificação/missões
- `rewards.admin.js` - Gestão da loja interna/recompensas
- `invites.admin.js` - Gestão do sistema de convites

### `/app/`
Core da aplicação, gerencia ciclo de vida e estado global.

- `main.js` - Entry point da aplicação, inicializa todos os módulos
- `router.js` - Sistema de roteamento baseado em hash
- `session.js` - Gerencia sessão do usuário, autenticação e tema
- `state.js` - Store global reativa (padrão observer)

### `/components/`
Componentes reutilizáveis de UI.

- `modal.js` - Sistema de modais customizáveis
- `skeleton.js` - Componentes de loading skeleton
- `toast.js` - Sistema de notificações toast
- `topbar.js` - Barra superior de navegação

### `/firebase/`
Serviços de integração com Firebase.

- `auth.service.js` - Serviço de autenticação (login, signup, logout)
- `auth-real.js` - Implementação real de autenticação Firebase
- `auth-demo.js` - Implementação demo para desenvolvimento
- `db.service.js` - Serviço de banco de dados (Firestore)
- `firestore-real.js` - Implementação real do Firestore
- `firestore-demo.js` - Implementação demo do Firestore
- `storage.service.js` - Serviço de armazenamento (imagens, arquivos)

### `/pages/`
Páginas da aplicação (views).

- `home.page.js` - Página inicial com destaques
- `cardapio.page.js` - Cardápio de produtos
- `sacola.page.js` - Carrinho de compras
- `pedidos.page.js` - Histórico de pedidos do usuário
- `clube.page.js` - Clube de recompensas e gamificação
- `convites.page.js` - Sistema de convites
- `perfil.page.js` - Perfil do usuário
- `login.page.js` - Tela de login
- `onboarding.page.js` - Onboarding de novos usuários
- `busca.page.js` - Busca de produtos
- `mission.page.js` - Detalhes de missões

### `/services/`
Serviços de negócio e lógica de domínio.

- `user.service.js` - Gestão de perfis de usuários
- `order.service.js` - Gestão de pedidos
- `product.service.js` - Gestão de produtos
- `invite.service.js` - Sistema de convites
- `mission.service.js` - Sistema de gamificação/missões
- `reward.service.js` - Sistema de recompensas
- `points.service.js` - Gestão de pontos (Méritos)

### `/utils/`
Funções utilitárias e helpers.

- `dom.js` - Helpers para manipulação do DOM
- `format.js` - Formatação de dados (moeda, datas, etc)
- `loading.js` - Componentes de loading (skeleton, empty states)
- `constants.js` - Constantes da aplicação

### Arquivos na raiz

- `seed.js` - Script de seed para popular o banco de dados

## Padrões e Convenções

### Nomenclatura
- Arquivos de página: `*.page.js`
- Arquivos de serviço: `*.service.js`
- Arquivos de componente: `*.js` (na pasta components)
- Arquivos admin: `*.admin.js` (na pasta admin)

### Imports
```javascript
// Serviços Firebase
import { getDoc, setDoc } from "../firebase/db.service.js";
import { signIn, signUp } from "../firebase/auth.service.js";

// Serviços de negócio
import { getProfile, updateProfile } from "../services/user.service.js";
import { createOrder } from "../services/order.service.js";

// Componentes
import { toast, toastSuccess } from "../components/toast.js";
import { modalConfirm } from "../components/modal.js";

// Utilitários
import { $, onAction, setHtml } from "../utils/dom.js";
import { money, dateShort } from "../utils/format.js";

// Estado
import * as store from "../app/state.js";
```

### Estado Global
O estado é gerenciado pelo `state.js` usando o padrão observer:

```javascript
// Setar valor
store.set("profile", userProfile);

// Obter valor
const profile = store.get("profile");

// Inscrever para mudanças
store.subscribe("profile", () => {
  // Reagir a mudanças no profile
});
```

### Navegação
A navegação é baseada em hash URL:

```javascript
// Navegar para página
window.location.hash = "#cardapio";

// Router detecta mudança e carrega página correspondente
```

### Ações do DOM
Ações são registradas usando `data-action`:

```html
<button data-action="add-to-cart" data-id="123">Adicionar</button>
```

```javascript
onAction("add-to-cart", (el) => {
  const productId = el.dataset.id;
  // Lógica de adicionar ao carrinho
});
```

## Fluxo de Dados

1. **Usuário interage** → Evento DOM
2. **Handler de ação** → Processa evento
3. **Serviço de negócio** → Executa lógica
4. **Serviço Firebase** → Persiste dados
5. **Estado global** → Atualiza store
6. **Subscribe** → Componentes reagem
7. **Renderização** → UI atualizada

## Segurança

- Autenticação via Firebase Auth
- Roles (admin, agent, client) no Firestore
- Proteção de rotas baseada em roles
- Regras de segurança do Firestore
- Validação de dados no cliente e servidor

## Performance

- Carregamento lazy de páginas
- Cache de missões (5 minutos)
- Skeleton loading para melhor UX
- Watchers em tempo real apenas quando necessário
- Otimização de queries do Firestore

## Próximas Melhorias

- [ ] Adicionar sistema de logging estruturado
- [ ] Implementar analytics e observabilidade
- [ ] Adicionar testes unitários
- [ ] Melhorar tratamento de erros
- [ ] Otimizar bundle size
- [ ] Adicionar service worker para offline
