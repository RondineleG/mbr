/* ═══════════════════════════════════════════════════════════════
   ADMIN · RELATÓRIOS — métricas e análises (realtime)
   Vai além do Dashboard: faturamento por período, top produtos,
   formas de pagamento, méritos, e desempenho de entregas.
   Dados: admin-store (watchAllOrders) — sem leitura extra.
   ═══════════════════════════════════════════════════════════════ */
import { setHtml, onAction } from "../utils/dom.js";
import { getOrders, subscribeOrders } from "./admin-store.js";
import { listAgents } from "../services/user.service.js";
import { money } from "../utils/format.js";
import { toDate } from "../utils/format.js";

const DAY = 86400000;
const startOfDay = (ms) => { const x = new Date(ms); x.setHours(0, 0, 0, 0); return x.getTime(); };
const dayMs = (v) => { const d = toDate(v); return d ? startOfDay(d.getTime()) : null; };

let period = 7;                 // dias considerados; 0 = todo o histórico
let agentName = {};             // uid → codinome (carregado uma vez)
let agentsLoaded = false;

const PERIODS = [{ d: 7, l: "7 dias" }, { d: 30, l: "30 dias" }, { d: 0, l: "Tudo" }];

function inPeriod(orders) {
  if (!period) return orders;
  const min = startOfDay(Date.now()) - (period - 1) * DAY;
  return orders.filter((o) => { const d = toDate(o.criadoEm); return d && d.getTime() >= min; });
}

function compute(orders) {
  const delivered = orders.filter((o) => o.status === "entregue");
  const cancelled = orders.filter((o) => o.status === "cancelado");
  const revenue = delivered.reduce((a, o) => a + (o.total || 0), 0);
  const avg = delivered.length ? revenue / delivered.length : 0;
  const meritos = delivered.reduce((a, o) => a + (o.pointsEarned || 0), 0);
  const deliveryPaid = delivered.reduce((a, o) => a + (o.deliveryFee || 0), 0);
  const cancelRate = orders.length ? (cancelled.length / orders.length) * 100 : 0;

  // Top produtos (por quantidade vendida).
  const prod = {};
  orders.forEach((o) => (o.items || []).forEach((it) => {
    const k = it.name || "—";
    if (!prod[k]) prod[k] = { qty: 0, rev: 0, icon: it.icon || "" };
    prod[k].qty += it.qty || 1;
    prod[k].rev += (it.price || 0) * (it.qty || 1);
  }));
  const topProd = Object.entries(prod).map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty).slice(0, 8);

  // Formas de pagamento.
  const pay = {};
  orders.forEach((o) => { const m = o.pagamento?.metodo || "—"; pay[m] = (pay[m] || 0) + 1; });

  // Série diária (faturamento + nº de pedidos) — últimos N dias (7 se "Tudo").
  const span = period || 7;
  const series = [];
  for (let i = span - 1; i >= 0; i--) {
    const day = startOfDay(Date.now()) - i * DAY;
    const day0 = orders.filter((o) => dayMs(o.criadoEm) === day);
    const rev = day0.filter((o) => o.status !== "cancelado").reduce((a, o) => a + (o.total || 0), 0);
    series.push({ day, count: day0.length, rev });
  }

  // Desempenho por motoboy (entregas concluídas + taxa paga).
  const moto = {};
  delivered.forEach((o) => {
    if (!o.agenteResponsavel) return;
    const k = o.agenteResponsavel;
    if (!moto[k]) moto[k] = { count: 0, fee: 0 };
    moto[k].count++; moto[k].fee += o.deliveryFee || 0;
  });
  const motoList = Object.entries(moto).map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => b.count - a.count).slice(0, 8);

  return { count: orders.length, delivered: delivered.length, cancelled: cancelled.length,
    revenue, avg, meritos, deliveryPaid, cancelRate, topProd, pay, series, motoList };
}

const PAY_LABEL = { cartao: "💳 Cartão", pix: "⚡ Pix", meritos: "🏅 Méritos", pendente: "⏳ Pendente", "—": "—" };
const kpi = (icon, val, label) =>
  `<div class="kpi"><div class="kpi-icon">${icon}</div><div class="kpi-val">${val}</div><div class="kpi-label">${label}</div></div>`;

function barChart(series) {
  const max = Math.max(1, ...series.map((s) => s.rev));
  const bars = series.map((s) => {
    const h = Math.round((s.rev / max) * 100);
    const d = new Date(s.day);
    const lbl = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `<div class="rep-bar" title="${lbl}: ${money(s.rev)} · ${s.count} pedido(s)">
      <div class="rep-bar-fill" style="height:${h}%"></div>
      <div class="rep-bar-val">${s.rev ? money(s.rev).replace("R$", "").trim() : ""}</div>
      <div class="rep-bar-lbl">${lbl}</div></div>`;
  }).join("");
  return `<div class="rep-chart">${bars}</div>`;
}

function topList(items, max, fmt) {
  if (!items.length) return `<div class="admin-empty">Sem dados no período.</div>`;
  const top = items[0]?._w ?? max;
  return items.map((it) => {
    const w = Math.round(((it._w ?? 0) / (top || 1)) * 100);
    return `<div class="rep-row">
      <div class="rep-row-bar" style="width:${Math.max(6, w)}%"></div>
      <div class="rep-row-txt">${fmt(it)}</div></div>`;
  }).join("");
}

export function renderReports() {
  if (!agentsLoaded) {
    agentsLoaded = true;
    listAgents().then((a) => { a.forEach((u) => { agentName[u.uid || u.id] = u.codename || u.email || "agente"; }); renderReports(); })
      .catch(() => { agentsLoaded = false; });
  }

  const all = getOrders();
  const orders = inPeriod(all);
  const m = compute(orders);

  setHtml("repPeriod", PERIODS.map((p) =>
    `<button class="admin-btn sm ${p.d === period ? "active" : "ghost"}" data-action="report-period" data-days="${p.d}">${p.l}</button>`).join(""));

  setHtml("repKpis", [
    kpi("💰", money(m.revenue), "Faturamento (entregue)"),
    kpi("📦", m.count, "Pedidos no período"),
    kpi("✅", m.delivered, "Entregues"),
    kpi("🎯", money(m.avg), "Ticket médio"),
    kpi("🏅", m.meritos, "Méritos distribuídos"),
    kpi("🛵", money(m.deliveryPaid), "Taxa de entrega paga"),
    kpi("❌", `${m.cancelRate.toFixed(0)}%`, "Cancelamento"),
  ].join(""));

  setHtml("repChart", `<div class="admin-subtitle">FATURAMENTO POR DIA</div>${barChart(m.series)}`);

  const topProd = m.topProd.map((p) => ({ ...p, _w: p.qty }));
  setHtml("repProducts", `<div class="admin-subtitle">TOP PRODUTOS (QTD)</div>` +
    topList(topProd, topProd[0]?.qty || 1, (p) => `${p.icon || "🍔"} ${p.name} · <b>${p.qty}</b> · ${money(p.rev)}`));

  const payRows = Object.entries(m.pay).map(([k, v]) => ({ k, v, _w: v })).sort((a, b) => b.v - a.v);
  setHtml("repPay", `<div class="admin-subtitle">FORMAS DE PAGAMENTO</div>` +
    topList(payRows, payRows[0]?.v || 1, (r) => `${PAY_LABEL[r.k] || r.k} · <b>${r.v}</b>`));

  const moto = m.motoList.map((x) => ({ ...x, _w: x.count }));
  setHtml("repMoto", `<div class="admin-subtitle">ENTREGAS POR MOTOBOY</div>` +
    topList(moto, moto[0]?.count || 1, (x) => `🛵 ${agentName[x.uid] || x.uid.slice(0, 6)} · <b>${x.count}</b> entrega(s) · ${money(x.fee)}`));
}

export function initReports() {
  subscribeOrders(() => {
    if (document.getElementById("section-relatorios")?.classList.contains("active")) renderReports();
  });
  onAction("report-period", (el) => { period = Number(el.dataset.days) || 0; renderReports(); });
}
