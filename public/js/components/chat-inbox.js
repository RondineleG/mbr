/* ═══════════════════════════════════════════════════════════════
   CHAT INBOX — lista de conversas (1 por pedido), ativos primeiro.
   Tocar numa conversa abre a conversa do pedido com abas de canal.
   Usado pelo ícone fixo de chat na topbar (cliente e motoboy).
   ═══════════════════════════════════════════════════════════════ */
import { modalCustom } from "./modal.js";
import { escapeHtml } from "../utils/dom.js";
import { openConversation, channelsFor, roleOf, isChatLocked } from "./chat.js";
import { unreadForOrder } from "./chat-notifier.js";

const STATUS = {
  recebido: "Recebido", analisando: "Em análise", aprovado: "Aprovado",
  producao: "Em produção", enviado: "A caminho", entregue: "Entregue", cancelado: "Cancelado",
};

/** Abre a lista de conversas do usuário (cliente/motoboy). */
export function openInbox(orders, me, role = roleOf(me)) {
  const list = [...(orders || [])]
    .filter((o) => o && o.id)
    .sort((a, b) => {
      const al = isChatLocked(a) ? 1 : 0, bl = isChatLocked(b) ? 1 : 0;
      if (al !== bl) return al - bl;                  // conversas ativas primeiro
      return (b.criadoEm || 0) - (a.criadoEm || 0);   // depois, mais recentes
    })
    .slice(0, 30);

  const rows = list.length ? list.map((o) => {
    const chs = channelsFor(role, o).map((c) => c.ch);
    const unread = unreadForOrder(o.id, chs);
    const num = o.numeroPedido || ("#" + String(o.id).slice(-6).toUpperCase());
    const locked = isChatLocked(o);
    const sub = role === "motoboy"
      ? (o.cliente || "cliente")
      : (o.agenteResponsavel ? "Entregador + Central" : "Central");
    return `<button class="chat-inbox-row" data-id="${o.id}" type="button">
      <div class="chat-inbox-main">
        <div class="chat-inbox-num">${escapeHtml(num)} ${locked ? "🔒" : ""}</div>
        <div class="chat-inbox-sub">${escapeHtml(STATUS[o.status] || o.status || "")} · ${escapeHtml(sub)}</div>
      </div>
      ${unread ? `<span class="chat-badge">${unread}</span>` : `<span class="chat-inbox-arrow">›</span>`}
    </button>`;
  }).join("") : `<div class="chat-empty">Nenhuma conversa ainda.</div>`;

  const dialog = modalCustom(`
    <div class="modal-title">💬 Conversas</div>
    <div class="chat-inbox-list">${rows}</div>
    <div class="modal-actions"><button class="modal-btn ghost" id="inboxClose" type="button">Fechar</button></div>`);

  const byId = Object.fromEntries(list.map((o) => [o.id, o]));
  dialog.el.querySelectorAll(".chat-inbox-row").forEach((r) =>
    (r.onclick = () => { const o = byId[r.dataset.id]; if (o) openConversation(o, me, role); }));
  dialog.el.querySelector("#inboxClose").onclick = () => dialog.close();
}
