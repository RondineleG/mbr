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
// Codinome do agente = núcleo-epíteto, COM concordância de gênero.
// Núcleo (substantivo) carrega o gênero; o epíteto (adjetivo) tem forma m/f.
export const CODENAME_NUCLEO = [
  { w: "raposa", g: "f" }, { w: "mamba", g: "f" }, { w: "cobra", g: "f" }, { w: "falcao", g: "m" },
  { w: "lobo", g: "m" }, { w: "pantera", g: "f" }, { w: "coruja", g: "f" }, { w: "aguia", g: "f" },
  { w: "tigre", g: "m" }, { w: "urso", g: "m" }, { w: "serpente", g: "f" }, { w: "gaviao", g: "m" },
  { w: "onca", g: "f" }, { w: "lince", g: "m" }, { w: "condor", g: "m" }, { w: "tubarao", g: "m" },
  { w: "jaguar", g: "m" }, { w: "fenix", g: "f" }, { w: "grifo", g: "m" }, { w: "fantasma", g: "m" },
  { w: "sombra", g: "f" }, { w: "relampago", g: "m" }, { w: "trovao", g: "m" }, { w: "cometa", g: "m" },
  { w: "eclipse", g: "m" }, { w: "vulcao", g: "m" }, { w: "tempestade", g: "f" }, { w: "ciclone", g: "m" },
  { w: "furia", g: "f" }, { w: "nebulosa", g: "f" },
];
export const CODENAME_EPITETO = [
  { m: "negro", f: "negra" }, { m: "branco", f: "branca" }, { m: "vermelho", f: "vermelha" },
  { m: "dourado", f: "dourada" }, { m: "prateado", f: "prateada" }, { m: "secreto", f: "secreta" },
  { m: "noturno", f: "noturna" }, { m: "supremo", f: "suprema" }, { m: "sombrio", f: "sombria" },
  { m: "cosmico", f: "cosmica" }, { m: "atomico", f: "atomica" }, { m: "epico", f: "epica" },
  { m: "infinito", f: "infinita" }, { m: "eterno", f: "eterna" }, { m: "absoluto", f: "absoluta" },
  { m: "furtivo", f: "furtiva" }, { m: "lendario", f: "lendaria" }, { m: "mistico", f: "mistica" },
  { m: "selvagem", f: "selvagem" }, { m: "mortal", f: "mortal" }, { m: "veloz", f: "veloz" },
  { m: "glacial", f: "glacial" }, { m: "ardente", f: "ardente" }, { m: "imperial", f: "imperial" },
  { m: "rebelde", f: "rebelde" }, { m: "brutal", f: "brutal" }, { m: "letal", f: "letal" },
  { m: "alfa", f: "alfa" }, { m: "omega", f: "omega" }, { m: "polar", f: "polar" },
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

/** Dias do "Lanche do Dia" (chave → rótulo). getDay(): 1=seg … 6=sáb. */
export const WEEKDAYS = [
  { key: "seg", label: "Segunda", day: 1 },
  { key: "ter", label: "Terça", day: 2 },
  { key: "qua", label: "Quarta", day: 3 },
  { key: "qui", label: "Quinta", day: 4 },
  { key: "sex", label: "Sexta", day: 5 },
  { key: "sab", label: "Sábado", day: 6 },
];

/** Preço fixo padrão do Lanche do Dia (admin pode sobrescrever). */
export const LANCHE_DIA_PRICE = 29.9;

/** MBox: corte para o sábado da semana — sexta-feira às 22h. */
export const MBOX_CUTOFF_DAY = 5;   // sexta
export const MBOX_CUTOFF_HOUR = 22; // 22:00
/** Preço padrão da MBox (admin pode sobrescrever). */
export const MBOX_PRICE = 75.0;
/** Estoque de MBox por sábado (compartilhado entre MBox e MBox Dupla). */
export const MBOX_STOCK = 50;

/** Sede do MrBur (origem das rotas e cálculo de frete). */
export const STORE = {
  cep: "13660-030", numero: "560B", logradouro: "Av. da Ordem",
  bairro: "Centro", cidade: "Americana", uf: "SP",
  lat: -22.73916, lng: -47.33145,
};
/** Frete = base + por km da sede até o cliente. */
export const DELIVERY_BASE = 5.0;     // R$ fixo
export const DELIVERY_PER_KM = 0.5;   // R$ por km
