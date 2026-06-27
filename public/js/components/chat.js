/* ═══════════════════════════════════════════════════════════════
   CHAT — modal de conversa por pedido, em 3 canais:
     cm = cliente ↔ motoboy · cp = cliente ↔ plataforma · mp = motoboy ↔ plataforma
   ═══════════════════════════════════════════════════════════════ */
import { modalCustom } from "./modal.js";
import { escapeHtml } from "../utils/dom.js";
import { sendMessage, watchMessages, threadKey, CHANNELS } from "../services/chat.service.js";
import { markRead } from "./chat-notifier.js";

const roleOf = (me) => me.role === "admin" ? "admin" : (me.motoboy ? "motoboy" : "cliente");
// Rótulo amigável de quem enviou (a "plataforma" é o admin).
const ROLE_LABEL = { cliente: "Cliente", motoboy: "Entregador", admin: "MrBur · Atendimento" };
const whoLabel = (r) => ROLE_LABEL[r] || r || "";

const toMillis = (v) =>
  v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === "number" ? v : 0));
const hhmm = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
// Divisória de dia: Hoje / Ontem / dd/mm.
function dayLabel(d) {
  const t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, t)) return "Hoje";
  if (same(d, y)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Abre o chat de um canal do pedido para o usuário corrente. */
export function openChat(orderId, me, title = "Chat", channel = CHANNELS.CM) {
  const tkey = threadKey(orderId, channel);
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

  markRead(tkey); // ao abrir, zera não-lidas
  const unsub = watchMessages(orderId, (msgs) => {
    markRead(tkey); // enquanto aberto, mantém lido
    if (!msgs.length) { box.innerHTML = '<div class="chat-empty">Sem mensagens ainda. Diga olá! 👋</div>'; return; }
    let lastDay = null, lastFrom = null;
    const parts = [];
    for (const m of msgs) {
      const ts = toMillis(m.createdAt);
      const d = ts ? new Date(ts) : null;
      const dayKey = d ? d.toDateString() : "";
      if (d && dayKey !== lastDay) { parts.push(`<div class="chat-day">${dayLabel(d)}</div>`); lastDay = dayKey; lastFrom = null; }
      const mine = m.from === me.uid;
      const grouped = m.from === lastFrom;   // agrupa bolhas consecutivas do mesmo autor
      lastFrom = m.from;
      parts.push(`<div class="chat-bubble ${mine ? "mine" : "theirs"}${grouped ? " grouped" : ""}">
        ${grouped ? "" : `<span class="chat-who">${escapeHtml(whoLabel(m.fromRole))}</span>`}
        <span class="chat-text">${escapeHtml(m.text)}</span>
        ${d ? `<span class="chat-time">${hhmm(d)}</span>` : ""}
      </div>`);
    }
    box.innerHTML = parts.join("");
    box.scrollTop = box.scrollHeight;
  }, channel);

  const send = async () => {
    const text = input.value;
    if (!text.trim()) return;
    input.value = "";
    try { await sendMessage(orderId, { from: me.uid, fromRole: role, text, channel }); }
    catch (e) { console.error("Erro ao enviar mensagem:", e); }
  };
  dialog.el.querySelector("#chatSend").onclick = send;
  input.onkeydown = (e) => { if (e.key === "Enter") send(); };
  dialog.el.querySelector("#chatClose").onclick = () => { unsub?.(); dialog.close(); };
  setTimeout(() => input.focus(), 50);
}
