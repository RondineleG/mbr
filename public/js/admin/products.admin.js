/* ═══════════════════════════════════════════════════════════════
   ADMIN · PRODUTOS — CRUD completo + ativar/desativar + imagem
   ═══════════════════════════════════════════════════════════════ */
import { onAction, setHtml, escapeHtml } from "../utils/dom.js";
import { listProducts, createProduct, updateProduct, toggleProduct, removeProduct } from "../services/product.service.js";
import { uploadImage, fileToDataUrl } from "../firebase/storage.service.js";
import { money } from "../utils/format.js";
import { modalCustom, modalConfirm } from "../components/modal.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { skeletonList } from "../components/skeleton.js";

const CATS = [["dia", "Lanche do Dia"], ["mbox", "MBox"], ["acomp", "Acompanhamento"], ["bebidas", "Bebida"], ["sobremesas", "Sobremesa"]];
let cache = [];

async function load() {
  setHtml("productsList", skeletonList(5));
  cache = await listProducts({ activeOnly: false });
  draw();
}

function draw() {
  if (!cache.length) { setHtml("productsList", '<div class="empty-state">🍔</div>'); return; }
  setHtml("productsList", cache.map((p) => `
    <div class="data-row ${p.active === false ? "inactive" : ""}">
      <div class="data-thumb" ${p.image ? `style="background-image:url('${p.image}')"` : ""}>${p.image ? "" : (p.icon || "🍔")}</div>
      <div class="data-main">
        <div class="data-name">${escapeHtml(p.name)} ${p.featured ? "⭐" : ""}</div>
        <div class="data-meta">${escapeHtml((CATS.find((c) => c[0] === p.category) || [])[1] || p.category)} · ${p.active === false ? "Inativo" : "Ativo"}</div>
      </div>
      <div class="data-price">${money(p.price)}</div>
      <div class="data-actions">
        <button class="admin-btn sm ghost" data-action="prod-toggle" data-id="${p.id}">${p.active === false ? "Ativar" : "Desativar"}</button>
        <button class="admin-btn sm" data-action="prod-edit" data-id="${p.id}">Editar</button>
        <button class="admin-btn sm danger" data-action="prod-del" data-id="${p.id}">✕</button>
      </div>
    </div>`).join(""));
}

function form(p = {}) {
  const m = modalCustom(`
    <div class="modal-title">${p.id ? "Editar produto" : "Novo produto"}</div>
    <div class="modal-label">NOME</div><input class="modal-input" id="f-name" value="${escapeHtml(p.name || "")}">
    <div class="modal-label">DESCRIÇÃO</div><input class="modal-input" id="f-desc" value="${escapeHtml(p.description || "")}">
    <div class="modal-label">PREÇO (R$)</div><input class="modal-input" id="f-price" type="number" step="0.01" value="${p.price || ""}">
    <div class="modal-label">CATEGORIA</div>
    <select class="modal-select" id="f-cat">${CATS.map(([v, l]) => `<option value="${v}" ${p.category === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <div class="modal-label">ÍCONE (emoji)</div><input class="modal-input" id="f-icon" value="${escapeHtml(p.icon || "🍔")}">
    <div class="modal-label">IMAGEM (opcional)</div><input class="modal-input" id="f-img" type="file" accept="image/*">
    <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;color:var(--text-muted)"><input type="checkbox" id="f-feat" ${p.featured ? "checked" : ""}> Destaque</label>
    <div class="modal-actions">
      <button class="modal-btn ghost" id="f-cancel">Cancelar</button>
      <button class="modal-btn primary" id="f-save">Salvar</button>
    </div>`);
  m.el.querySelector("#f-cancel").onclick = m.close;
  m.el.querySelector("#f-save").onclick = async () => {
    const data = {
      name: m.el.querySelector("#f-name").value.trim(),
      description: m.el.querySelector("#f-desc").value.trim(),
      price: parseFloat(m.el.querySelector("#f-price").value) || 0,
      category: m.el.querySelector("#f-cat").value,
      icon: m.el.querySelector("#f-icon").value.trim() || "🍔",
      featured: m.el.querySelector("#f-feat").checked,
    };
    if (!data.name) return toastError("Informe o nome do produto");
    const file = m.el.querySelector("#f-img").files[0];
    try {
      if (file) {
        // Upload é opcional: se o Storage não estiver disponível (plano grátis),
        // salva o produto mesmo assim, só sem imagem.
        try { data.image = p.id ? await uploadImage(file, `products/${p.id}`) : await fileToDataUrl(file); }
        catch { toastError("Imagem ignorada (Storage indisponível) — produto salvo sem foto"); }
      }
      if (p.id) await updateProduct(p.id, data);
      else await createProduct({ ...data, active: true });
      m.close();
      toastSuccess(p.id ? "Produto atualizado" : "Produto criado");
      load();
    } catch { toastError("Falha ao salvar produto"); }
  };
}

export function renderProducts() { load(); }

export function initProducts() {
  onAction("prod-new", () => form());
  onAction("prod-edit", (el) => form(cache.find((p) => p.id === el.dataset.id)));
  onAction("prod-toggle", async (el) => {
    const p = cache.find((x) => x.id === el.dataset.id);
    await toggleProduct(p.id, p.active === false); load();
  });
  onAction("prod-del", async (el) => {
    const p = cache.find((x) => x.id === el.dataset.id);
    if (await modalConfirm({ title: "Remover produto", message: `Remover "${p.name}"?`, confirmText: "Remover", danger: true })) {
      await removeProduct(p.id); toastSuccess("Produto removido"); load();
    }
  });
}
