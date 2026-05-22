# Guia Completo de Seeds - MrBur MVP

## Pré-requisitos

Antes de rodar os seeds, você precisa:

1. **Ter o arquivo `service-account.json`** na raiz do projeto
   - Baixe do Firebase Console → Configurações do Projeto → Contas de Serviço
   - Clique em "Gerar nova chave privada"
   - Salve como `service-account.json` na raiz do projeto
   - ⚠️ **Nunca commitar este arquivo!** Já está no `.gitignore`

2. **Ter Node.js instalado**
   - Node.js 14+ recomendado

3. **Ter as dependências instaladas**
   ```bash
   npm install
   ```

## Scripts de Seed Disponíveis

### 1. create-missions.js - Cria Missões

Cria 10 missões no sistema de gamificação:

```bash
node create-missions.js
```

**Missões criadas:**
- Agente Recrutado (signup) - 50 pontos
- Primeira Mordida (first_order) - 100 pontos
- Agente Ativo (orders_3) - 150 pontos
- Veterano da Ordem (orders_10) - 500 pontos
- Recruta Promissor (points_500) - 50 pontos
- Agente Destaque (points_1000) - 100 pontos
- Recrutador (invite_1) - 200 pontos
- Líder de Esquadrão (invite_3) - 500 pontos
- Fidelidade Inabalável (week_streak) - 300 pontos
- Explorador MBox (mbox_1) - 200 pontos

### 2. create-rewards.js - Cria Recompensas

Cria 13 recompensas na loja interna em 4 categorias:

```bash
node create-rewards.js
```

**Recompensas criadas:**

**Benefícios (3):**
- Frete Grátis - 100 pontos
- 10% OFF - 150 pontos
- 20% OFF - 300 pontos

**Produtos Físicos (5):**
- Burger Grátis - 500 pontos (estoque: 50)
- Combo VIP - 800 pontos (estoque: 30)
- MBox Surpresa - 1000 pontos (estoque: 20)
- Camiseta MrBur - 1500 pontos (estoque: 25)
- Boné Exclusivo - 1200 pontos (estoque: 40)

**Experiências (3):**
- Acesso Early - 2000 pontos
- Menu Secreto - 2500 pontos
- Evento Exclusivo - 3000 pontos (estoque: 10)

**Status (2):**
- VIP Mensal - 500 pontos
- VIP Trimestral - 1200 pontos

### 3. create-users.js - Cria Usuários e Convites

Cria/atualiza usuários de teste e gera códigos de convite automaticamente:

```bash
node create-users.js
```

**Usuários criados:**

**Admin:**
- Email: admin@mrbur.com
- Senha: admin123456
- Role: admin
- Pontos: 0
- Convites: 99 códigos gerados automaticamente

**Agente 1:**
- Email: agente1@mrbur.com
- Senha: agente123456
- Role: agent
- Pontos: 100
- Convites: 3 códigos gerados automaticamente

**Agente 2:**
- Email: agente2@mrbur.com
- Senha: agente123456
- Role: agent
- Pontos: 500
- Convites: 5 códigos gerados automaticamente

**Agente 3:**
- Email: agente3@mrbur.com
- Senha: agente123456
- Role: agent
- Pontos: 1500
- Convites: 10 códigos gerados automaticamente

**O que o script faz:**
1. Cria usuários no Firebase Auth (se não existirem)
2. Cria/atualiza documentos no Firestore
3. Inicializa progresso de missões para cada usuário
4. **Gera códigos de convite automaticamente** baseado em `invitesAvailable`
5. Exibe todos os códigos de convite gerados no final

## Ordem Recomendada de Execução

Para um ambiente completo, rode na seguinte ordem:

```bash
# 1. Criar missões
node create-missions.js

# 2. Criar recompensas
node create-rewards.js

# 3. Criar usuários e convites
node create-users.js
```

## Códigos de Convite Gerados

Após rodar `create-users.js`, o script exibirá todos os códigos de convite gerados:

```
🎫 Códigos de Convite:
   ADMIN: MRB-C38J43, MRB-0MAFDZ, MRB-H8Q6YV, ...
   AGENTE1: MRB-5HDP6P, MRB-5ESQ33, MRB-8P4DY3
   AGENTE2: MRB-67I1JH, MRB-2Z9E6U, MRB-V9XNE3, MRB-3RVWSJ, MRB-XYI9M6
   AGENTE3: MRB-DFQOFS, MRB-MY38XH, MRB-VQM37O, MRB-PMNJGL, MRB-V7IU6Z, ...
```

**Como usar os códigos:**
1. Copie qualquer código de convite
2. Use na tela de cadastro/registro
3. Cada código permite 1 cadastro
4. Convites expiram em 30 dias

## Troubleshooting

### Erro: "Cannot find module './service-account.json'"
- Certifique-se de que o arquivo `service-account.json` está na raiz do projeto
- Verifique se o nome do arquivo está correto

### Erro: "Error: Credential type not supported"
- O arquivo `service-account.json` pode estar corrompido
- Baixe novamente a chave privada do console do Firebase

### Erro: "Missing or insufficient permissions"
- Verifique se o service account tem permissões de admin
- Verifique as regras de segurança do Firestore

### Erro: "Email already exists"
- O script trata isso automaticamente
- Atualiza o perfil existente em vez de criar um novo
- Gera novos convites para o usuário existente

## Seed Original (seed.js)

O script `seed.js` original ainda está disponível e cria:
- Produtos do cardápio
- Recompensas básicas
- Convites demo
- Agentes de exemplo

Para usar o seed original:

```bash
npm run seed
```

Ou com admin:

```bash
npm run seed <UID_DO_USUARIO> <EMAIL_DO_USUARIO>
```

## Verificação

Após rodar os seeds, você pode verificar no Firebase Console:

1. **Firestore → users** - Ver usuários criados
2. **Firestore → missions** - Ver missões criadas
3. **Firestore → rewards** - Ver recompensas criadas
4. **Firestore → invites** - Ver convites criados
5. **Firestore → missionProgress** - Ver progresso de missões
6. **Authentication** - Ver usuários no Firebase Auth

## Limpeza

Para limpar dados de teste:

```bash
# No Firebase Console, manualmente:
# 1. Delete documentos das collections
# 2. Delete usuários no Authentication
# 3. Rode os seeds novamente
```

## Próximos Passos

Após rodar os seeds:

1. Acesse o app: `http://localhost:5000` (ou seu domínio)
2. Faça login com as credenciais de teste
3. Use os códigos de convite para testar cadastro
4. Teste o sistema de missões e recompensas
5. Acesse o painel admin: `/admin.html`
