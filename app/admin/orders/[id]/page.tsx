"use client";

import { formatMoney } from "@/lib/money";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  gstCents: number;
  deliveryFeeCents: number | null;
  finalTotalCents: number | null;
  hasQuoteItems: boolean;
  followUpText: string;
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

const statuses = ["pending", "quoted", "awaiting-payment", "paid", "processing", "completed", "cancelled"];
const aiDraftKinds = [
  { kind: "whatsapp", label: "WhatsApp 草稿" },
  { kind: "summary", label: "订单摘要" },
  { kind: "quote", label: "报价/供应商询价" },
] as const;

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [finalTotal, setFinalTotal] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`/api/admin/orders/${params.id}`);
    if (response.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await response.json();
    setOrder(data);
    setDeliveryFee(data.deliveryFeeCents == null ? "" : String(data.deliveryFeeCents / 100));
    setFinalTotal(data.finalTotalCents == null ? "" : String(data.finalTotalCents / 100));
  }

  useEffect(() => {
    load();
  }, []);

  const whatsappUrl = useMemo(() => {
    if (!order) return "#";
    const phone = order.customerPhone.replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(order.followUpText)}`;
  }, [order]);

  async function update(data: Record<string, unknown>) {
    await fetch(`/api/admin/orders/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
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

  if (!order) return <main className="shop-page">Loading...</main>;

  return (
    <main className="shop-page">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Hermes Admin</p>
          <h1>{order.orderNumber}</h1>
          <p>{order.customerName} · {order.customerPhone}</p>
        </div>
        <Link className="cart-link" href="/admin/orders">返回订单</Link>
      </header>

      <section className="order-detail">
        <div className="summary-box">
          <h2>订单内容</h2>
          {order.items.map((item) => (
            <div className="admin-order-item" key={item.id}>
              <p>
                <span>{item.productNameZh} x {item.quantity}{item.vendorCode ? ` ${item.unit}` : ""}</span>
                <strong>{item.quoteOnly ? "询价" : formatMoney(item.lineTotalCents)}</strong>
              </p>
              {item.vendorCode && (
                <div className="custom-cart-details">
                  <p><span>Vendor code</span><b>{item.vendorCode} · {item.vendorName}</b></p>
                  <p><span>Blend type</span><b>{item.blendType}</b></p>
                  <p><span>Ingredients</span><b>{item.ingredients}</b></p>
                  <p><span>Quantity spec</span><b>{item.ingredientQuantity}</b></p>
                  <p><span>Heat treatment</span><b>{item.heatTreatment}</b></p>
                  <p><span>Baking / grinding</span><b>{item.processSpec}</b></p>
                  <p><span>Grinding / 600g</span><b>{formatMoney(item.grindingCostPer600gCents)}</b></p>
                  <p><span>70% deposit</span><b>{formatMoney(item.depositCents)}</b></p>
                  <p><span>30% collection balance</span><b>{formatMoney(item.balanceCents)}</b></p>
                </div>
              )}
            </div>
          ))}
          <p><span>商品小计</span><strong>{formatMoney(order.subtotalCents)}</strong></p>
          <p><span>GST 9%</span><strong>{formatMoney(order.gstCents)}</strong></p>
          <p><span>运输费</span><strong>{order.deliveryFeeCents == null ? "另计" : formatMoney(order.deliveryFeeCents)}</strong></p>
          <p><span>最终金额</span><strong>{order.finalTotalCents == null ? "待确认" : formatMoney(order.finalTotalCents)}</strong></p>
        </div>

        <div className="checkout-form">
          <h2>状态与金额</h2>
          <label>
            订单状态
            <select value={order.status} onChange={(event) => update({ status: event.target.value })}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
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
              })
            }
          >
            保存金额
          </button>
        </div>

        <div className="summary-box">
          <h2>WhatsApp 跟进</h2>
          <textarea readOnly value={order.followUpText} rows={9} />
          <a className="checkout-button" href={whatsappUrl} target="_blank" rel="noreferrer">打开 WhatsApp</a>
          <a className="cart-link" href={`tel:${order.customerPhone}`}>电话联系</a>
        </div>

        <div className="summary-box ai-panel">
          <h2>Hermes AI 辅助</h2>
          <p>AI 只生成草稿；请店家确认金额、运输费和付款状态后再发送。</p>
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
