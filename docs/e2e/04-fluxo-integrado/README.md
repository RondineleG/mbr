# 🔄 Fluxo Integrado — Pedido Ponta a Ponta (3 personas em tempo real)

Jornada **completa e real** de um pedido percorrendo as três personas, capturada com os
três painéis abertos ao mesmo tempo e sincronizados pelo Firestore em tempo real:

> **Cliente** monta e pede → **Admin** recebe, processa e envia → **Motoboy** recebe, rastreia e conversa no chat → **Cliente** responde → **Motoboy** marca entregue → **Cliente** recebe os méritos.

Pedido demonstrado: **ORD-2606-4LB8** · item **`fogueira-imperial`** (criação inédita gerada com adicional pago) · pagamento de demonstração.

---

## 1. 🕵️ Cliente monta e faz o pedido

### 1.1 Home do agente
![Home](01-cliente-home.png)
O agente entra logado, com patente, méritos e atalhos.

### 1.2 Monte Seu Lanche (adiciona um adicional pago)
![Monta o lanche](02-cliente-monta-lanche.png)
Ao incluir o **Bacon Artesanal** (adicional), a composição passa a diferir do básico → o lanche vira uma **criação inédita**.

### 1.3 Revisão da criação
![Revisão](03-cliente-revisao-criacao.png)
Resumo dos ingredientes e preço. Por diferir do padrão, recebe **codinome automático** e concorre a forks/estrelas + **+50⚡**.

### 1.4 Sacola
![Sacola](04-cliente-sacola.png)
Carrinho com o lanche, subtotal, **frete por km** (endereço geocodificado) e total.

### 1.5 Pagamento (cartão — demonstração)
![Pagamento](05-cliente-pagamento.png)
Checkout com cartão (também há Pix e méritos). **Nenhuma cobrança real.**

### 1.6 Pedido criado
![Pedido criado](06-cliente-pedido-criado.png)
Pedido registrado e visível em **Pedidos** com status inicial **Recebido**.

---

## 2. 👑 Admin recebe e processa (tempo real)

### 2.1 Pedido recebido no painel
![Admin recebido](07-admin-pedido-recebido.png)
O pedido aparece na fila do admin **na hora** em que foi criado.

### 2.2 Status → Analisando
![Analisando](08-admin-status-analisando.png)

### 2.3 Status → Aprovado
![Aprovado](09-admin-status-aprovado.png)
Após aprovar, o seletor de **atribuição de motoboy** é liberado.

### 2.4 Motoboy atribuído
![Motoboy atribuído](10-admin-motoboy-atribuido.png)
O admin designa o agente de entrega responsável pelo pedido.

### 2.5 Status → Enviado
![Enviado](11-admin-pedido-enviado.png)
Pedido sai para entrega; o motoboy passa a vê-lo na Central.

---

## 3. 🛵 Motoboy recebe, rastreia e conversa

### 3.1 Entrega recebida na Central
![Entrega recebida](12-motoboy-entrega-recebida.png)
O pedido enviado aparece em **Entregas em rota** para o motoboy designado.

### 3.2 Rota PCV + mapa
![Rota e mapa](13-motoboy-rota-mapa.png)
Com o pedido geolocalizado, a **rota otimizada (caixeiro-viajante)** e o **mapa Leaflet** renderizam saindo e voltando à sede.

### 3.3 Mensagem ao cliente (chat)
![Mensagem enviada](14-motoboy-mensagem-enviada.png)
O motoboy abre o chat do pedido e avisa o cliente que saiu para a entrega.

---

## 4. 🕵️ Cliente acompanha e responde

### 4.1 Rastreio ao vivo
![Rastreio](15-cliente-rastreio.png)
Em **Pedidos**, o cliente vê o mini-mapa do motoboy → destino, atualizando ao vivo.

### 4.2 Recebe a mensagem do entregador
![Recebe mensagem](16-cliente-recebe-mensagem.png)
O botão **💬 Falar com entregador** (só aparece após "enviado") abre o chat com a mensagem do motoboy.

### 4.3 Cliente responde
![Cliente responde](17-cliente-responde.png)
O cliente responde no mesmo chat, em tempo real.

### 4.4 Motoboy recebe a resposta
![Motoboy recebe resposta](18-motoboy-recebe-resposta.png)
A resposta chega instantaneamente do lado do motoboy.

---

## 5. ✅ Entrega concluída + méritos

### 5.1 Motoboy marca como Entregue
![Marca entregue](19-motoboy-marca-entregue.png)
Ao concluir, o pedido vai para **Concluídas** e o motoboy ganha a taxa + méritos da entrega.

### 5.2 Cliente vê o pedido entregue
![Pedido entregue](20-cliente-pedido-entregue.png)
Status final **Entregue** no app do cliente.

### 5.3 Méritos creditados (Extrato)
![Extrato de méritos](21-cliente-extrato-meritos.png)
O cliente recebe os **méritos** do pedido (1⚡/R$) — visível no **Clube → Extrato**.

---

> **Data:** 2026-06-20 · **App:** 1.4.20 · Pedido demo **ORD-2606-4LB8** (entregue, méritos creditados).
> Captura gerada por `scripts/e2e-shot/fluxo-integrado.mjs` (3 navegadores + Admin SDK).
> ⚠️ Pagamento é **demonstração** — nenhuma cobrança real.
