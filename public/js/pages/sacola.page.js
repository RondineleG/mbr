/* ═══════════════════════════════════════════════════════════════
   SACOLA PAGE — carrinho (quantidade), totais e checkout real
   ═══════════════════════════════════════════════════════════════ */
import { onAction, setHtml, escapeHtml } from "../utils/dom.js";
import * as store from "../app/state.js";
import { money } from "../utils/format.js";
import { DELIVERY_FEE, POINTS_PER_BRL } from "../utils/constants.js";
import { deliveryFeeFor, kmFromStore } from "../utils/geo.js";
import { createOrder, updateOrderItems } from "../services/order.service.js";
import { adjustPoints } from "../services/points.service.js";
import { registerLanchesFromCart } from "../services/lanche.service.js";
import { renderCartBadges } from "../components/topbar.js";
import { navigate } from "../app/router.js";
import { modalConfirm } from "../components/modal.js";
import { openPayment } from "../components/payment.js";
import { toast, toastInfo, toastError } from "../components/toast.js";

let currentTab = 'cart'; // 'cart' ou 'orders'

export function renderSacola() {
  const cart = store.get("cart");
  const orders = store.get("orders") || [];
  renderCartBadges();
  
  // Renderizar abas
  const tabsHtml = `
    <div class="sacola-tabs">
      <button class="sacola-tab ${currentTab === 'cart' ? 'active' : ''}" data-action="sacola-tab" data-tab="cart">
        🛒 Carrinho ${cart.length > 0 ? `(${cart.length})` : ''}
      </button>
      <button class="sacola-tab ${currentTab === 'orders' ? 'active' : ''}" data-action="sacola-tab" data-tab="orders">
        📋 Pedidos ${orders.length > 0 ? `(${orders.length})` : ''}
      </button>
    </div>
  `;
  
  let contentHtml = '';
  
  if (currentTab === 'cart') {
    if (!cart.length) {
      contentHtml = `
        <div class="sacola-empty">
          <div class="sacola-empty-icon">🛒</div>
          <div class="sacola-empty-title">Sacola vazia</div>
          <div class="sacola-empty-sub">Adicione itens do cardápio para montar seu pedido</div>
        </div>`;
    } else {
      const subtotal = store.cartSubtotal();
      const addr = store.get("profile")?.address;
      const fee = deliveryFeeFor(addr);
      const km = addr?.lat != null ? kmFromStore(addr) : null;
      const total = subtotal + fee;
      const merits = Math.round(total * POINTS_PER_BRL);
      const editing = !!store.get("editingOrderId");

      contentHtml = cart.map((it) => `
        <div class="sacola-item">
          <span class="sacola-item-icon">${it.icon}</span>
          <div class="sacola-item-info">
            <div class="sacola-item-name">${escapeHtml(it.name)}</div>
            ${it.desc ? `<div class="sacola-item-desc">${escapeHtml(it.desc)}</div>` : ""}
            <div class="qty" style="margin-top:6px">
              <button class="qty-btn" data-action="qty" data-key="${it.key}" data-delta="-1" aria-label="Diminuir">−</button>
              <span class="qty-val">${it.qty}</span>
              <button class="qty-btn" data-action="qty" data-key="${it.key}" data-delta="1" aria-label="Aumentar">+</button>
            </div>
          </div>
          <span class="sacola-item-price">${money(it.price * it.qty)}</span>
          <button class="sacola-item-remove" data-action="cart-remove" data-key="${it.key}">✕</button>
        </div>`).join("") +
        `<div class="sacola-total">
          <div class="sacola-total-row"><span class="sacola-total-label">Subtotal</span><span class="sacola-total-val">${money(subtotal)}</span></div>
          <div class="sacola-total-row"><span class="sacola-total-label">Frete${km != null ? ` (${km} km)` : ""}</span><span class="sacola-total-val">${money(fee)}</span></div>
          <div class="sacola-total-row final"><span class="sacola-total-label">Total</span><span class="sacola-total-val">${money(total)}</span></div>
        </div>
        <div class="sacola-merits-info">+${merits}⚡ méritos ao receber este pedido</div>
        <div class="sacola-actions">
          <button class="sacola-clear" data-action="cart-clear">🗑 LIMPAR</button>
          <button class="sacola-checkout" id="checkoutBtn" data-action="checkout">${editing ? "SALVAR ALTERAÇÃO →" : "CONFIRMAR PEDIDO →"}</button>
        </div>`;
    }
  } else {
    // Tab de pedidos
    const openOrders = orders.filter(o => o.status !== 'cancelado' && o.status !== 'entregue');
    
    if (!orders.length) {
      contentHtml = `
        <div class="sacola-empty">
          <div class="sacola-empty-icon">📦</div>
          <div class="sacola-empty-title">Nenhum pedido</div>
          <div class="sacola-empty-sub">Seus pedidos aparecerão aqui</div>
        </div>`;
    } else {
      contentHtml = openOrders.length > 0 ? `
        <div class="sacola-orders-section">
          <div class="sacola-section-title">Pedidos em Aberto (${openOrders.length})</div>
          ${openOrders.map(o => `
            <div class="sacola-order-item">
              <div class="sacola-order-info">
                <div class="sacola-order-id">${o.numeroPedido || "#" + (o.id || "").slice(-6).toUpperCase()}</div>
                <div class="sacola-order-status">${getStatusBadge(o.status)}</div>
              </div>
              <div class="sacola-order-items">${(o.items || []).map((it) => `${it.qty || 1}× ${it.name}`).join(" · ")}</div>
              <div class="sacola-order-total">${money(o.total)}</div>
            </div>
          `).join('')}
        </div>
      ` : '';
      
      contentHtml += `
        <div class="sacola-orders-section">
          <div class="sacola-section-title">Histórico Completo</div>
          ${orders.map(o => `
            <div class="sacola-order-item ${o.status === 'cancelado' ? 'cancelled' : ''}">
              <div class="sacola-order-info">
                <div class="sacola-order-id">${o.numeroPedido || "#" + (o.id || "").slice(-6).toUpperCase()}</div>
                <div class="sacola-order-status">${getStatusBadge(o.status)}</div>
              </div>
              <div class="sacola-order-items">${(o.items || []).map((it) => `${it.qty || 1}× ${it.name}`).join(" · ")}</div>
              <div class="sacola-order-total">${money(o.total)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }
  
  setHtml("sacolaContent", tabsHtml + contentHtml);
}

function getStatusBadge(status) {
  const badges = {
    recebido: '<span class="badge badge-info">Recebido</span>',
    analisando: '<span class="badge badge-warning">Analisando</span>',
    aprovado: '<span class="badge badge-success">Aprovado</span>',
    producao: '<span class="badge badge-info">Em Produção</span>',
    enviado: '<span class="badge badge-info">Enviado</span>',
    entregue: '<span class="badge badge-success">Entregue</span>',
    cancelado: '<span class="badge badge-danger">Cancelado</span>'
  };
  return badges[status] || status;
}

let submitting = false; // trava anti-duplo-clique no envio do pedido

async function checkout(btn) {
  if (submitting) return; // já tem um envio em andamento
  const profile = store.get("profile");
  const cart = store.get("cart");
  if (!profile || !cart.length) return;

  // Validar se há itens exclusivos de pontos no carrinho
  const hasPointsOnlyItems = cart.some(item => item.pointsRequired && item.pointsRequired > 0);
  if (hasPointsOnlyItems) {
    toastError("Este carrinho contém itens exclusivos de méritos. Compre-os na seção de recompensas.");
    return;
  }

  // Trava IMEDIATA: desabilita o botão antes de qualquer await, evitando
  // múltiplos pedidos quando o usuário clica várias vezes.
  submitting = true;
  if (btn) btn.disabled = true;

  try {
    const fee = deliveryFeeFor(profile.address);
    const novoTotal = store.cartSubtotal() + fee;
    const items = cart.map(({ name, icon, price, qty, desc, noMeritos, mbox, composicao }) => ({ name, icon, price, qty, desc, noMeritos, mbox, composicao }));
    const editId = store.get("editingOrderId");

    if (editId) {
      // ── Edição IN-PLACE: cobra só a DIFERENÇA, mantém o mesmo pedido. ──
      const original = (store.get("orders") || []).find((o) => o.id === editId);
      const diff = +(novoTotal - (original?.total || 0)).toFixed(2);
      let pay = null;
      if (diff > 0) {
        pay = await openPayment(diff, { points: profile.points }); // acréscimo → novo pagamento da diferença
        if (!pay) return;
      }
      await updateOrderItems(editId, items, pay);
      if (pay?.metodo === "meritos") await adjustPoints(profile.uid, -pay.meritos, "Pagamento com méritos (alteração)", editId);
      store.set("editingOrderId", null);
      store.cartClear();
      toast("success", "✓", diff > 0 ? `Alteração salva · pago +${money(diff)}` : `Alteração salva · total ${money(novoTotal)}`);
      navigate("pedidos");
      return;
    }

    // ── Novo pedido: pagamento fake do total (dinheiro/pix ou méritos). ──
    const pay = await openPayment(novoTotal, { points: profile.points });
    if (!pay) return;
    const order = await createOrder({
      uid: profile.uid,
      codename: profile.codename,
      items,
      address: profile.address,
      payment: pay,
    });
    if (pay.metodo === "meritos") await adjustPoints(profile.uid, -pay.meritos, "Pagamento com méritos", order.id);
    await registerLanchesFromCart(cart, profile.uid, order.id);   // dono/forks + méritos do criador
    store.cartClear();
    const quando = order.tipo === "mbox"
      ? `entrega sábado ${new Date(order.dataEntrega).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
      : (order.agendado ? "agendado para amanhã · entrega 18h–22h" : "entrega hoje · 18h–22h");
    toast("success", "🎉", `Pedido pago! ${money(order.total)} · ${quando}`);
    navigate("pedidos");
  } catch (err) {
    console.error("Erro no checkout:", err);
    const errorMsg = err?.message || err?.code || "";
    
    if (errorMsg.includes("MBOX_SOLD_OUT")) {
      const rem = err?.mboxRemaining ?? 0;
      toastError(rem > 0 ? `Restam só ${rem} MBox para este sábado` : "MBox esgotada para este sábado");
    } else if (errorMsg.includes("permission") || errorMsg.includes("PERMISSION")) {
      toastError("Erro de permissão. Verifique as regras do Firestore.");
    } else if (errorMsg.includes("network") || errorMsg.includes("NETWORK")) {
      toastError("Erro de conexão. Verifique sua internet.");
    } else if (errorMsg.includes("auth") || errorMsg.includes("AUTH")) {
      toastError("Erro de autenticação. Faça login novamente.");
    } else {
      toastError("Não foi possível enviar o pedido — tente novamente");
    }
  } finally {
    submitting = false;
    if (btn) btn.disabled = false;
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
  onAction("sacola-tab", (el) => {
    currentTab = el.dataset.tab;
    renderSacola();
  });
  store.subscribe("cart", renderSacola);
  store.subscribe("orders", renderSacola);
}
