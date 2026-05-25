"use client";

import { DELIVERY_METHODS, type CartStoredItem } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CART_KEY = "beauty_boat_cart";

function readCart(): CartStoredItem[] {
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setError("");
    setLoading(true);
    const items = readCart();
    if (items.length === 0) {
      setError("购物车是空的。");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: formData.get("customerName"),
        customerPhone: formData.get("customerPhone"),
        deliveryMethod: formData.get("deliveryMethod"),
        deliveryNote: formData.get("deliveryNote"),
        customerNote: formData.get("customerNote"),
        items,
      }),
    });

    setLoading(false);
    if (!response.ok) {
      setError("订单提交失败，请检查资料或稍后再试。");
      return;
    }

    const data = await response.json();
    window.localStorage.removeItem(CART_KEY);
    router.push(`/order/success?order=${encodeURIComponent(data.orderNumber)}`);
  }

  return (
    <main className="shop-page narrow">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1>提交订单</h1>
          <p>店家会通过 WhatsApp text 或电话跟进最终报价、运输费和 PayNow 付款。</p>
        </div>
      </header>

      <form className="checkout-form" action={submit}>
        <label>
          姓名
          <input name="customerName" required />
        </label>
        <label>
          电话 / WhatsApp
          <input name="customerPhone" required />
        </label>
        <label>
          运输方式
          <select name="deliveryMethod" required defaultValue="third-party">
            {DELIVERY_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.zh} / {method.en}
              </option>
            ))}
          </select>
        </label>
        <label>
          取货/配送备注
          <textarea name="deliveryNote" rows={3} placeholder="例如：希望下午送达，或预约自取时间" />
        </label>
        <label>
          订单备注
          <textarea name="customerNote" rows={4} placeholder="例如：客制粉料用途、口味方向、数量需求" />
        </label>
        <div className="summary-box">
          <p><span>GST</span><strong>9%</strong></p>
          <p><span>运输费</span><strong>Lalamove/Grab 另计，自费领取可为 0</strong></p>
          <p><span>付款</span><strong>店家确认后 PayNow</strong></p>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="checkout-button" type="submit" disabled={loading}>
          {loading ? "提交中..." : "提交订单"}
        </button>
      </form>
    </main>
  );
}
