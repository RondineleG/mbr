# Configuração PWA - MrBur

## ✅ PWA Configurado

O app agora está configurado como PWA (Progressive Web App) com suporte para:

- **Desktop**: Instalável como app nativo
- **iOS**: Adicionável à tela de início
- **Android**: Instalável via Chrome

## 📁 Arquivos Criados

1. **`public/manifest.json`** - Manifesto PWA
2. **`public/sw.js`** - Service Worker para cache offline
3. **`public/icon.svg`** - Ícone SVG base
4. **Meta tags** no `index.html` para iOS

## 🎨 Ícones Necessários

Para completar a configuração PWA, você precisa criar os ícones PNG:

### Opção 1: Usar ferramenta online
1. Acesse [https://realfavicongenerator.net/](https://realfavicongenerator.net/)
2. Use o `public/icon.svg` como base
3. Configure para gerar ícones 192x192 e 512x512
4. Baixe e coloque em `public/`

### Opção 2: Criar manualmente
Crie estes arquivos na pasta `public/`:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

Use o emoji 🍔 em fundo escuro (#060503) com borda dourada (#C9A84C)

## 🚀 Como Testar

### Desktop (Chrome/Edge)
1. Abra o app no navegador
2. Clique no ícone de instalação na barra de endereço
3. Instale como app

### iOS (Safari)
1. Abra o app no Safari
2. Clique no botão Compartilhar
3. "Adicionar à Tela de Início"

### Android (Chrome)
1. Abra o app no Chrome
2. Clique no menu (três pontos)
3. "Instalar app" ou "Adicionar à tela inicial"

## 🔧 Recursos PWA Ativos

✅ Manifesto PWA configurado  
✅ Service Worker para cache offline  
✅ Meta tags para iOS  
✅ Tema da aplicação (#C9A84C)  
✅ Display standalone (sem barra de endereço)  
✅ Shortcuts para ações rápidas  
⏳ Ícones PNG (precisam ser criados)  

## 📱 Funcionalidades

- **Offline**: Funciona parcialmente offline (cache de recursos estáticos)
- **Instalação**: Pode ser instalado como app nativo
- **Tela Início**: Ícone na home screen
- **Shortcuts**: Acesso rápido a "Fazer Pedido" e "Meus Pedidos"
- **Theme Color**: Barra de status com cor da marca

## 🚨 Importante

O Service Worker atual faz cache apenas de recursos estáticos. Para funcionalidade completa offline, seria necessário:
- Cache de dados do Firebase
- Estratégia de sincronização quando voltar online
- UI de estado offline

Isso pode ser implementado em uma fase posterior se necessário.