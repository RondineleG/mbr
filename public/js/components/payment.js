/* ═══════════════════════════════════════════════════════════════
   PAYMENT — pagamento FAKE (cartão de crédito ou Pix). Apenas simula:
   nenhuma transação real. openPayment(total) → Promise<{metodo,status}|null>
   ═══════════════════════════════════════════════════════════════ */
import { modalCustom } from "./modal.js";
import { money } from "../utils/format.js";
import { MERITO_VALUE_BRL } from "../utils/constants.js";

const PIX_CODE = "00020126MRBUR5204000053039865802BR5909MRBUR LTDA6009AMERICANA62070503***6304A1B2";

export function openPayment(total, opts = {}) {
  const saldo = Math.max(0, Math.floor(opts.points || 0));
  // Resgate desacoplado do ganho: cada mérito vale MERITO_VALUE_BRL (R$0,05).
  const custoMeritos = Math.round(total / MERITO_VALUE_BRL);
  const podeMeritos = opts.allowMeritos !== false; // permitir pagar com méritos
  return new Promise((resolve) => {
    const dlg = modalCustom(`
      <div class="modal-title">Pagamento · ${money(total)}</div>
      <div class="pay-tabs">
        <button class="pay-tab active" data-pay="cartao">💳 Cartão</button>
        <button class="pay-tab" data-pay="pix">⚡ Pix</button>
        ${podeMeritos ? `<button class="pay-tab" data-pay="meritos">🏅 Méritos</button>` : ""}
      </div>

      <div id="payCartao">
        <div class="modal-label">NÚMERO DO CARTÃO</div>
        <input class="modal-input" id="pcNum" inputmode="numeric" placeholder="0000 0000 0000 0000" maxlength="19">
        <div class="modal-label">NOME NO CARTÃO</div>
        <input class="modal-input" id="pcName" placeholder="Como impresso no cartão">
        <div style="display:flex;gap:10px">
          <div style="flex:1"><div class="modal-label">VALIDADE</div><input class="modal-input" id="pcExp" placeholder="MM/AA" maxlength="5"></div>
          <div style="flex:1"><div class="modal-label">CVV</div><input class="modal-input" id="pcCvv" inputmode="numeric" placeholder="123" maxlength="4"></div>
        </div>
      </div>

      <div id="payPix" style="display:none;text-align:center">
        <div style="font-size:64px;line-height:1;margin:6px 0">🔳</div>
        <div class="modal-label" style="text-align:center">PIX COPIA E COLA</div>
        <input class="modal-input" id="ppCode" readonly value="${PIX_CODE}" style="text-align:center;font-size:11px">
        <button class="modal-btn ghost" id="ppCopy" style="margin-top:8px">📋 Copiar código</button>
        <div style="font-size:11px;color:var(--t2);margin-top:8px">Pagamento simulado — clique em "Pagar" para confirmar.</div>
      </div>

      ${podeMeritos ? `
      <div id="payMeritos" style="display:none;text-align:center">
        <div style="font-size:48px;line-height:1;margin:6px 0">🏅</div>
        <div class="pay-meritos-row"><span>Custo</span><b>${custoMeritos} ⚡</b></div>
        <div style="font-size:10px;color:var(--t2);margin:-2px 0 6px">1 ⚡ = ${money(MERITO_VALUE_BRL)} · cobre ${money(total)}</div>
        <div class="pay-meritos-row"><span>Seu saldo</span><b style="color:${saldo >= custoMeritos ? "var(--ok)" : "var(--er)"}">${saldo} ⚡</b></div>
        ${saldo < custoMeritos ? `<div style="font-size:12px;color:var(--er);margin-top:8px">Saldo insuficiente — faltam ${custoMeritos - saldo} ⚡</div>`
          : `<div style="font-size:11px;color:var(--t2);margin-top:8px">Você ficará com ${saldo - custoMeritos} ⚡ após o pagamento.</div>`}
      </div>` : ""}

      <div class="pay-note">🔒 Pagamento de demonstração. Nenhuma cobrança real é feita.</div>
      <div class="modal-actions">
        <button class="modal-btn ghost" id="payCancel">Cancelar</button>
        <button class="modal-btn primary" id="payConfirm">Pagar ${money(total)}</button>
      </div>`);

    const el = dlg.el;
    let metodo = "cartao";
    const err = (msg) => { const c = el.querySelector("#payConfirm"); c.textContent = msg; setTimeout(() => c.textContent = `Pagar ${money(total)}`, 1600); };

    const confirmBtn = el.querySelector("#payConfirm");
    el.querySelectorAll(".pay-tab").forEach((t) => t.onclick = () => {
      metodo = t.dataset.pay;
      el.querySelectorAll(".pay-tab").forEach((x) => x.classList.toggle("active", x === t));
      el.querySelector("#payCartao").style.display = metodo === "cartao" ? "" : "none";
      el.querySelector("#payPix").style.display = metodo === "pix" ? "" : "none";
      const mp = el.querySelector("#payMeritos"); if (mp) mp.style.display = metodo === "meritos" ? "" : "none";
      confirmBtn.textContent = metodo === "meritos" ? `Pagar ${custoMeritos} ⚡` : `Pagar ${money(total)}`;
    });

    // máscaras simples
    const num = el.querySelector("#pcNum");
    num.oninput = () => { num.value = num.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); };
    const exp = el.querySelector("#pcExp");
    exp.oninput = () => { exp.value = exp.value.replace(/\D/g, "").slice(0, 4).replace(/(.{2})(.+)/, "$1/$2"); };
    el.querySelector("#ppCopy").onclick = () => navigator.clipboard?.writeText(PIX_CODE).catch(() => {});

    el.querySelector("#payCancel").onclick = () => { dlg.close(); resolve(null); };
    el.querySelector("#payConfirm").onclick = () => {
      if (metodo === "cartao") {
        const digits = num.value.replace(/\D/g, "");
        if (digits.length < 13) return err("Número inválido");
        if (!el.querySelector("#pcName").value.trim()) return err("Informe o nome");
        if (!/^\d{2}\/\d{2}$/.test(exp.value)) return err("Validade MM/AA");
        if (el.querySelector("#pcCvv").value.replace(/\D/g, "").length < 3) return err("CVV inválido");
      }
      if (metodo === "meritos") {
        if (saldo < custoMeritos) return err("Saldo insuficiente");
        dlg.close();
        return resolve({ metodo, status: "pago", meritos: custoMeritos });
      }
      dlg.close();
      resolve({ metodo, status: "pago" });
    };
  });
}
