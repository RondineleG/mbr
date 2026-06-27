# MrBur "A Ordem" — Análise de UX & Usabilidade (tela a tela)

> Avaliação heurística do PWA mobile (cliente, admin e motoboy), tema dark + ouro.
> Base: inspeção visual das telas (capturas reais 390px) + leitura do código.
> Severidade: **P0** quebra a tarefa · **P1** atrito alto · **P2** melhoria clara · **P3** polimento.

## Placar heurístico (Nielsen, 0–4)

| # | Heurística | Nota | Principal achado |
|---|-----------|:---:|------|
| 1 | Visibilidade do status | 3 | Realtime forte (pedido/rastreio/chat). Falta progresso no login e em ações de rede. |
| 2 | Mundo real / linguagem | 3 | Voz de marca ótima, mas jargão ("A Ordem", "Agente", "méritos") sem onboarding de conceito. |
| 3 | Controle e liberdade | 2 | Sem "desfazer"; cancelar usa `confirm()` nativo; voltar no montador não é óbvio. |
| 4 | Consistência | 2 | Dois padrões de modal coexistem; `confirm()` nativo quebra o tema; rótulos de chat variam. |
| 5 | Prevenção de erro | 2 | Checkout sem validação de cartão; campos de endereço editados 1 a 1. |
| 6 | Reconhecer x lembrar | 3 | Bottom-nav clara; mas funções escondidas no side-menu e no avatar. |
| 7 | Flexibilidade/eficiência | 2 | Sem repetir endereço, sem atalhos de teclado (web/admin), edição de perfil campo a campo. |
| 8 | Estético / minimalista | 3 | Identidade premium consistente; alguns ecrãs com muito espaço morto / bug "undefined". |
| 9 | Recuperação de erro | 2 | Toasts existem, mas mensagens genéricas ("Não foi possível salvar"). |
| 10 | Ajuda e documentação | 1 | Quase nenhuma ajuda contextual; conceitos do "clube" sem explicação. |
| **Total** | | **23/40** | Banda: **funcional, com atrito** (a maioria dos apps reais fica 20–32). |

## Veredito anti-padrão (parece feito por IA?)

**Não.** A direção de arte (Cinzel + mono, ouro sobre quase-preto, "patente/méritos") tem personalidade e foge do template SaaS genérico. Riscos pontuais: **cards repetidos** em grade (Home/Clube) e **modal como primeira escolha** em vários fluxos. Nenhuma side-stripe, nenhum gradient-text, sem glassmorphism decorativo.

---

## 1. Login / Acesso (`index.html`)

**Objetivo:** autenticar agente existente ou iniciar cadastro por convite.

**Pontos fortes**
- Após o ajuste recente, o formulário é um **painel definido** (fundo, borda, cantos, sombra): lê como tela intencional, não campos soltos.
- Voz de marca forte ("ACESSO RESTRITO", "ACESSAR A ORDEM", "CAPÍTULO GÊNESIS").
- Abas Agente/Convite deixam os dois caminhos visíveis de cara.

**Problemas**
- **[P2] Jargão sem contexto.** "Agente", "A Ordem", "Convite" não explicam que isto é um app de lanches. Um primeiro contato não sabe o que está acessando.
- **[P2] Sem feedback de carregamento** no botão "ACESSAR A ORDEM" durante o login (latência do Firebase). O usuário pode tocar 2x.
- **[P3] Muito espaço vazio** acima/abaixo do painel em telas altas; dá sensação de tela "pela metade".
- **[P3] "Esqueci minha senha"** discreto e alinhado à direita; alvo de toque pequeno.

**Recomendações (prioridade)**
1. Microcopy de uma linha sob a marca: o que é o app + benefício ("Monte seu lanche, ganhe méritos").
2. Estado de loading no botão (spinner + desabilitar) durante o `signIn`.
3. Centralizar o painel com leve respiro (logo um pouco maior já feito) e dar destaque/área de toque ao "Esqueci minha senha".

---

## 2. Onboarding (Agente / Convite) (`onboarding.page.js`)

**Objetivo:** cadastrar novo agente, validando convite e coletando dados/endereço, com codinome.

**Pontos fortes**
- **Stepper visual** (bolinhas + linha de progresso) comunica "onde estou / quanto falta".
- Codinome gerado com botão de "rolar" novo — momento lúdico alinhado à marca.
- Resumo final antes de confirmar (revisão).

**Problemas**
- **[P1] Rejeição de convite inválido** precisa de mensagem clara e próxima do campo (e não só toast), senão o usuário fica preso sem entender.
- **[P2] Endereço dentro do cadastro** sem auto-preenchimento por CEP visível no passo (o CEP→rua existe no perfil; replicar aqui reduz digitação).
- **[P3] Codinome permanente** deveria avisar "isto não muda depois" ANTES de confirmar (expectativa).

**Recomendações**
1. Erro de convite inline, com dica de formato e link "tenho um convite por e-mail".
2. CEP autopreenche rua/bairro no onboarding (igual ao perfil).
3. Aviso de permanência do codinome no passo, não só depois.

---

## 3. Home (`home.page.js`)

**Objetivo:** orientar o agente: status da operação, patente/progresso e atalhos.

**Pontos fortes**
- **Hierarquia clara:** status da loja → patente → Acesso Rápido → destaques.
- Barra de progresso de méritos ("Faltam 560 para SENTINELA") cria meta tangível.
- Atalhos em grade de 2 colunas, bom alvo de toque.

**Problemas**
- **[P1] Bug de dado visível:** card de recompensa mostra **"undefined disponíveis"**. Quebra a confiança logo na home.
- **[P2] Grade de cards homogênea** (ícone + título + sub) repetida em Acesso Rápido e Destaques: monotonia visual; tudo com o mesmo peso.
- **[P3] "Recompensas em Destaque"** corta o terceiro card na lateral (carrossel sem affordance de "arraste").

**Recomendações**
1. Corrigir o `undefined` (fallback "esgotado/—" quando `disponiveis` faltar).
2. Diferenciar pesos: destaque 1 card "herói" + lista, em vez de 4 cards iguais.
3. Indicador de carrossel (setas/dots) ou snap visível nos destaques.

---

## 4. Cardápio / Monte Seu Lanche (`cardapio.page.js`)

**Objetivo:** navegar categorias e montar um lanche passo a passo (Pão+Carne pré-selecionados).

**Pontos fortes**
- **Montador por etapas** com Pão+Carne já marcados: reduz esforço e ensina pelo exemplo.
- "Vira criação" ao adicionar extra: conecta com a gamificação (autoria do lanche).
- Categorias no topo, conteúdo abaixo: padrão reconhecível.

**Problemas**
- **[P1] Navegação entre etapas pouco óbvia:** o "Próximo →" some no passo de revisão e a volta depende de tocar nas abas de etapa; sem "Voltar" explícito.
- **[P2] Sem resumo de preço acompanhando o passo** (o impacto de cada extra no total não é evidente durante a montagem).
- **[P2] Catálogo depende do Firestore (onSnapshot):** sem skeleton claro, a tela pode aparecer vazia por segundos.
- **[P3] Itens sem imagem real** (emoji): aceitável no estilo, mas reduz apetite/decisão.

**Recomendações**
1. Botões persistentes "← Voltar / Próximo →" + indicador "passo X de N".
2. Total parcial fixo (sticky) atualizando a cada seleção.
3. Skeleton/placeholder enquanto o catálogo carrega.

---

## 5. Busca (`busca.page.js`)

**Objetivo:** achar um produto e adicioná-lo direto à sacola.

**Pontos fortes**
- Filtro instantâneo por nome/descrição/categoria.
- "Adicionar" direto do resultado, com toast de confirmação.

**Problemas**
- **[P1] Estado vazio improdutivo:** com o campo vazio, a área de resultados fica **em branco** (`innerHTML = ""`). Sem sugestões, sem "mais buscados", sem categorias.
- **[P2] Sem histórico/recentes** nem tags populares persistentes (há `search-tag`/`search-cat` no init, mas precisam estar visíveis no vazio).
- **[P3] Resultado mostra `description` que pode vir vazia**, deixando linhas "ocas".

**Recomendações**
1. Estado vazio com atalhos de categoria + "mais pedidos" + termos sugeridos (usar `search-tag`).
2. Buscas recentes (localStorage).
3. Fallback de descrição (ingredientes ou "—").

---

## 6. Clube / Gamificação (`clube.page.js`)

**Objetivo:** engajar via méritos: Resgatar, Extrato, Missões, Ranking.

**Pontos fortes**
- **Extrato de méritos transparente:** cada crédito nomeado ("Pedido entregue +34", "Criou o lanche... +50", "Missões... +600"). Excelente para confiança.
- Abas separam bem os quatro contextos.
- Reforça o loop de retenção (missões + ranking).

**Problemas**
- **[P2] Conceitos sem ajuda:** "méritos", "patente", "criações", "campeão das criações" aparecem sem um "como funciona?" acessível.
- **[P2] Densidade do extrato:** lista longa sem agrupamento por data/tipo nem filtro.
- **[P3] Resgatar:** itens em grade homogênea; falta destaque do que está ao alcance dos pontos atuais vs. bloqueado.

**Recomendações**
1. "i" / tooltip por conceito + uma tela curta "Como ganhar méritos".
2. Agrupar extrato por dia e permitir filtrar (ganhos/gastos).
3. Em Resgatar, ordenar por "você já pode" e marcar quanto falta nos bloqueados.

---

## 7. Sacola / Carrinho (`sacola.page.js`)

**Objetivo:** revisar itens, ajustar quantidade e ir ao checkout.

**Pontos fortes**
- Abas **Carrinho / Pedidos** no mesmo lugar: revisão e acompanhamento próximos.
- Resumo claro (Subtotal, Frete por km, Total) + **méritos previstos** ("+39 ao receber").
- CTA forte "CONFIRMAR PEDIDO".

**Problemas**
- **[P2] Item de criação some o detalhe:** mostra nome + ingredientes resumidos, mas sem miniatura/edição rápida ("editar este lanche").
- **[P2] Sem ação de "salvar para depois" / esvaziar com desfazer** (LIMPAR é destrutivo sem confirmação clara).
- **[P3] Frete "(0.9 km)"** sem explicar a regra (por km) ali.

**Recomendações**
1. Botão "editar" no item de criação (volta ao montador com o estado).
2. "LIMPAR" com confirmação inline + desfazer (toast com "desfazer").
3. Tooltip "frete por distância" no resumo.

---

## 8. Checkout / Pagamento (`payment.js`)

**Objetivo:** escolher método (cartão/Pix) e pagar.

**Pontos fortes**
- Abas de método (Cartão/Pix) e Pix com código copiável: padrão familiar.
- Modal de pagamento focado, sem ruído.

**Problemas**
- **[P1] Sem validação/máscara de cartão** (número, validade, CVV): erros só apareceriam tarde; não há feedback de campo.
- **[P1] Modal de pagamento** carrega tarefa de alto risco num overlay (modal-as-first-thought): em mobile, teclado + modal competem por espaço.
- **[P2] Sem resumo do valor dentro do modal** (quanto estou pagando?) bem visível.

**Recomendações**
1. Máscara + validação em tempo real (Luhn, validade, CVV) com mensagens por campo.
2. Mostrar o **total** e itens resumidos no topo do pagamento.
3. Avaliar página de pagamento em vez de modal (mais espaço, menos conflito com teclado).

---

## 9. Pedidos / Rastreio (`pedidos.page.js`)

**Objetivo:** acompanhar status em tempo real, ver o entregador no mapa e falar no chat.

**Pontos fortes**
- **Timeline de status + mapa Leaflet ao vivo** (pin do motoboy se movendo): ponto alto do produto.
- Realtime de verdade (onSnapshot): status muda sozinho.
- Ações certas no momento certo (chat só quando "enviado").
- Janela de cancelamento/alteração explicada ("até 13h de...").

**Problemas**
- **[P2] Muitos elementos por card** (timeline + cancelamento + tracking + ações): carga cognitiva alta no pedido ativo.
- **[P2] MBox "surpresa" bloqueada:** boa ideia, mas o cadeado precisa explicar melhor o "porquê/quando revela".
- **[P3] Botões de ação** ("Repetir", "Falar com entregador", "Falar com a loja") competem visualmente; faltam pesos (primário x secundário).

**Recomendações**
1. Colapsar a timeline em pedidos concluídos; manter expandida só no ativo.
2. Hierarquia de botões: 1 primário por card.
3. Texto do cadeado MBox com data/condição de revelação.

---

## 10. Chat (3 canais) (`chat.js`)

**Objetivo:** conversa por pedido em cliente↔motoboy, cliente↔plataforma e motoboy↔plataforma.

**Pontos fortes**
- **Três canais isolados** com rótulos claros (Cliente / Entregador / MrBur·Atendimento) e badges de não-lidas + toast em tempo real.
- Abertura contextual (botões no pedido / na entrega / no painel admin).

**Problemas**
- **[P2] Sem horário nas mensagens** nem separador de dia: difícil situar a conversa.
- **[P2] Rótulo de papel repetido em toda bolha** (verboso); falta agrupar mensagens consecutivas do mesmo autor.
- **[P3] Sem "enviando/erro/reenviar"** por mensagem; sem indicador de "visto".

**Recomendações**
1. Timestamp discreto por bolha + divisória de data.
2. Agrupar bolhas consecutivas do mesmo autor (rótulo só na 1ª).
3. Estado por mensagem (enviando/falhou/reenviar).

---

## 11. Perfil (`perfil.page.js`)

**Objetivo:** ver/editar dados, endereço, tema, notificações e convites.

**Pontos fortes**
- **Codinome com cadeado 🔒** comunica permanência (boa expectativa).
- **CEP autopreenche** rua/bairro (ViaCEP) e geocodifica: ótimo.
- Toggle de notificações com estados honestos ("Não suportado neste navegador", "bloqueada").

**Problemas**
- **[P2] Edição campo a campo via modalPrompt:** trocar endereço completo = vários modais em sequência (lento, frágil).
- **[P2] Dois padrões de modal:** "Meus Convites" cria modal na mão, diferente do `modalPrompt`/`modalCustom` do resto (inconsistência).
- **[P3] Mensagens de erro genéricas** ("Não foi possível salvar").

**Recomendações**
1. Um formulário único de endereço (todos os campos juntos) em vez de N prompts.
2. Unificar no mesmo componente de modal do app.
3. Erros específicos ("CEP inválido", "sem conexão").

---

## 12. Convites (`convites.page.js`)

**Objetivo:** agente vê seus convites; admin gere todos (criar/cancelar/copiar) + métricas.

**Pontos fortes**
- **UI por papel:** agente vê "Meus Convites"; admin vê stats + criação.
- Filtros por status e badges; "copiar código" para área de transferência.
- Estados de loading/empty tratados.

**Problemas**
- **[P1] `confirm()` e (no perfil) padrões nativos:** o cancelamento usa `window.confirm`, que **quebra o tema premium** e é inconsistente com os modais customizados.
- **[P2] Criar convite = dois `modalPrompt` em sequência** (código, depois e-mail): poderia ser um formulário só.
- **[P3] Cartões de convite densos** com muitos pares label/valor; difícil escanear o essencial (código + status).

**Recomendações**
1. Trocar `confirm()` por modal de confirmação do app (com "desfazer" quando possível).
2. Formulário único de criação (código + e-mail + limite).
3. Card enxuto: destacar código + status + ação; resto em "detalhes".

---

## 13. Painel Admin (`admin.html`, `orders.admin.js`)

**Objetivo:** operar pedidos em tempo real (status, atribuir motoboy, chat) e gerir o catálogo/clube.

**Pontos fortes**
- **Sidebar desktop limpa** + lista de pedidos realtime agrupada por dia.
- Controles inline eficientes: `select` de status, `select` de motoboy, chat por canal — tudo na linha.
- Cadeado "produzir a partir das 13h" protege a janela de cancelamento (boa prevenção de erro).

**Problemas**
- **[P2] `select` nativo para status** muda o pedido **sem confirmação** (toque errado = status trocado); sem desfazer.
- **[P2] Linha do pedido densa** em telas menores: Detalhes + status + motoboy + 2 chats podem espremer/quebrar.
- **[P2] Watcher de chat limitado a 40 pedidos recentes** (documentado): ok para MVP, mas pode "perder" não-lidas de pedidos antigos sem aviso.
- **[P3] Sem busca/filtro por cliente** na lista de pedidos.

**Recomendações**
1. Confirmar mudanças sensíveis (cancelar/voltar status) + "desfazer".
2. Em telas estreitas, mover ações para um menu "⋯" por linha.
3. Busca por número/cliente no topo da lista.

---

## 14. Central do Motoboy (`motoboy.html`, `motoboy.js`)

**Objetivo:** ver entregas atribuídas, otimizar rota, rastrear, falar com cliente/suporte e dar baixa.

**Pontos fortes**
- **KPIs no topo** (Em rota / Ganhos / Concluídas) dão contexto imediato.
- **Roteirização (PCV) + mapa** com ordem numerada e quilometragem: muito acima do básico.
- Toggle de localização explícito (📡 ON/OFF) e ação clara "Saiu para entrega / Entregue".
- Backfill de coordenadas quando o endereço veio sem lat/lng (robustez silenciosa).

**Problemas**
- **[P2] Estado da localização frágil de perceber:** se o GPS negar e cair na simulação, o motoboy pode não saber se está "compartilhando de verdade".
- **[P2] "Entregue" sem confirmação:** toque acidental fecha a entrega e credita méritos (irreversível na prática).
- **[P3] Cartões com muitas tags** (status + valor + ganho + ações empilhadas): hierarquia plana.

**Recomendações**
1. Banner de estado do rastreio ("GPS ativo" vs "simulando trajeto").
2. Confirmação leve no "Entregue" (swipe-to-confirm ou "tem certeza?").
3. Reduzir tags por card; destacar endereço + próxima ação.

---

## Red flags por persona

**Cliente primeiro-acesso (Jordan):** jargão "A Ordem/Agente" sem explicação; "undefined disponíveis" na home; busca em branco quando vazia; conceito de "méritos" sem ajuda. Risco de abandono cedo.

**Cliente recorrente (Alex / power user):** sem repetir endereço rápido, edição de perfil campo a campo, sem atalhos. Tarefas comuns custam toques demais.

**Admin/operador:** troca de status sem confirmação (erro fácil, sem desfazer); linha densa em mobile; sem busca por cliente.

**Motoboy:** "Entregue" irreversível por toque acidental; incerteza sobre o GPS estar mesmo compartilhando.

## Top 5 prioridades (impacto x esforço)

1. **[P0/P1] Corrigir "undefined disponíveis"** na Home (bug de confiança, custo baixo).
2. **[P1] Validação/máscara no pagamento** + total visível (fluxo de receita).
3. **[P1] Estado vazio da Busca** com atalhos (descoberta de produto).
4. **[P1] Substituir `confirm()` nativo** por modal do app (consistência/tema) e adicionar confirmação+desfazer em ações destrutivas (status admin, Entregue, LIMPAR).
5. **[P2] Navegação do montador** (Voltar/Próximo + passo X de N + total parcial).

## Consistência transversal (vale para todas)

- **Um só sistema de modal** (hoje há `modalPrompt`/`modalCustom` + modais montados à mão + `confirm()` nativo).
- **Mensagens de erro específicas** no lugar de "Não foi possível salvar".
- **Hierarquia de botões**: 1 primário por contexto; secundários com peso menor.
- **Loading states** (skeletons) onde há espera de Firestore.
- **Ajuda contextual** mínima para os conceitos do clube.
