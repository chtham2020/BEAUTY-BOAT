"use client";

import { DELIVERY_METHODS, type CartStoredItem } from "@/lib/types";
import { useLanguagePreference } from "@/lib/language";
import { CUSTOM_BLEND_PRODUCT_ID, calculateBalanceCents, calculateCustomLineTotalCents, calculateDepositCents } from "@/lib/custom-pricing";
import { formatMoney } from "@/lib/money";
import { House } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const CART_KEY = "beauty_boat_cart";

const copy = {
  zh: {
    title: "提交订单",
    body: "店家会通过 WhatsApp text 或电话跟进最终报价、运输费和 PayNow 付款。",
    home: "主页",
    emptyCart: "购物车是空的。",
    submitFailed: "订单提交失败，请检查资料或稍后再试。",
    name: "姓名",
    phone: "电话 / WhatsApp",
    deliveryMethod: "运输方式",
    deliveryNote: "取货/配送备注",
    deliveryPlaceholder: "例如：希望下午送达，或预约自取时间",
    orderNote: "订单备注",
    orderPlaceholder: "例如：客制粉料用途、口味方向、数量需求",
    deliveryFee: "运输费",
    deliveryFeeValue: "Lalamove/Grab 另计，自费领取可为 0",
    payment: "付款",
    paymentValue: "店家确认后 PayNow",
    customSubtotal: "Custom Blend subtotal",
    deposit: "70% deposit",
    balance: "30% upon collection",
    submitting: "提交中...",
    submit: "提交订单",
  },
  en: {
    title: "Submit Order",
    body: "The shop will follow up by WhatsApp text or phone to confirm the final quote, delivery fee, and PayNow payment.",
    home: "Home",
    emptyCart: "Shopping Cart is empty.",
    submitFailed: "Order submission failed. Please check your details or try again later.",
    name: "Name",
    phone: "Phone / WhatsApp",
    deliveryMethod: "Delivery Method",
    deliveryNote: "Pickup / Delivery Note",
    deliveryPlaceholder: "Example: afternoon delivery preferred, or self-pickup appointment time",
    orderNote: "Order Note",
    orderPlaceholder: "Example: custom blend use, flavour direction, quantity needed",
    deliveryFee: "Delivery Fee",
    deliveryFeeValue: "Lalamove/Grab quoted separately. Self pickup can be 0.",
    payment: "Payment",
    paymentValue: "PayNow after shop confirmation",
    customSubtotal: "Custom Blend Subtotal",
    deposit: "70% Deposit",
    balance: "30% Upon Collection",
    submitting: "Submitting...",
    submit: "Submit Order",
  },
};

function readCart(): CartStoredItem[] {
  try {
    const items = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]") as CartStoredItem[];
    return items.filter((item) => item.productId !== CUSTOM_BLEND_PRODUCT_ID || item.customQuote);
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const { language } = useLanguagePreference();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartStoredItem[]>([]);
  const [gstRate, setGstRate] = useState<0 | 9>(0);
  const [depositRequired, setDepositRequired] = useState(true);
  const t = copy[language];

  useEffect(() => {
    setCartItems(readCart());
  }, []);

  const customTotals = useMemo(() => {
    const customSubtotal = cartItems.reduce((sum, item) => {
      if (!item.customQuote) return sum;
      return sum + calculateCustomLineTotalCents(item.quantity, item.customQuote);
    }, 0);
    return {
      customSubtotal,
      deposit: depositRequired ? calculateDepositCents(customSubtotal) : 0,
      balance: depositRequired ? calculateBalanceCents(customSubtotal) : customSubtotal,
    };
  }, [cartItems, depositRequired]);

  async function submit(formData: FormData) {
    setError("");
    setLoading(true);
    const items = readCart();
    if (items.length === 0) {
      setError(t.emptyCart);
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
        gstRate,
        depositRequired,
        items,
      }),
    });

    setLoading(false);
    if (!response.ok) {
      setError(t.submitFailed);
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
          <h1>{t.title}</h1>
          <p>{t.body}</p>
        </div>
        <Link className="cart-link" href="/">
          <House size={18} />
          {t.home}
        </Link>
      </header>

      <form className="checkout-form" action={submit}>
        <label>
          {t.name}
          <input name="customerName" required />
        </label>
        <label>
          {t.phone}
          <input name="customerPhone" required />
        </label>
        <label>
          {t.deliveryMethod}
          <select name="deliveryMethod" required defaultValue="third-party">
            {DELIVERY_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {language === "en" ? method.en : `${method.zh} / ${method.en}`}
              </option>
            ))}
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
          Custom Blend deposit
          <select
            value={depositRequired ? "new" : "repeat"}
            onChange={(event) => setDepositRequired(event.target.value === "new")}
          >
            <option value="new">New customer: 70% deposit</option>
            <option value="repeat">Repeat customer: deposit waived</option>
          </select>
        </label>
        <label>
          {t.deliveryNote}
          <textarea name="deliveryNote" rows={3} placeholder={t.deliveryPlaceholder} />
        </label>
        <label>
          {t.orderNote}
          <textarea name="customerNote" rows={4} placeholder={t.orderPlaceholder} />
        </label>
        <div className="summary-box">
          <p><span>GST</span><strong>{gstRate}%</strong></p>
          {customTotals.customSubtotal > 0 && (
            <>
              <p><span>{t.customSubtotal}</span><strong>{formatMoney(customTotals.customSubtotal)}</strong></p>
              <p><span>{t.deposit}</span><strong>{formatMoney(customTotals.deposit)}</strong></p>
              <p><span>{t.balance}</span><strong>{formatMoney(customTotals.balance)}</strong></p>
            </>
          )}
          <p><span>{t.deliveryFee}</span><strong>{t.deliveryFeeValue}</strong></p>
          <p><span>{t.payment}</span><strong>{t.paymentValue}</strong></p>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="checkout-button" type="submit" disabled={loading}>
          {loading ? t.submitting : t.submit}
        </button>
      </form>
    </main>
  );
}
