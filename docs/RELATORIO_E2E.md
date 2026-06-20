# 🍔 MrBur — "A Ordem" · Documentação Ilustrada Ponta a Ponta (E2E)

> Passeio visual completo pelo aplicativo **MrBur**, organizado pelas três personas do sistema.
> Cada tela traz a captura real, uma explicação curta da funcionalidade e um caso de uso prático.

---

## O que é o MrBur

O **MrBur — "A Ordem"** é uma plataforma gamificada de fidelização e pedidos para hamburguerias premium. Mais do que um cardápio digital, o app veste toda a experiência com uma linguagem cinematográfica de **espionagem e agentes secretos**: o cliente é um *Agente* com codinome permanente, sobe de *patente* (ranks/níveis), acumula *méritos* (a moeda de pontos do clube), cumpre *missões*, resgata *recompensas* e cria seus próprios lanches — que podem ser "forkados" e "estrelados" por outros agentes da Ordem.

Tecnicamente é um app **mobile-first, dark premium**, construído em **HTML + CSS + JavaScript Vanilla (ES Modules)** sobre **Firebase** (Auth, Firestore e Storage), com sincronização em **tempo real** via `onSnapshot`, suporte **PWA** e uma **versão Web/Desktop** dedicada.

### O conceito "A Ordem"

A gamificação é o coração do produto. A metáfora de espionagem dá identidade a cada elemento:

- **Agentes** em vez de usuários, com **codinomes** gerados no onboarding e **patentes** que evoluem.
- **Méritos** (1 R$ = 1 mérito) como pontos de fidelidade, com extrato, resgates e loja.
- **Transmissões** (pedidos), **Missões** (desafios com recompensa) e **Convites** (gate de acesso exclusivo).
- **Criações** — lanches autorais que viram conteúdo social (forks e estrelas) dentro do Clube.

### As três personas

| Persona | Onde acessa | Papel na Ordem |
| --- | --- | --- |
| 🕵️ **Agente Cliente** | `/` (app mobile) e `/web.html` (desktop) | Monta lanches, faz pedidos, paga, acompanha entregas, evolui no clube. |
| 🛵 **Agente Motoboy** | `/motoboy.html` | Recebe rotas, sai para entrega e transmite localização ao vivo. |
| 👑 **Agente Admin** | `/admin.html` | Comanda catálogo, pedidos, agentes, missões, recompensas e convites. |

### Como o app funciona em alto nível

1. O **Cliente** entra com um convite válido, faz onboarding, monta um lanche e finaliza o pedido (pagamento de demonstração).
2. O **Admin** vê o pedido em tempo real, gerencia o status (recebido → produção → enviado → entregue) e administra todo o catálogo e a economia de méritos.
3. Ao sair para entrega, o **Motoboy** transmite a localização, e o Cliente acompanha o **rastreamento ao vivo** na tela de Pedidos.
4. Pedido entregue credita méritos, avança missões e alimenta o ranking — fechando o ciclo de fidelização.

---

## 🕵️ Cliente

A jornada do Agente Cliente, do primeiro boot ao acompanhamento de pedidos e à vida social no Clube.

### Login & Boot

#### Abertura cinematográfica (Boot/Intro)
![Boot/Intro](e2e/01-cliente/01-boot-intro.png)

Sequência de abertura imersiva que apresenta a identidade "A Ordem" antes do app carregar. A introdução completa roda uma única vez por dispositivo e oferece um botão **Pular** sempre visível para quem já conhece.

**Caso de uso:** primeiro acesso do agente — estabelece o tom de espionagem e prepara o login por convite.

### Home

#### Página inicial (Sua Patente & Acesso Rápido)
![Home](e2e/01-cliente/02-home.png)

Painel de entrada do agente: exibe a **patente atual** (ex.: *Guardião · Nível 3*) com barra de progresso até o próximo nível, atalhos de **Acesso Rápido** (Missões, Recompensas, Pedidos, Cardápio) e um carrossel de **Recompensas em Destaque** com resgate direto por méritos.

**Caso de uso:** ao abrir o app, o agente vê seu status, quanto falta para subir de patente e resgata uma recompensa em destaque sem navegar por menus.

### Monte Seu Lanche

O wizard de montagem guia o agente por etapas (pão, carne, queijos, salada, molhos, extras) até a revisão final.

#### Monte Seu Lanche — Passo 1
![Monte Seu Lanche - Passo 1](e2e/01-cliente/03-cardapio-monte-passo1.png)

Primeira etapa do montador, com escolha da base do lanche. Cada item mostra preço e seletor de quantidade, e o total acompanha em tempo real.

**Caso de uso:** o agente inicia a criação de um burger autoral escolhendo o pão.

#### Monte Seu Lanche — Passo 2
![Monte Seu Lanche - Passo 2](e2e/01-cliente/04-cardapio-monte-passo2.png)

Continuação do wizard com a próxima categoria de ingredientes. A navegação por passos mantém o contexto e permite voltar a qualquer etapa.

**Caso de uso:** escolher a carne/proteína do lanche em construção.

#### Monte Seu Lanche — Passo 3
![Monte Seu Lanche - Passo 3](e2e/01-cliente/05-cardapio-monte-passo3.png)

Etapa intermediária de complementos (queijos/adicionais). Os itens "inclusos" não somam preço; os premium exibem o acréscimo.

**Caso de uso:** adicionar queijos extras e ajustar o lanche ao gosto.

#### Monte Seu Lanche — Passo 4
![Monte Seu Lanche - Passo 4](e2e/01-cliente/06-cardapio-monte-passo4.png)

Seleção de saladas e vegetais frescos. O wizard valida combinações e mantém o resumo de preço sempre atualizado.

**Caso de uso:** incluir alface, tomate e cebola caramelizada.

#### Monte Seu Lanche — Passo 5
![Monte Seu Lanche - Passo 5](e2e/01-cliente/07-cardapio-monte-passo5.png)

Etapa de molhos e finalização de sabor, com opções inclusas e premium.

**Caso de uso:** definir os molhos da criação antes de revisar.

#### Monte Seu Lanche — Passo 6
![Monte Seu Lanche - Passo 6](e2e/01-cliente/08-cardapio-monte-passo6.png)

Último passo de extras/adicionais, fechando a composição do lanche antes da revisão.

**Caso de uso:** acrescentar bacon ou ovo como toque final.

#### Revisão do Lanche
![Revisão do Lanche](e2e/01-cliente/14-cardapio-revisao.png)

Tela de revisão que consolida os ingredientes e o preço total. Se a composição **diferir do básico padrão**, o lanche vira uma **criação** com codinome gerado automaticamente (ex.: `chapa-sagrada`), elegível a forks, estrelas e **+50⚡** ao criador; se for o combo padrão, entra como **"Clássico MrBur"** — lanche comum, sem forks/estrelas. _(Regra v1.4.20.)_

**Caso de uso:** conferir o lanche, ver se é criação inédita ou clássico, e enviar à sacola.

### Cardápio (Categorias)

Além do montador, o cardápio oferece categorias prontas.

#### Lanche do Dia
![Lanche do Dia](e2e/01-cliente/09-cardapio-dia.png)

Destaque rotativo com a oferta especial do dia, normalmente com preço ou condição diferenciada.

**Caso de uso:** o agente aproveita a promoção diária sem montar nada do zero.

#### MBox
![MBox](e2e/01-cliente/10-cardapio-mbox.png)

A **MBox** é a caixa-surpresa de sábado: o conteúdo fica **oculto até o corte de sexta às 22h**, com estoque limitado por sábado.

**Caso de uso:** o agente reserva a surpresa do chef para o próximo sábado sem saber o conteúdo.

#### Acompanhamentos
![Acompanhamentos](e2e/01-cliente/11-cardapio-acomp.png)

Categoria de porções e acompanhamentos (batatas, fritas e similares) para somar ao pedido.

**Caso de uso:** adicionar uma porção de batata ao lanche principal.

#### Bebidas
![Bebidas](e2e/01-cliente/12-cardapio-bebidas.png)

Lista de bebidas disponíveis com preço e quantidade.

**Caso de uso:** completar o pedido com um refrigerante ou suco.

#### Sobremesas
![Sobremesas](e2e/01-cliente/13-cardapio-sobremesas.png)

Categoria de sobremesas para finalizar a refeição.

**Caso de uso:** incluir uma sobremesa antes do checkout.

### Sacola & Pagamento

#### Sacola
![Sacola](e2e/01-cliente/15-sacola.png)

Carrinho com todos os itens, ajuste de quantidade, remoção, limpeza e total. Persiste entre sessões e leva ao checkout.

**Caso de uso:** revisar tudo o que foi adicionado, ajustar quantidades e seguir para o pagamento.

#### Pagamento — Cartão
![Pagamento Cartão](e2e/01-cliente/16-pagamento-cartao.png)

Opção de pagamento por cartão no checkout (demonstração — nenhuma cobrança real).

**Caso de uso:** o agente finaliza o pedido informando os dados de cartão simulados.

#### Pagamento — Pix
![Pagamento Pix](e2e/01-cliente/17-pagamento-pix.png)

Opção de pagamento via Pix no checkout (demonstração).

**Caso de uso:** finalizar o pedido com Pix simulado.

#### Pagamento — Méritos
![Pagamento Méritos](e2e/01-cliente/18-pagamento-meritos.png)

Pagamento usando os **méritos** acumulados do clube, abatendo do saldo do agente.

**Caso de uso:** o agente gasta os pontos de fidelidade para pagar (total ou parcialmente) o pedido.

### Pedidos & Rastreio

#### Meus Pedidos
![Pedidos](e2e/01-cliente/19-pedidos.png)

Histórico de transmissões (pedidos) com timeline de status em tempo real, opção de **repetir pedido** e — quando o motoboy está em rota — o **rastreamento ao vivo** da entrega.

**Caso de uso:** o agente acompanha o status mudar de "recebido" a "entregue" e vê o motoboy se aproximando no mapa.

### Clube, Criações & Gamificação

#### Clube (visão geral)
![Clube](e2e/01-cliente/20-clube.png)

Hub de gamificação do agente, reunindo patente, méritos, criações, histórico, missões, ranking e recompensas em abas.

**Caso de uso:** ponto central para acompanhar toda a vida do agente dentro da Ordem.

#### Clube — Criações
![Clube Criações](e2e/01-cliente/21-clube-criacoes.png)

Galeria de lanches autorais (criações). Cada criação pode receber **estrelas** e ser **forkada** por outros agentes, que adicionam uma cópia idêntica à própria sacola.

**Caso de uso:** o agente publica sua criação e vê quantas estrelas e forks ela recebeu da comunidade.

#### Clube — Histórico
![Clube Histórico](e2e/01-cliente/22-clube-historico.png)

Extrato detalhado de méritos: entradas (pedidos, missões, recompensas) e saídas (resgates), com data e descrição.

**Caso de uso:** o agente confere de onde vieram e para onde foram seus méritos.

#### Clube — Missões
![Clube Missões](e2e/01-cliente/23-clube-missoes.png)

Lista de missões/desafios com progresso e recompensa em méritos. Concluir missões avança a fidelização.

**Caso de uso:** o agente cumpre a missão "faça X pedidos na semana" e resgata a recompensa.

#### Clube — Ranking
![Clube Ranking](e2e/01-cliente/24-clube-ranking.png)

Placar de agentes ordenado por méritos/patente, incentivando a competição saudável dentro da Ordem.

**Caso de uso:** o agente vê sua posição no ranking e quanto falta para subir.

#### Clube — Recompensas
![Clube Recompensas](e2e/01-cliente/25-clube-recompensas.png)

Catálogo de recompensas resgatáveis com méritos (frete grátis, brindes, experiências), filtráveis por categoria, com indicação de custo e estoque.

**Caso de uso:** o agente troca seus méritos por um "frete grátis" ou "burger grátis".

### Busca, Convites & Perfil

#### Busca
![Busca](e2e/01-cliente/26-busca.png)

Busca sobre o catálogo com filtro por nome e tags e atalhos para categorias.

**Caso de uso:** o agente encontra rapidamente um produto específico digitando o nome.

#### Convites
![Convites](e2e/01-cliente/27-convites.png)

Painel de convites do agente: estatísticas (enviados, usados, ativos, expirados, conversão) e gestão dos códigos para trazer novos membros para a Ordem.

**Caso de uso:** o agente gera e compartilha um convite para indicar um amigo.

#### Perfil
![Perfil](e2e/01-cliente/28-perfil.png)

Dossiê editável do agente: telefone, endereço, tema claro/escuro e notificações de pedido. O **codinome é permanente** e fica bloqueado.

**Caso de uso:** o agente atualiza seu endereço de entrega e ativa as notificações de status.

### Versão Web / Desktop (PWA)

A mesma experiência adaptada para telas grandes em `/web.html`.

#### Web — Início
![Web Início](e2e/01-cliente/29-web-inicio.png)

Home da versão desktop, com layout em largura ampla mantendo a identidade dark premium.

**Caso de uso:** o agente acessa pelo computador e tem a experiência otimizada para desktop.

#### Web — Cardápio
![Web Cardápio](e2e/01-cliente/30-web-cardapio.png)

Cardápio e montador na versão web, com aproveitamento do espaço horizontal.

**Caso de uso:** montar um lanche confortavelmente no navegador desktop.

#### Web — Sacola
![Web Sacola](e2e/01-cliente/31-web-sacola.png)

Sacola/checkout na versão web.

**Caso de uso:** revisar e finalizar o pedido pelo desktop.

#### Web — Pedidos
![Web Pedidos](e2e/01-cliente/32-web-pedidos.png)

Acompanhamento de pedidos na versão web, em tempo real.

**Caso de uso:** acompanhar o status do pedido sem sair do computador.

#### Web — Clube
![Web Clube](e2e/01-cliente/33-web-clube.png)

Clube e gamificação na versão web.

**Caso de uso:** conferir méritos, ranking e recompensas pelo desktop.

---

## 🛵 Motoboy

A "Central de Entregas" do Agente Motoboy, acessada em `/motoboy.html` após o admin ativar o papel.

#### Central de Entregas
![Central de Entregas](e2e/02-motoboy/01-central-entregas.png)

Tela principal do motoboy, com KPIs no topo (entregas, faturamento do dia, concluídas) e a lista de transmissões/pedidos atribuídos à sua rota.

**Caso de uso:** o motoboy abre o turno e vê todas as entregas que precisa realizar no dia.

#### Resumo / KPIs
![Resumo KPIs](e2e/02-motoboy/02-resumo-kpis.png)

Painel resumido com os indicadores do motoboy: total de entregas, valor transportado e quantidade concluída.

**Caso de uso:** acompanhar a produtividade da jornada em um relance.

#### Sem rota ativa
![Sem rota ativa](e2e/02-motoboy/03-sem-rota-ativa.png)

Estado vazio quando não há entregas em andamento — sinaliza que o motoboy está disponível e aguardando rota.

**Caso de uso:** entre uma entrega e outra, o motoboy confirma que não há nada pendente.

#### Entregas em rota
![Entregas em rota](e2e/02-motoboy/04-entregas-em-rota.png)

Lista das entregas em andamento, com endereço, itens e ação para marcar "saiu para entrega" / atualizar o status.

**Caso de uso:** o motoboy marca "Saiu para entrega" e o cliente passa a ver o pedido a caminho.

#### Entregas concluídas
![Entregas concluídas](e2e/02-motoboy/05-entregas-concluidas.png)

Histórico das entregas já finalizadas no período, para conferência.

**Caso de uso:** ao fim do turno, o motoboy revisa tudo o que entregou.

#### Localização ativada
![Localização ativada](e2e/02-motoboy/06-localizacao-on.png)

Estado com a transmissão de **📡 Localização** ligada — o motoboy compartilha a posição ao vivo, que alimenta o rastreamento na tela de Pedidos do cliente.

**Caso de uso:** o motoboy ativa a localização e o cliente acompanha a entrega se aproximando em tempo real.

---

## 👑 Admin

O "Painel de Comando" do Agente Admin, em `/admin.html`, com acesso protegido por papel (`role:"admin"`).

#### Dashboard
![Dashboard](e2e/03-admin/01-dashboard.png)

Visão executiva com os principais indicadores do negócio: pedidos, faturamento, agentes e atividade recente.

**Caso de uso:** o admin abre o painel e tem o pulso da operação em uma única tela.

#### Dashboard (continuação)
![Dashboard continuação](e2e/03-admin/02-dashboard.png)

Continuação do dashboard com gráficos e blocos complementares de métricas.

**Caso de uso:** aprofundar a leitura dos números do dia.

#### Relatórios
![Relatórios](e2e/03-admin/03-relatorios.png)

Relatórios analíticos consolidados (vendas, desempenho, evolução) para apoiar decisões.

**Caso de uso:** o admin avalia o desempenho do período antes de planejar promoções.

#### Pedidos (tempo real)
![Pedidos](e2e/03-admin/04-pedidos.png)

Fila de pedidos em tempo real, com filtros por status e troca de status (recebido → analisando → aprovado → produção → enviado → entregue), que reflete imediatamente no app do cliente.

**Caso de uso:** o admin recebe um pedido novo, aprova e o coloca em produção; o cliente vê a mudança na hora.

#### Produtos
![Produtos](e2e/03-admin/05-produtos.png)

CRUD completo de produtos do catálogo, incluindo upload de imagem, preço, categoria e disponibilidade.

**Caso de uso:** o admin cadastra um novo lanche com foto e o disponibiliza no cardápio.

#### Monte Seu Lanche (administração)
![Monte Seu Lanche Admin](e2e/03-admin/06-monte-seu-lanche.png)

Gestão dos ingredientes do montador, agrupados por categoria (Pão, Carne, Queijos, Salada, Molhos…), com preço, marcação de "incluso/premium" e disponibilidade de cada item.

**Caso de uso:** o admin define quais ingredientes aparecem no wizard e quanto cada um custa.

#### Lanche do Dia
![Lanche do Dia Admin](e2e/03-admin/07-lanche-do-dia.png)

Configuração da oferta do dia exibida no cardápio do cliente.

**Caso de uso:** o admin programa o "Lanche do Dia" e seu preço promocional.

#### MBox
![MBox Admin](e2e/03-admin/08-mbox.png)

Gestão dos combos MBox — composição e preço dos kits prontos.

**Caso de uso:** o admin monta um novo combo MBox para a semana.

#### Agentes
![Agentes](e2e/03-admin/09-agentes.png)

Gestão dos agentes (clientes): ranking, méritos, histórico de pedidos e o toggle que **ativa o papel de motoboy**.

**Caso de uso:** o admin promove `agente1` a motoboy ativando o toggle, liberando o acesso a `/motoboy.html`.

#### Missões
![Missões](e2e/03-admin/10-missoes.png)

Administração das missões/desafios: ativar, pausar e gerenciar os objetivos que rendem méritos aos agentes.

**Caso de uso:** o admin cria uma missão sazonal para impulsionar pedidos no fim de semana.

#### Recompensas
![Recompensas](e2e/03-admin/11-recompensas.png)

Administração do catálogo de recompensas resgatáveis: custo em méritos, categoria, tipo e estoque.

**Caso de uso:** o admin cadastra um brinde novo na loja de méritos.

#### Convites
![Convites Admin](e2e/03-admin/12-convites.png)

Gestão dos convites de acesso: geração em lote, status (ativos, usados, expirados, cancelados) e controle do gate de exclusividade.

**Caso de uso:** o admin gera um lote de convites para uma campanha de captação.

#### Funcionalidades
![Funcionalidades](e2e/03-admin/13-funcionalidades.png)

Painel de configuração de funcionalidades/flags do app, permitindo ligar e desligar recursos sem alterar código.

**Caso de uso:** o admin habilita ou desabilita um recurso para um teste controlado.

---

## ✅ Cobertura vs. Issue #38

Mapeamento dos cenários do roteiro E2E (issue #38) às telas capturadas.

| Cenário (Issue #38) | Coberto por |
| --- | --- |
| Cadastro / acesso por convite | `01-cliente/01-boot-intro.png`, `01-cliente/27-convites.png`, `03-admin/12-convites.png` |
| Montagem e pedido (Monte Seu Lanche) | `01-cliente/03`…`08-cardapio-monte-passo*.png`, `01-cliente/14-cardapio-revisao.png` |
| Cardápio por categorias | `01-cliente/11-cardapio-acomp.png`, `01-cliente/12-cardapio-bebidas.png`, `01-cliente/13-cardapio-sobremesas.png` |
| Sacola e checkout | `01-cliente/15-sacola.png` |
| Pagamento (cartão / Pix / méritos) | `01-cliente/16-pagamento-cartao.png`, `01-cliente/17-pagamento-pix.png`, `01-cliente/18-pagamento-meritos.png` |
| Admin gerencia status do pedido | `03-admin/04-pedidos.png` |
| Acompanhamento de pedidos / rastreio | `01-cliente/19-pedidos.png`, `02-motoboy/04-entregas-em-rota.png`, `02-motoboy/06-localizacao-on.png` |
| Fluxo do motoboy | `02-motoboy/01-central-entregas.png`…`06-localizacao-on.png` |
| Criações / forks / estrelas | `01-cliente/21-clube-criacoes.png` |
| Ranking | `01-cliente/24-clube-ranking.png`, `03-admin/09-agentes.png` |
| Missões | `01-cliente/23-clube-missoes.png`, `03-admin/10-missoes.png` |
| Recompensas / méritos | `01-cliente/25-clube-recompensas.png`, `01-cliente/22-clube-historico.png`, `03-admin/11-recompensas.png` |
| MBox | `01-cliente/10-cardapio-mbox.png`, `03-admin/08-mbox.png` |
| Lanche do Dia | `01-cliente/09-cardapio-dia.png`, `03-admin/07-lanche-do-dia.png` |
| Web / PWA | `01-cliente/29-web-inicio.png`…`33-web-clube.png` |
| Dashboard / Relatórios / Produtos (admin) | `03-admin/01-dashboard.png`, `03-admin/02-dashboard.png`, `03-admin/03-relatorios.png`, `03-admin/05-produtos.png`, `03-admin/06-monte-seu-lanche.png`, `03-admin/13-funcionalidades.png` |
| Home / Patente / Busca / Perfil | `01-cliente/02-home.png`, `01-cliente/20-clube.png`, `01-cliente/26-busca.png`, `01-cliente/28-perfil.png` |

---

> **Data:** 2026-06-19 · **Versão do app:** 1.4.20
>
> ⚠️ **Nota:** os fluxos de **pagamento (cartão, Pix e méritos) são de demonstração** — nenhuma cobrança real é efetuada.
