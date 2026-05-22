# Configuração do Seed de Produção

Existem **duas opções** para rodar o seed em produção:

## Opção 1: Firebase Admin SDK (Recomendado)

Esta opção usa o Firebase Admin SDK com permissões completas de administrador.

### Passo 1: Baixar Service Account Key

O script de seed precisa de um arquivo `service-account.json` com permissões de admin. Siga estes passos:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione o projeto `projetohowx`
3. Clique no ícone de engrenagem ⚙️ → "Configurações do projeto"
4. Vá em "Contas de serviço"
5. Clique em "Gerar nova chave privada"
6. Salve o arquivo como `service-account.json` na raiz do projeto (ao lado de `seed.js`)

⚠️ **IMPORTANTE**: Nunca commitar o arquivo `service-account.json`! Ele já está no `.gitignore`.

### Passo 2: Executar o Seed

#### Seed básico (produtos, recompensas, convites e agentes de exemplo):
```bash
npm run seed
```

#### Seed com admin (inclui perfil de administrador):
```bash
npm run seed <UID_DO_USUARIO> <EMAIL_DO_USUARIO>
```

Exemplo:
```bash
npm run seed abc123xyz user@email.com
```

## Opção 2: Firebase REST API (Alternativa)

Esta opção usa a API REST do Firebase sem precisar de service account. É mais limitado mas funciona se você não conseguir baixar a chave de serviço.

### Passo 1: Obter Token de Autenticação

1. Abra o app web no navegador
2. Faça login com sua conta
3. Abra o DevTools (F12)
4. Vá em Application → Local Storage
5. Copie o valor de `firebase:auth::token`

### Passo 2: Executar o Seed REST

```bash
npm run seed:rest <SEU_TOKEN_AQUI>
```

⚠️ **Limitações do método REST**:
- Não cria agentes de exemplo (requer permissões de admin)
- Não cria perfil de admin (requer Admin SDK)
- Apenas cria produtos, recompensas e convites

## O que o seed cria (Opção 1 - Admin SDK):

1. **Produtos**: 15 produtos (lanches, combos, acompanhamentos, bebidas, sobremesas)
2. **Recompensas**: 4 recompensas (frete grátis, burger grátis, combo VIP, MBox surpresa)
3. **Convites**: 1 convite demo + 4 convites aleatórios
4. **Agentes de exemplo**: 6 agentes com diferentes níveis (Alfa a Mestre)
5. **Admin** (opcional): Perfil de administrador com permissões completas

## Criar Missões no Firestore

Para criar as missões do sistema de gamificação, execute:

```bash
node create-missions.js
```

Isso criará 10 missões no Firestore:
- Agente Recrutado (signup)
- Primeira Mordida (first_order)
- Agente Ativo (orders_3)
- Veterano da Ordem (orders_10)
- Recruta Promissor (points_500)
- Agente Destaque (points_1000)
- Recrutador (invite_1)
- Líder de Esquadrão (invite_3)
- Fidelidade Inabalável (week_streak)
- Explorador MBox (mbox_1)

## Criar/Atualizar Usuários

Para criar ou atualizar usuários de teste com progresso de missões inicial:

```bash
node create-users.js
```

Isso criará/atualizará:
- 1 usuário admin (admin@mrbur.com)
- 3 usuários agentes (agente1@mrbur.com, agente2@mrbur.com, agente3@mrbur.com)
- Progresso inicial de missões para cada usuário

## Criar Recompensas na Loja

Para criar as recompensas da loja interna com categorias e estoque:

```bash
node create-rewards.js
```

Isso criará 13 recompensas em 4 categorias:
- **Benefícios** (3): Frete grátis, 10% OFF, 20% OFF
- **Produtos físicos** (5): Burger grátis, Combo VIP, MBox surpresa, Camiseta MrBur, Boné exclusivo
- **Experiências** (3): Acesso early, Menu secreto, Evento exclusivo
- **Status** (2): VIP mensal, VIP trimestral

## Painel Admin Completo

O painel administrativo foi expandido com novas seções:

- **Dashboard**: Visão geral com KPIs em tempo real
- **Pedidos**: Gerenciamento de pedidos com filtros de status
- **Produtos**: Gerenciamento do cardápio
- **Agentes**: Ranking e métricas dos usuários
- **Missões**: Gerenciamento do sistema de gamificação (criar, editar, pausar, excluir missões)
- **Recompensas**: Gerenciamento da loja interna (criar, editar, pausar, excluir recompensas)
- **Convites**: Gerenciamento do sistema de convites (criar, revogar, copiar códigos)

Acesse o painel admin em `/admin.html` com credenciais de administrador.

## O que o seed cria (Opção 2 - REST API):

1. **Produtos**: 15 produtos
2. **Recompensas**: 4 recompensas
3. **Convites**: 1 convite demo

## Troubleshooting

### Erro: "Cannot find module './service-account.json'"
- Certifique-se de que o arquivo `service-account.json` está na raiz do projeto
- Verifique se o nome do arquivo está correto
- Considere usar a opção 2 (REST API) se não conseguir baixar a chave

### Erro: "Error: Credential type not supported"
- O arquivo `service-account.json` pode estar corrompido
- Baixe novamente a chave privada do console do Firebase

### Erro: "Missing or insufficient permissions" (REST API)
- Verifique se o token de autenticação é válido
- Certifique-se de que o usuário tem permissões de admin no Firestore
- Tente usar a opção 1 (Admin SDK) para permissões completas

### Erro: "Token de autenticação não fornecido" (REST API)
- Siga os passos na Opção 2 para obter o token
- O token deve ser copiado do localStorage após fazer login no app

## Segurança

- O arquivo `service-account.json` contém credenciais sensíveis
- Nunca commitar este arquivo no Git
- Mantenha-o apenas localmente no ambiente de desenvolvimento
- Em produção, use variáveis de ambiente ou secrets do CI/CD
- Tokens de autenticação da REST API também são sensíveis
