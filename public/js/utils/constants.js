/* ═══════════════════════════════════════════════════════════════
   CONSTANTES — dados estáticos da Ordem
   Cardápio "Monte Seu Lanche", geradores de codinome, ranks/níveis.
   Produtos prontos (Lanche do Dia, MBox, acomp...) vivem no Firestore
   (collection products) e são semeados via js/seed.js.
   ═══════════════════════════════════════════════════════════════ */

/** Etapas do montador de lanche. Preço 0 = incluso no preço-base. */
export const BUILD_STEPS = [
  { id: "pao", icon: "🍞", label: "Pão", max: 1, items: [
    { name: "Brioche Clássico", desc: "Macio e levemente adocicado", price: 0, icon: "🍞" },
    { name: "Australiano", desc: "Escuro com toque defumado", price: 0, icon: "🍞" },
    { name: "Integral", desc: "Com grãos e fibras", price: 0, icon: "🌾" },
    { name: "Sem Pão", desc: "Envolto em folha de alface", price: 0, icon: "🥬" },
  ]},
  { id: "carnes", icon: "🥩", label: "Carnes", max: 2, items: [
    { name: "Smash 90g", desc: "Carne prensada na chapa, crocante", price: 0, icon: "🥩" },
    { name: "Blend 180g", desc: "Mistura premium costela + fraldinha", price: 6.0, icon: "🥩" },
    { name: "Duplo Smash", desc: "2x 90g empilhados", price: 5.0, icon: "🥩" },
    { name: "Plant-Based 150g", desc: "Burger vegetal artesanal", price: 3.0, icon: "🌱" },
  ]},
  { id: "queijos", icon: "🧀", label: "Extras", max: 3, items: [
    { name: "Cheddar", desc: "Derretido cremoso", price: 0, icon: "🧀" },
    { name: "Provolone", desc: "Defumado na brasa", price: 2.0, icon: "🧀" },
    { name: "Brie", desc: "Premium importado", price: 4.9, icon: "🧀" },
    { name: "Bacon Artesanal", desc: "Crocante defumado", price: 3.9, icon: "🥓" },
    { name: "Ovo Frito", desc: "Gema mole", price: 2.9, icon: "🍳" },
    { name: "Cebola Caramelizada", desc: "Agridoce na manteiga", price: 2.0, icon: "🧅" },
  ]},
  { id: "salada", icon: "🥗", label: "Salada", max: 4, items: [
    { name: "Alface Americana", desc: "Crocante e fresca", price: 1.5, icon: "🥬" },
    { name: "Tomate", desc: "Fatias finas", price: 1.5, icon: "🍅" },
    { name: "Cebola Roxa", desc: "Anéis finos", price: 1.5, icon: "🧅" },
    { name: "Rúcula", desc: "Sabor intenso", price: 1.5, icon: "🌿" },
    { name: "Pickles", desc: "Agridoce artesanal", price: 1.5, icon: "🥒" },
  ]},
  { id: "molhos", icon: "🫙", label: "Molhos", max: 2, items: [
    { name: "Molho Secreto", desc: "Receita exclusiva MrBur", price: 0, icon: "🫙" },
    { name: "Maionese Trufada", desc: "Com trufa negra", price: 3.0, icon: "🫙" },
    { name: "BBQ Defumado", desc: "Sabor intenso", price: 0, icon: "🫙" },
    { name: "Mostarda Dijon", desc: "Importada", price: 0, icon: "🫙" },
    { name: "Ranch", desc: "Cremoso temperado", price: 0, icon: "🫙" },
  ]},
  { id: "finalizar", icon: "✅", label: "Revisar", max: 0, items: [] },
];

/** Preço-base de um lanche montado. */
export const BUILD_BASE_PRICE = 29.9;

/** Geradores de codinome (estilo espionagem). ~2500 combinações. */
export const CODENAME_ADJ = [
  "raposa","mamba","cobra","falcao","lobo","pantera","coruja","aguia","tigre","urso",
  "serpente","gaviao","onca","lince","condor","furia","tubarao","jaguar","fenix","grifo",
  "fantasma","sombra","relampago","trovao","cometa","nebulosa","eclipse","vulcao","tempestade","ciclone",
  "acido","cromado","blindado","noturno","silencioso","invisivel","veloz","astuto","feroz","letal",
  "dourado","prateado","escarlate","carmesim","obsidiana","cobalto","safira","esmeralda","rubi","opala",
];
export const CODENAME_NOUN = [
  "negra","branca","vermelha","azul","dourada","secreta","veloz","noturna","mortal","suprema",
  "alfa","omega","delta","sigma","gama","prime","zero","phantom","stealth","cipher",
  "norte","sul","leste","oeste","central","polar","tropical","orbital","boreal","austral",
  "sagaz","brutal","furtiva","lendaria","mistica","sombria","glacial","ardente","cosmica","atomica",
  "real","imperial","rebelde","selvagem","epica","infinita","eterna","absoluta","radical","suprema",
];

/* ═══════════════════════════════════════════════════════════════
   PROGRESSÃO — Ranks e níveis por pontos acumulados (1 BRL = 1 ponto).
   O rank é derivado dos pontos; o nível é o índice na escada.
   ═══════════════════════════════════════════════════════════════ */
export const RANKS = [
  { level: 1, name: "EXPLORADOR", min: 0 },
  { level: 2, name: "AGENTE", min: 300 },
  { level: 3, name: "GUARDIÃO", min: 800 },
  { level: 4, name: "SENTINELA", min: 1800 },
  { level: 5, name: "MESTRE", min: 3500 },
  { level: 6, name: "LENDA DA ORDEM", min: 6000 },
];

/** Pontos ganhos por real gasto no pedido. */
export const POINTS_PER_BRL = 1;

/** Taxa de entrega padrão (BRL). */
export const DELIVERY_FEE = 8.0;

/** Janela (ms) em que o cliente pode cancelar e o admin precisa esperar p/ aceitar. */
export const CANCEL_WINDOW_MS = 120000;

/** Méritos creditados ao motoboy por entrega concluída (missão especial). */
export const DELIVERY_MERITOS = 50;

/** Hora-limite (corte) para aceitar/alterar/cancelar pedidos do dia. */
export const ORDER_CUTOFF_HOUR = 13;
/** Janela de entrega exibida ao cliente. */
export const DELIVERY_WINDOW = "18h–22h";
