/* ═══════════════════════════════════════════════════════════════
   STATE — store central com pub/sub (sem framework)
   Fonte única de verdade da UI. Componentes assinam mudanças e
   re-renderizam. Carrinho e tema persistem em localStorage.
   ═══════════════════════════════════════════════════════════════ */

const CART_KEY = "mrbur:cart";
const THEME_KEY = "mrbur:theme";

const loadCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; } };
const loadTheme = () => localStorage.getItem(THEME_KEY) || "light"; // 1ª vez = tema claro

const state = {
  authUser: null,       // { uid, email } | null
  profile: null,        // doc users/{uid} | null
  page: "home",         // página ativa do app
  theme: loadTheme(),    // 'dark' | 'light'
  cart: loadCart(),     // [{ key, productId, name, icon, price, qty, desc }]
  products: [],         // cardápio (Firestore)
  rewards: [],          // recompensas
  orders: [],           // pedidos do agente (realtime)
  missionProgress: null, // progresso de missões do usuário
};

/* ─── pub/sub por chave ─── */
const subs = new Map(); // key -> Set<fn>

function notify(key) {
  (subs.get(key) || new Set()).forEach((fn) => {
    try { fn(state[key], state); } catch (e) { console.error(e); }
  });
  (subs.get("*") || new Set()).forEach((fn) => fn(state));
}

/** Assina mudanças de uma chave (ou "*" para qualquer). Retorna unsubscribe. */
export function subscribe(key, fn) {
  if (!subs.has(key)) subs.set(key, new Set());
  subs.get(key).add(fn);
  return () => subs.get(key)?.delete(fn);
}

export const get = (key) => (key ? state[key] : state);

/** Atualiza uma chave e notifica assinantes. */
export function set(key, value) {
  state[key] = value;
  if (key === "cart") localStorage.setItem(CART_KEY, JSON.stringify(value));
  if (key === "theme") localStorage.setItem(THEME_KEY, value);
  notify(key);
}

/* ═══ Helpers de carrinho ═══ */
export function cartAdd(item) {
  const cart = state.cart.slice();
  // Itens montados ("Monte Seu Lanche") são sempre únicos; demais agrupam por productId.
  const existing = item.productId
    ? cart.find((c) => c.productId === item.productId && !c.custom)
    : null;
  if (existing) existing.qty += item.qty || 1;
  else cart.push({ key: "k" + Date.now() + Math.random().toString(36).slice(2, 6), qty: 1, ...item });
  set("cart", cart);
}

export function cartUpdateQty(key, delta) {
  const cart = state.cart
    .map((c) => (c.key === key ? { ...c, qty: c.qty + delta } : c))
    .filter((c) => c.qty > 0);
  set("cart", cart);
}

export function cartRemove(key) {
  set("cart", state.cart.filter((c) => c.key !== key));
}

export function cartClear() { set("cart", []); }

export const cartCount = () => state.cart.reduce((a, c) => a + c.qty, 0);
export const cartSubtotal = () => state.cart.reduce((a, c) => a + c.price * c.qty, 0);
