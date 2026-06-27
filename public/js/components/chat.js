/* ═══════════════════════════════════════════════════════════════
   CHAT — conversa de um pedido com ABAS de canal e trava por status.
     cliente:  Entregador (cm, se houver motoboy) · Central (cp)
     motoboy:  Cliente (cm) · Central (mp)
     admin:    Cliente (cp) · Motoboy (mp)
   Pedido entregue/cancelado → somente leitura (ninguém envia).
   ═══════════════════════════════════════════════════════════════ */
import { modalCustom } from "./modal.js";
import { escapeHtml } from "../utils/dom.js";
import { sendMessage, watchMessages, threadKey, CHANNELS } from "../services/chat.service.js";
import { markRead } from "./chat-notifier.js";
import { toMillis } from "../utils/format.js";

export const roleOf = (me) => me.role === "admin" ? "admin" : (me.motoboy ? "motoboy" : "cliente");
const ROLE_LABEL = { cliente: "Cliente", motoboy: "Entregador", admin: "Atendimento MrBur" };
const whoLabel = (r) => ROLE_LABEL[r] || r || "";

const hhmm = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
function dayLabel(d) {
  const t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, t)) return "Hoje";
  if (same(d, y)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const LOCKED_STATUSES = ["entregue", "cancelado"];
/** Conversa fechada (somente leitura) quando o pedido foi entregue/cancelado. */
export const isChatLocked = (order) => LOCKED_STATUSES.includes(order?.status);

/** Canais (aba) disponíveis para um papel num pedido. */
export function channelsFor(role, order) {
  if (role === "motoboy") return [{ ch: CHANNELS.CM, label: "Cliente" }, { ch: CHANNELS.MP, label: "Central" }];
  if (role === "admin") return [{ ch: CHANNELS.CP, label: "Cliente" }, { ch: CHANNELS.MP, label: "Motoboy" }];
  const arr = [];
  if (order?.agenteResponsavel) arr.push({ ch: CHANNELS.CM, label: "Entregador" });
  arr.push({ ch: CHANNELS.CP, label: "Central" });
  return arr;
}

function renderMessages(box, msgs, me) {
  if (!msgs.length) { box.innerHTML = '<div class="chat-empty">Sem mensagens ainda. Diga olá! 👋</div>'; return; }
  let lastDay = null, lastFrom = null;
  const parts = [];
  for (const m of msgs) {
    const ts = toMillis(m.createdAt);
    const d = ts ? new Date(ts) : null;
    const dayKey = d ? d.toDateString() : "";
    if (d && dayKey !== lastDay) { parts.push(`<div class="chat-day">${dayLabel(d)}</div>`); lastDay = dayKey; lastFrom = null; }
    const mine = m.from === me.uid;
    const grouped = m.from === lastFrom;
    lastFrom = m.from;
    parts.push(`<div class="chat-bubble ${mine ? "mine" : "theirs"}${grouped ? " grouped" : ""}">
      ${grouped ? "" : `<span class="chat-who">${escapeHtml(whoLabel(m.fromRole))}</span>`}
      <span class="chat-text">${escapeHtml(m.text)}</span>
      ${d ? `<span class="chat-time">${hhmm(d)}</span>` : ""}
    </div>`);
  }
  box.innerHTML = parts.join("");
  box.scrollTop = box.scrollHeight;
}

/** Abre a conversa de um pedido (com abas de canal + trava por status). */
export function openConversation(order, me, role = roleOf(me)) {
  const orderId = order.id;
  const myRole = roleOf(me);
  const channels = channelsFor(role, order);
  let active = channels[0].ch;
  const locked = isChatLocked(order);
  const num = order.numeroPedido || ("#" + String(orderId || "").slice(-6).toUpperCase());

  const tabsHtml = channels.length > 1
    ? `<div class="chat-tabs">${channels.map((c) => `<button class="chat-tab" data-ch="${c.ch}" type="button">${escapeHtml(c.label)}</button>`).join("")}</div>`
    : "";

  let unsub = null;
  const dialog = modalCustom(`
    <div class="modal-title">💬 ${escapeHtml(num)}${order.cliente ? " · " + escapeHtml(order.cliente) : ""}</div>
    ${tabsHtml}
    <div id="chatMsgs" class="chat-msgs"></div>
    ${locked
      ? `<div class="chat-locked">🔒 Conversa encerrada — pedido ${escapeHtml(order.status)}.</div>`
      : `<div class="chat-input-row">
          <input id="chatInput" class="modal-input" placeholder="Escreva uma mensagem…" autocomplete="off">
          <button class="modal-btn primary" id="chatSend" type="button">Enviar</button>
        </div>`}
    <div class="modal-actions"><button class="modal-btn ghost" id="chatClose" type="button">Fechar</button></div>`,
    { onClose: () => unsub?.() }); // garante unsubscribe em ESC / clique-fora / botão

  const box = dialog.el.querySelector("#chatMsgs");

  function mount(ch) {
    active = ch;
    unsub?.();
    dialog.el.querySelectorAll(".chat-tab").forEach((t) => t.classList.toggle("active", t.dataset.ch === ch));
    markRead(threadKey(orderId, ch));
    unsub = watchMessages(orderId, (msgs) => { markRead(threadKey(orderId, ch)); renderMessages(box, msgs, me); }, ch);
  }
  dialog.el.querySelectorAll(".chat-tab").forEach((t) => (t.onclick = () => mount(t.dataset.ch)));

  if (!locked) {
    const input = dialog.el.querySelector("#chatInput");
    const send = async () => {
      const text = input.value;
      if (!text.trim()) return;
      input.value = "";
      try { await sendMessage(orderId, { from: me.uid, fromRole: myRole, text, channel: active }); }
      catch (e) { console.error("Erro ao enviar mensagem:", e); }
    };
    dialog.el.querySelector("#chatSend").onclick = send;
    input.onkeydown = (e) => { if (e.key === "Enter") send(); };
    setTimeout(() => input.focus(), 50);
  }
  dialog.el.querySelector("#chatClose").onclick = () => dialog.close();
  mount(active);
}
