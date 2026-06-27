# Vídeo do fluxo integrado — 3 personas

Pedido: **ORD-2606-B5ML** (cVjzziQC0nDbvBulKVt7)

Passos: **36/36** OK

## Vídeos
- 🧑 Cliente: `docs/e2e/videos/cliente.webm`
- 🛠️ Admin: `docs/e2e/videos/admin.webm`
- 🛵 Motoboy: `docs/e2e/videos/motoboy.webm`

## Passos
- ✅ Cliente · login no app
- ✅ Cliente · abre o cardápio / Monte Seu Lanche
- ✅ Cliente · adiciona adicional (Extras) → vira criação
- ✅ Cliente · avança até a revisão e adiciona à sacola
- ✅ Cliente · abre a sacola
- ✅ Cliente · checkout + dados do cartão
- ✅ Cliente · confirma o pagamento (cria o pedido)
- ✅ Sistema · localiza o pedido recém-criado no Firestore
- ✅ Admin · login no painel
- ✅ Admin · vai para Pedidos e localiza o pedido
- ✅ Admin · status → Em análise
- ✅ Admin · status → Aprovado (aceita o pedido)
- ✅ Admin · atribui o motoboy ao pedido
- ✅ Admin · status → Em produção
- ✅ Admin · status → Enviado (saiu para entrega)
- ✅ Motoboy · login na Central de Entregas
- ✅ Motoboy · liga o rastreio 📡 (despacho de saída)
- ✅ Motoboy · mapa/rota do pedido ativo
- ✅ Motoboy · abre o chat e escreve ao cliente
- ✅ Cliente · vê o pedido a caminho (rastreio em tempo real)
- ✅ Cliente · abre o chat e recebe a mensagem do motoboy
- ✅ Cliente · responde no chat
- ✅ Motoboy · recebe a resposta do cliente no chat
- ✅ Cliente · fecha o chat do entregador e abre 'Falar com a loja'
- ✅ Admin · abre o chat com o cliente e recebe a mensagem
- ✅ Admin · responde ao cliente (plataforma)
- ✅ Cliente · recebe a resposta da plataforma
- ✅ Admin/Cliente · fecham os chats abertos
- ✅ Motoboy · fecha o chat do cliente e abre 'Suporte'
- ✅ Admin · abre o chat com o motoboy e recebe a mensagem
- ✅ Admin · responde ao motoboy (plataforma)
- ✅ Motoboy · recebe a resposta do suporte
- ✅ Todos · fecham os chats de plataforma
- ✅ Motoboy · fecha o chat e marca como Entregue
- ✅ Cliente · vê o pedido como Entregue
- ✅ Cliente · Clube → extrato de méritos creditados