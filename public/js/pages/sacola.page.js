/* ═══════════════════════════════════════════════════════════════
   SACOLA PAGE — carrinho (quantidade), totais e checkout real
   ═══════════════════════════════════════════════════════════════ */
import { onAction, setHtml, escapeHtml } from "../utils/dom.js";
import * as store from "../app/state.js";
import { money } from "../utils/format.js";
import { DELIVERY_FEE, POINTS_PER_BRL } from "../utils/constants.js";
import { createOrder } from "../services/order.service.js";
import { renderCartBadges } from "../components/topbar.js";
import { navigate } from "../app/router.js";
import { modalConfirm } from "../components/modal.js";
import { toast, toastInfo, toastError } from "../components/toast.js";

export function renderSacola() {
  const cart = store.get("cart");
  renderCartBadges();
  if (!cart.length) {
    setHtml("sacolaContent", `
      <div class="sacola-empty">
        <div class="sacola-empty-icon">🛒</div>
        <div class="sacola-empty-title">Sacola vazia</div>
        <div class="sacola-empty-sub">Adicione itens do cardápio para montar seu pedido</div>
      </div>`);
    return;
  }
  const subtotal = store.cartSubtotal();
  const total = subtotal + DELIVERY_FEE;
  const merits = Math.round(total * POINTS_PER_BRL);

  setHtml("sacolaContent",
    cart.map((it) => `
      <div class="sacola-item">
        <span class="sacola-item-icon">${it.icon}</span>
        <div class="sacola-item-info">
          <div class="sacola-item-name">${escapeHtml(it.name)}</div>
          ${it.desc ? `<div class="sacola-item-desc">${escapeHtml(it.desc)}</div>` : ""}
          <div class="qty" style="margin-top:6px">
            <button class="qty-btn" data-action="qty" data-key="${it.key}" data-delta="-1">−</button>
            <span class="qty-val">${it.qty}</span>
            <button class="qty-btn" data-action="qty" data-key="${it.key}" data-delta="1">+</button>
          </div>
        </div>
        <span class="sacola-item-price">${money(it.price * it.qty)}</span>
        <button class="sacola-item-remove" data-action="cart-remove" data-key="${it.key}">✕</button>
      </div>`).join("") +
    `<div class="sacola-total">
      <div class="sacola-total-row"><span class="sacola-total-label">Subtotal</span><span class="sacola-total-val">${money(subtotal)}</span></div>
      <div class="sacola-total-row"><span class="sacola-total-label">Frete</span><span class="sacola-total-val">${money(DELIVERY_FEE)}</span></div>
      <div class="sacola-total-row final"><span class="sacola-total-label">Total</span><span class="sacola-total-val">${money(total)}</span></div>
    </div>
    <div class="sacola-merits-info">+${merits}⚡ méritos ao receber este pedido</div>
    <div class="sacola-actions">
      <button class="sacola-clear" data-action="cart-clear">🗑 LIMPAR</button>
      <button class="sacola-checkout" id="checkoutBtn" data-action="checkout">CONFIRMAR PEDIDO →</button>
    </div>`);
}

async function checkout(btn) {
  const profile = store.get("profile");
  const cart = store.get("cart");
  if (!profile || !cart.length) return;

  const ok = await modalConfirm({
    title: "Confirmar pedido",
    message: `Total ${money(store.cartSubtotal() + DELIVERY_FEE)} · entrega em ${[profile.address?.street, profile.address?.number].filter(Boolean).join(", ") || "seu endereço"}.`,
    confirmText: "Confirmar",
  });
  if (!ok) return;

  btn.disabled = true;
  try {
    const order = await createOrder({
      uid: profile.uid,
      codename: profile.codename,
      items: cart.map(({ name, icon, price, qty, desc }) => ({ name, icon, price, qty, desc })),
      address: profile.address,
    });
    store.cartClear();
    toast("success", "🎉", `Pedido enviado! ${money(order.total)} · +${order.pointsEarned}⚡ ao receber`);
    navigate("pedidos");
  } catch {
    toastError("Não foi possível enviar o pedido — tente novamente");
  } finally {
    btn.disabled = false;
  }
}

export function initSacola() {
  onAction("qty", (el) => store.cartUpdateQty(el.dataset.key, +el.dataset.delta));
  onAction("cart-remove", (el) => {
    const it = store.get("cart").find((c) => c.key === el.dataset.key);
    store.cartRemove(el.dataset.key);
    if (it) toastInfo("🗑", `${it.name} removido da sacola`);
  });
  onAction("cart-clear", () => { store.cartClear(); toastInfo("🗑", "Sacola limpa"); });
  onAction("checkout", (el) => checkout(el));
  store.subscribe("cart", renderSacola);
}
