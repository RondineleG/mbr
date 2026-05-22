# Seed de Produção - MrBur

## Problema Original

O seed não estava funcionando em produção porque:
1. O seed só rodava automaticamente em modo DEMO
2. As Security Rules do Firestore exigem permissões de admin para escrever dados
3. Não existia um script para rodar o seed via linha de comando

## Solução Implementada

Criei **duas opções** para rodar o seed em produção:

### 📁 Arquivos Criados

1. **`seed.js`** - Script principal usando Firebase Admin SDK (recomendado)
2. **`seed-rest.js`** - Script alternativo usando Firebase REST API
3. **`package.json`** - Configuração do Node.js com dependências
4. **`SEED_SETUP.md`** - Guia completo de configuração
5. **`.gitignore`** - Atualizado para proteger `service-account.json`

### 🚀 Como Usar

#### Opção 1: Firebase Admin SDK (Completo)

1. Baixe a chave de serviço do Firebase Console
2. Salve como `service-account.json` na raiz
3. Rode: `npm run seed` ou `npm run seed <UID> <EMAIL>`

#### Opção 2: Firebase REST API (Limitado)

1. Faça login no app web
2. Copie o token do localStorage
3. Rode: `npm run seed:rest <TOKEN>`

### 📦 O que o Seed Cria

**Opção 1 (Admin SDK):**
- ✅ 15 produtos (lanches, combos, acompanhamentos, bebidas, sobremesas)
- ✅ 4 recompensas (frete grátis, burger grátis, combo VIP, MBox surpresa)
- ✅ 5 convites (1 demo + 4 aleatórios)
- ✅ 6 agentes de exemplo (diferentes níveis)
- ✅ Perfil de admin (opcional)

**Opção 2 (REST API):**
- ✅ 15 produtos
- ✅ 4 recompensas
- ✅ 1 convite demo
- ❌ Agentes de exemplo (requer admin)
- ❌ Perfil de admin (requer Admin SDK)

### 🔒 Segurança

- `service-account.json` está no `.gitignore`
- Nunca commitar credenciais
- Tokens de autenticação também são sensíveis

### 📖 Documentação Completa

Veja `SEED_SETUP.md` para instruções detalhadas e troubleshooting.