/* ═══════════════════════════════════════════════════════════════
   CHAT — modal de conversa por pedido (motoboy ↔ cliente)
   ═══════════════════════════════════════════════════════════════ */
import { modalCustom } from "./modal.js";
import { escapeHtml } from "../utils/dom.js";
import { sendMessage, watchMessages } from "../services/chat.service.js";
import { markRead } from "./chat-notifier.js";

const roleOf = (me) => me.role === "admin" ? "admin" : (me.motoboy ? "motoboy" : "cliente");

/** Abre o chat de um pedido para o usuário corrente. */
export function openChat(orderId, me, title = "Chat da entrega") {
  const dialog = modalCustom(`
    <div class="modal-title">💬 ${escapeHtml(title)}</div>
    <div id="chatMsgs" class="chat-msgs"></div>
    <div class="chat-input-row">
      <input id="chatInput" class="modal-input" placeholder="Escreva uma mensagem…" autocomplete="off">
      <button class="modal-btn primary" id="chatSend">Enviar</button>
    </div>
    <div class="modal-actions"><button class="modal-btn ghost" id="chatClose">Fechar</button></div>`);

  const box = dialog.el.querySelector("#chatMsgs");
  const input = dialog.el.querySelector("#chatInput");
  const role = roleOf(me);

  markRead(orderId); // ao abrir, zera não-lidas
  const unsub = watchMessages(orderId, (msgs) => {
    markRead(orderId); // enquanto aberto, mantém lido
    box.innerHTML = msgs.length ? msgs.map((m) => {
      const mine = m.from === me.uid;
      return `<div class="chat-bubble ${mine ? "mine" : "theirs"}">
        <span class="chat-who">${escapeHtml(m.fromRole || "")}</span>
        <span class="chat-text">${escapeHtml(m.text)}</span>
      </div>`;
    }).join("") : '<div class="chat-empty">Sem mensagens ainda. Diga olá! 👋</div>';
    box.scrollTop = box.scrollHeight;
  });

  const send = async () => {
    const text = input.value;
    if (!text.trim()) return;
    input.value = "";
    try { await sendMessage(orderId, { from: me.uid, fromRole: role, text }); }
    catch (e) { console.error("Erro ao enviar mensagem:", e); }
  };
  dialog.el.querySelector("#chatSend").onclick = send;
  input.onkeydown = (e) => { if (e.key === "Enter") send(); };
  dialog.el.querySelector("#chatClose").onclick = () => { unsub?.(); dialog.close(); };
  setTimeout(() => input.focus(), 50);
}
