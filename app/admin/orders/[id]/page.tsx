"use client";

import { parseIngredientLines, type IngredientPriceLine } from "@/lib/custom-ingredients";
import { formatMoney } from "@/lib/money";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type OrderDetail = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerNote: string | null;
  deliveryMethod: string;
  deliveryNote: string | null;
  status: string;
  subtotalCents: number;
  gstRate: 0 | 9;
  gstCents: number;
  deliveryFeeCents: number | null;
  finalTotalCents: number | null;
  hasQuoteItems: boolean;
  depositRequired: boolean;
  followUpText: string;
  customerId: string | null;
  billToCustomer: CustomerSummary | null;
  items: {
    id: string;
    productNameZh: string;
    productNameEn: string;
    unit: string;
    quantity: number;
    unitPriceCents: number | null;
    lineTotalCents: number | null;
    quoteOnly: boolean;
    vendorCode: string | null;
    vendorName: string | null;
    blendType: string | null;
    ingredients: string | null;
    ingredientQuantity: string | null;
    heatTreatment: string | null;
    processSpec: string | null;
    grindingCostPer600gCents: number | null;
    minimumQuantityKg: number | null;
    depositCents: number | null;
    balanceCents: number | null;
  }[];
};

type CustomerSummary = {
  id: string;
  nameZh: string;
  nameEn: string | null;
  phone: string | null;
  active: boolean;
};

type IngredientDraftLine = {
  name: string;
  quantityJin: number;
  unitPrice: string;
  lineTotal: string;
};

type CustomBlendDraft = {
  lines: IngredientDraftLine[];
  grindingCostPerJin: string;
};

type AiProviderInfo = {
  provider: "ollama" | "deepseek";
  ollamaModel: string;
  deepseekModel: string;
  effectiveDeepSeekKey?: { length: number; ending: string } | null;
  timeoutMs: number;
};

const statuses = ["pending", "quoted", "awaiting-payment", "paid", "processing", "completed", "cancelled"];
const aiDraftKinds = [
  { kind: "whatsapp", label: "WhatsApp 草稿" },
  { kind: "summary", label: "订单摘要" },
  { kind: "quote", label: "报价/供应商询价" },
] as const;

function makeIngredientDraftLines(item: OrderDetail["items"][number]): IngredientDraftLine[] {
  const parsedLines = parseIngredientLines(item.ingredients);
  if (parsedLines.length > 0) {
    return parsedLines.map((line: IngredientPriceLine) => ({
      name: line.name,
      quantityJin: line.quantityJin,
      unitPrice: String(line.unitPriceCents / 100),
      lineTotal: String(line.lineTotalCents / 100),
    }));
  }

  return (item.ingredients ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      quantityJin: 1,
      unitPrice: "0",
      lineTotal: "0",
    }));
}

function hasReceivedPayment(status: string) {
  return ["paid", "processing", "completed"].includes(status);
}

function followUpTextForStatus(order: OrderDetail) {
  if (!hasReceivedPayment(order.status)) return order.followUpText;
  const paidMessage = "付款已經收到。谢谢";
  if (order.followUpText.includes(paidMessage)) return order.followUpText;
  return `${order.followUpText}\n${paidMessage}`;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [finalTotal, setFinalTotal] = useState("");
  const [gstRate, setGstRate] = useState<0 | 9>(0);
  const [depositRequired, setDepositRequired] = useState(true);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customBlendDrafts, setCustomBlendDrafts] = useState<Record<string, CustomBlendDraft>>({});
  const [templateCodes, setTemplateCodes] = useState<Record<string, string>>({});
  const [templateNames, setTemplateNames] = useState<Record<string, string>>({});
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<AiProviderInfo | null>(null);
  const [aiProviderLoading, setAiProviderLoading] = useState(false);
  const [aiProviderStatus, setAiProviderStatus] = useState("");
  const [telegramStatus, setTelegramStatus] = useState("");
  const [telegramLoadingTarget, setTelegramLoadingTarget] = useState<"shop" | "manufacturing" | null>(null);

  async function load() {
    const response = await fetch(`/api/admin/orders/${params.id}`);
    if (response.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await response.json();
    setOrder(data);
    setCustomerId(data.customerId ?? "");
    setGstRate(data.gstRate ?? 0);
    setDepositRequired(data.depositRequired ?? true);
    setDeliveryFee(data.deliveryFeeCents == null ? "" : String(data.deliveryFeeCents / 100));
    setFinalTotal(data.finalTotalCents == null ? "" : String(data.finalTotalCents / 100));
    setCustomBlendDrafts(
      Object.fromEntries(
        data.items
          .filter((item: OrderDetail["items"][number]) => item.vendorCode || item.ingredients)
          .map((item: OrderDetail["items"][number]) => [
            item.id,
            {
              lines: makeIngredientDraftLines(item),
              grindingCostPerJin: item.grindingCostPer600gCents == null ? "" : String(item.grindingCostPer600gCents / 100),
            },
          ]),
      ),
    );
  }

  useEffect(() => {
    load();
    fetch("/api/admin/customers").then(async (response) => {
      if (response.ok) setCustomers(await response.json());
    });
    fetch("/api/admin/ai/provider").then(async (response) => {
      if (response.ok) setAiProvider(await response.json());
    });
  }, []);

  const displayFollowUpText = useMemo(() => {
    return order ? followUpTextForStatus(order) : "";
  }, [order]);

  const whatsappUrl = useMemo(() => {
    if (!order) return "#";
    const phone = order.customerPhone.replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(displayFollowUpText)}`;
  }, [order, displayFollowUpText]);

  async function update(data: Record<string, unknown>) {
    await fetch(`/api/admin/orders/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  async function deleteCancelledOrder() {
    if (!order || order.status !== "cancelled") return;
    const ok = window.confirm("Delete this cancelled order permanently?");
    if (!ok) return;

    const response = await fetch(`/api/admin/orders/${params.id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/admin/orders");
      return;
    }
    const data = await response.json().catch(() => null);
    window.alert(data?.error || "Order delete failed");
  }

  function updateIngredientDraft(itemId: string, index: number, data: Partial<IngredientDraftLine>) {
    setCustomBlendDrafts((current) => {
      const draft = current[itemId];
      if (!draft) return current;
      const lines = draft.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, ...data };
        if (data.quantityJin !== undefined || data.unitPrice !== undefined) {
          const amount = Number(next.quantityJin || 0) * Number(next.unitPrice || 0);
          next.lineTotal = Number.isFinite(amount) ? amount.toFixed(2) : "0";
        }
        if (data.lineTotal !== undefined && Number(next.quantityJin) > 0) {
          const unitPrice = Number(next.lineTotal || 0) / Number(next.quantityJin);
          next.unitPrice = Number.isFinite(unitPrice) ? unitPrice.toFixed(2) : "0";
        }
        return next;
      });
      return { ...current, [itemId]: { ...draft, lines } };
    });
  }

  function addIngredientDraftLine(itemId: string) {
    setCustomBlendDrafts((current) => {
      const draft = current[itemId];
      if (!draft) return current;
      return {
        ...current,
        [itemId]: {
          ...draft,
          lines: [...draft.lines, { name: "", quantityJin: 1, unitPrice: "0", lineTotal: "0" }],
        },
      };
    });
  }

  async function saveCustomBlendItem(itemId: string) {
    const draft = customBlendDrafts[itemId];
    if (!draft) return;

    const response = await fetch(`/api/admin/order-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientLines: draft.lines.map((line) => ({
          name: line.name,
          quantityJin: Number(line.quantityJin),
          unitPriceCents: Math.round(Number(line.unitPrice || 0) * 100),
          lineTotalCents: Math.round(Number(line.lineTotal || 0) * 100),
        })),
        grindingCostPerJinCents: Math.round(Number(draft.grindingCostPerJin || 0) * 100),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      window.alert(data?.error || "Custom blend update failed");
      return;
    }
    await load();
  }

  async function saveRepeatVendorCode(item: OrderDetail["items"][number]) {
    const vendorCode = (templateCodes[item.id] || item.vendorCode || "").trim();
    const vendorName = (templateNames[item.id] || order?.customerName || item.vendorName || "").trim();
    if (!vendorCode || !vendorName) {
      window.alert("Vendor code and vendor name are required");
      return;
    }

    const response = await fetch("/api/admin/custom-blend-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId: item.id, vendorCode, vendorName }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      window.alert(data?.error || "Save repeat vendor code failed");
      return;
    }
    window.alert(`Saved repeat vendor code ${data.vendorCode}`);
  }

  async function generateAiDraft(kind: (typeof aiDraftKinds)[number]["kind"]) {
    if (!order) return;
    setAiLoading(kind);
    setAiError("");
    setAiText("");

    const response = await fetch("/api/admin/ai/order-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, kind }),
    });
    const data = await response.json();
    setAiLoading(null);

    if (!response.ok) {
      setAiError(data.error || "AI 生成失败");
      return;
    }

    setAiText(data.text || "");
  }

  async function switchAiProvider(provider: "ollama" | "deepseek") {
    setAiProviderLoading(true);
    setAiProviderStatus("");
    setAiError("");
    const response = await fetch("/api/admin/ai/provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const data = await response.json().catch(() => null);
    setAiProviderLoading(false);

    if (!response.ok) {
      setAiProviderStatus(data?.error || "AI provider switch failed.");
      return;
    }

    const next = await fetch("/api/admin/ai/provider");
    if (next.ok) setAiProvider(await next.json());
    setAiProviderStatus(provider === "deepseek" ? "AI switched to DeepSeek cloud." : "AI switched to local Ollama.");
  }

  async function sendTelegramTest(target: "shop" | "manufacturing") {
    setTelegramLoadingTarget(target);
    setTelegramStatus("");
    const endpoint = target === "manufacturing" ? "/api/admin/telegram/manufacturing-test" : "/api/admin/telegram/test";
    const response = await fetch(endpoint, { method: "POST" });
    const data = await response.json().catch(() => null);
    setTelegramLoadingTarget(null);
    setTelegramStatus(
      response.ok
        ? target === "manufacturing"
          ? "Manufacturing Telegram test sent."
          : "Telegram test sent."
        : data?.error || "Telegram test failed.",
    );
  }

  if (!order) return <main className="shop-page">Loading...</main>;

  return (
    <main className="shop-page">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Hermes Admin</p>
          <h1>{order.orderNumber}</h1>
          <p>{order.customerName} · {order.customerPhone}</p>
        </div>
        <div className="shop-actions">
          <Link className="cart-link" href="/admin/customers">客户资料</Link>
          <Link className="cart-link" href="/admin/orders">返回订单</Link>
        </div>
      </header>

      <section className="order-detail">
        <div className="summary-box">
          <h2>订单内容</h2>
          {order.items.map((item) => (
            <div className="admin-order-item" key={item.id}>
              <p>
                <span>{item.productNameZh} x {item.quantity}{item.vendorCode || item.ingredients ? ` ${item.unit}` : ""}</span>
                <strong>{item.quoteOnly ? "询价" : formatMoney(item.lineTotalCents)}</strong>
              </p>
              {(item.vendorCode || item.ingredients) && (
                <div className="custom-cart-details">
                  <p><span>Vendor code</span><b>{item.vendorCode ?? "New customer recipe"} · {item.vendorName}</b></p>
                  <p><span>Blend type</span><b>{item.blendType}</b></p>
                  {customBlendDrafts[item.id] && (
                    <div className="admin-ingredient-editor">
                      <div className="admin-ingredient-header">
                        <span>Ingredient</span>
                        <span>Qty 斤</span>
                        <span>Unit $</span>
                        <span>Line $</span>
                      </div>
                      {customBlendDrafts[item.id].lines.map((line, index) => {
                        return (
                          <div className="admin-ingredient-row" key={`${item.id}-${line.name}-${index}`}>
                            <input
                              value={line.name}
                              onChange={(event) => updateIngredientDraft(item.id, index, { name: event.target.value })}
                            />
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={line.quantityJin}
                              onChange={(event) => updateIngredientDraft(item.id, index, { quantityJin: Number(event.target.value) })}
                            />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.unitPrice}
                              onChange={(event) => updateIngredientDraft(item.id, index, { unitPrice: event.target.value })}
                            />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.lineTotal}
                              onChange={(event) => updateIngredientDraft(item.id, index, { lineTotal: event.target.value })}
                            />
                          </div>
                        );
                      })}
                      <div className="admin-ingredient-row">
                        <span>Grinding / 斤</span>
                        <span>{customBlendDrafts[item.id].lines.reduce((sum, line) => sum + Number(line.quantityJin || 0), 0)}斤</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={customBlendDrafts[item.id].grindingCostPerJin}
                          onChange={(event) =>
                            setCustomBlendDrafts((current) => ({
                              ...current,
                              [item.id]: { ...current[item.id], grindingCostPerJin: event.target.value },
                            }))
                          }
                        />
                        <strong>
                          {formatMoney(
                            Math.round(
                              customBlendDrafts[item.id].lines.reduce((sum, line) => sum + Number(line.quantityJin || 0), 0) *
                                Number(customBlendDrafts[item.id].grindingCostPerJin || 0) *
                                100,
                            ),
                          )}
                        </strong>
                      </div>
                      <button className="checkout-button" type="button" onClick={() => saveCustomBlendItem(item.id)}>
                        Save ingredient prices
                      </button>
                      <div className="repeat-code-box">
                        <label>
                          Repeat vendor code
                          <input
                            value={templateCodes[item.id] ?? item.vendorCode ?? ""}
                            onChange={(event) => setTemplateCodes((current) => ({ ...current, [item.id]: event.target.value }))}
                            placeholder="Example: CUST-10"
                          />
                        </label>
                        <label>
                          Vendor / customer name
                          <input
                            value={templateNames[item.id] ?? order.customerName}
                            onChange={(event) => setTemplateNames((current) => ({ ...current, [item.id]: event.target.value }))}
                          />
                        </label>
                        <button className="cart-link" type="button" onClick={() => saveRepeatVendorCode(item)}>
                          Save as repeat vendor code
                        </button>
                      </div>
                      <button className="cart-link" type="button" onClick={() => addIngredientDraftLine(item.id)}>
                        Add ingredient row
                      </button>
                    </div>
                  )}
                  <p><span>Total weight</span><b>{item.ingredientQuantity}</b></p>
                  <p><span>Heat treatment</span><b>{item.heatTreatment}</b></p>
                  <p><span>Baking / grinding</span><b>{item.processSpec}</b></p>
                  <p><span>Grinding / 斤</span><b>{formatMoney(item.grindingCostPer600gCents)}</b></p>
                  <p><span>{order.depositRequired ? "70% new customer deposit" : "Deposit waived for repeat order"}</span><b>{formatMoney(item.depositCents)}</b></p>
                  <p><span>{order.depositRequired ? "30% collection balance" : "collection balance"}</span><b>{formatMoney(item.balanceCents)}</b></p>
                </div>
              )}
            </div>
          ))}
          <p><span>商品小计</span><strong>{formatMoney(order.subtotalCents)}</strong></p>
          <p><span>GST {order.gstRate ?? 0}%</span><strong>{formatMoney(order.gstCents)}</strong></p>
          <p><span>运输费</span><strong>{order.deliveryFeeCents == null ? "另计" : formatMoney(order.deliveryFeeCents)}</strong></p>
          <p><span>最终金额</span><strong>{order.finalTotalCents == null ? "待确认" : formatMoney(order.finalTotalCents)}</strong></p>
        </div>

        <div className="checkout-form">
          <h2>状态与金额</h2>
          <label>
            Bill To 客户
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">使用订单填写资料</option>
              {customers
                .filter((customer) => customer.active || customer.id === customerId)
                .map((customer) => (
                  <option value={customer.id} key={customer.id}>
                    {customer.nameZh}{customer.nameEn ? ` / ${customer.nameEn}` : ""}
                  </option>
                ))}
            </select>
          </label>
          <label>
            订单状态
            <select value={order.status} onChange={(event) => update({ status: event.target.value })}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label>
            GST
            <select value={gstRate} onChange={(event) => setGstRate(Number(event.target.value) as 0 | 9)}>
              <option value={0}>0% - Non GST registered / waived</option>
              <option value={9}>9%</option>
            </select>
          </label>
          <label>
            Custom Blend customer type
            <select
              value={depositRequired ? "new" : "repeat"}
              onChange={(event) => setDepositRequired(event.target.value === "new")}
            >
              <option value="new">New customer: 70% deposit applies</option>
              <option value="repeat">Repeat order: deposit waived</option>
            </select>
          </label>
          <label>
            运输费 SGD
            <input value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} placeholder="留空为另计" />
          </label>
          <label>
            最终金额 SGD
            <input value={finalTotal} onChange={(event) => setFinalTotal(event.target.value)} placeholder="询价订单可手动填写" />
          </label>
          <button
            className="checkout-button"
            type="button"
            onClick={() =>
              update({
                deliveryFeeCents: deliveryFee ? Math.round(Number(deliveryFee) * 100) : null,
                finalTotalCents: finalTotal ? Math.round(Number(finalTotal) * 100) : null,
                customerId: customerId || null,
                gstRate,
                depositRequired,
              })
            }
          >
            保存金额
          </button>
          <Link className="cart-link" href={`/admin/orders/${order.id}/cash-sale`} target="_blank">
            生成沽单
          </Link>
          {order.status === "cancelled" && (
            <button className="danger-button" type="button" onClick={deleteCancelledOrder}>
              删除取消订单
            </button>
          )}
        </div>

        <div className="summary-box">
          <h2>WhatsApp 跟进</h2>
          <textarea readOnly value={displayFollowUpText} rows={9} />
          <a className="checkout-button" href={whatsappUrl} target="_blank" rel="noreferrer">打开 WhatsApp</a>
          <a className="cart-link" href={`tel:${order.customerPhone}`}>电话联系</a>
        </div>

        <div className="summary-box ai-panel">
          <h2>Hermes AI 辅助</h2>
          <p>AI 只生成草稿；请店家确认金额、运输费和付款状态后再发送。</p>
          <button className="cart-link" type="button" onClick={() => sendTelegramTest("shop")} disabled={telegramLoadingTarget != null}>
            {telegramLoadingTarget === "shop" ? "Sending Telegram..." : "Send Telegram test"}
          </button>
          <button className="cart-link" type="button" onClick={() => sendTelegramTest("manufacturing")} disabled={telegramLoadingTarget != null}>
            {telegramLoadingTarget === "manufacturing" ? "Sending Manufacturing..." : "Send Manufacturing test"}
          </button>
          {telegramStatus && <p className={telegramStatus.includes("sent") ? "" : "form-error"}>{telegramStatus}</p>}
          <div className="summary-box">
            <p>
              <span>AI provider</span>
              <strong>
                {aiProvider
                  ? `${aiProvider.provider} (${aiProvider.provider === "ollama" ? aiProvider.ollamaModel : aiProvider.deepseekModel})`
                  : "Loading"}
              </strong>
            </p>
            {aiProvider?.provider === "deepseek" && (
              <p>
                <span>DeepSeek key</span>
                <strong>
                  {aiProvider.effectiveDeepSeekKey
                    ? `ending ${aiProvider.effectiveDeepSeekKey.ending}, length ${aiProvider.effectiveDeepSeekKey.length}`
                    : "not configured"}
                </strong>
              </p>
            )}
            <div className="shop-actions">
              <button
                className="cart-link"
                type="button"
                onClick={() => switchAiProvider("deepseek")}
                disabled={aiProviderLoading || aiProvider?.provider === "deepseek"}
              >
                Switch to DeepSeek
              </button>
              <button
                className="cart-link"
                type="button"
                onClick={() => switchAiProvider("ollama")}
                disabled={aiProviderLoading || aiProvider?.provider === "ollama"}
              >
                Switch to Ollama
              </button>
            </div>
            {aiProviderStatus && <p className={aiProviderStatus.includes("failed") ? "form-error" : ""}>{aiProviderStatus}</p>}
          </div>
          <div className="ai-action-grid">
            {aiDraftKinds.map((draft) => (
              <button
                className="checkout-button"
                type="button"
                key={draft.kind}
                onClick={() => generateAiDraft(draft.kind)}
                disabled={aiLoading != null}
              >
                {aiLoading === draft.kind ? "生成中..." : draft.label}
              </button>
            ))}
          </div>
          {aiError && <p className="form-error">{aiError}</p>}
          <textarea
            readOnly
            value={aiText}
            rows={10}
            placeholder="AI 草稿会显示在这里。"
          />
          <button
            className="cart-link"
            type="button"
            disabled={!aiText}
            onClick={() => navigator.clipboard.writeText(aiText)}
          >
            复制 AI 草稿
          </button>
        </div>
      </section>
    </main>
  );
}
