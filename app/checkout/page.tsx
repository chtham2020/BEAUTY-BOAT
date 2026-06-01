"use client";

import { DELIVERY_METHODS, type CartStoredItem } from "@/lib/types";
import { useLanguagePreference } from "@/lib/language";
import {
  calculateBalanceCents,
  calculateDepositCents,
  hasNewCustomRecipe,
} from "@/lib/custom-pricing";
import { formatMoney } from "@/lib/money";
import { House } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MobileBottomTabs } from "../MobileBottomTabs";

const CART_KEY = "beauty_boat_cart";

const copy = {
  zh: {
    title: "提交訂單",
    body: "店家會通過 WhatsApp text 或電話跟進最終報價、運輸費和 PayNow 付款。",
    home: "主頁",
    emptyCart: "購物車是空的。",
    submitFailed: "訂單提交失敗，請檢查資料或稍後再試。",
    name: "姓名或公司名稱",
    phone: "電話 / WhatsApp",
    deliveryMethod: "運輸方式",
    deliveryNote: "地址 / 取貨 / 配送備註",
    deliveryPlaceholder: "新客客製粉料請填地址或取貨安排；例如下午送達或預約自取時間",
    orderNote: "訂單備註",
    orderPlaceholder: "例如：客製粉料用途、口味方向、包裝需求",
    deliveryFee: "運輸費",
    deliveryFeeValue: "Lalamove/Grab 运费另计，自费领取可为 0",
    payment: "付款",
    paymentValue: "店家確認後 PayNow",
    customSubtotal: "客制粉料小计",
    deposit: "70% 订金",
    balance: "取货付余额",
    repeatCustomBlend: "重复客制粉料",
    newCustomBlend: "新客客制粉料",
    recipePending: "新客客制粉料待店家报价；确认报价后需付 70% 订金。",
    repeatPending: "重复客制粉料已验证；配方和最终金额只保存在福安后台。",
    submitting: "提交中...",
    submit: "提交訂單",
  },
  en: {
    title: "Submit Order",
    body: "The shop will follow up by WhatsApp text or phone to confirm the final quote, delivery fee, and PayNow payment.",
    home: "Home",
    emptyCart: "Shopping Cart is empty.",
    submitFailed: "Order submission failed. Please check your details or try again later.",
    name: "Name or Company Name",
    phone: "Phone / WhatsApp",
    deliveryMethod: "Delivery Method",
    deliveryNote: "Address / Pickup / Delivery Note",
    deliveryPlaceholder: "For new custom blends, provide address or pickup arrangement. Example: afternoon delivery preferred.",
    orderNote: "Order Note",
    orderPlaceholder: "Example: custom blend use, flavour direction, packing request",
    deliveryFee: "Delivery Fee",
    deliveryFeeValue: "Lalamove/Grab quoted separately. Self pickup can be 0.",
    payment: "Payment",
    paymentValue: "PayNow after shop confirmation",
    customSubtotal: "Custom Blend Subtotal",
    deposit: "70% Deposit",
    balance: "30% Upon Collection",
    repeatCustomBlend: "Repeat Custom Blend",
    newCustomBlend: "New Custom Blend",
    recipePending: "New custom blend quotation pending. 70% deposit is required after quote confirmation.",
    repeatPending: "Repeat custom blend verified. Formula and final amount stay in FOOK ON backend.",
    submitting: "Submitting...",
    submit: "Submit Order",
  },
};

function readCart(): CartStoredItem[] {
  try {
    const items = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]") as CartStoredItem[];
    return items.filter((item) => item.customQuote || item.customRecipe || item.productId !== "custom-blend");
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
  const t = copy[language];

  useEffect(() => {
    const items = readCart();
    setCartItems(items);
  }, []);

  const customTotals = useMemo(() => {
    const customSubtotal = 0;
    return {
      customSubtotal,
      deposit: customSubtotal > 0 ? calculateDepositCents(customSubtotal) : 0,
      balance: customSubtotal > 0 ? calculateBalanceCents(customSubtotal) : 0,
      hasNewRecipe: hasNewCustomRecipe(cartItems),
      hasRepeatQuote: cartItems.some((item) => Boolean(item.customQuote)),
    };
  }, [cartItems]);

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
        depositRequired: customTotals.hasNewRecipe,
        items,
      }),
    });

    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error || t.submitFailed);
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

      <form className="checkout-form mobile-sticky-form" action={submit}>
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
          <select name="deliveryMethod" required defaultValue="self-pickup">
            {DELIVERY_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {language === "en" ? method.en : method.zh}
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
          {t.deliveryNote}
          <textarea name="deliveryNote" rows={3} placeholder={t.deliveryPlaceholder} required={customTotals.hasNewRecipe} />
        </label>
        <label>
          {t.orderNote}
          <textarea name="customerNote" rows={4} placeholder={t.orderPlaceholder} />
        </label>
        <div className="summary-box">
          <p><span>GST</span><strong>{gstRate}%</strong></p>
          {customTotals.hasRepeatQuote && <p><span>{t.repeatCustomBlend}</span><strong>{t.repeatPending}</strong></p>}
          {customTotals.hasNewRecipe && <p><span>{t.newCustomBlend}</span><strong>{t.recipePending}</strong></p>}
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
        <button className="checkout-button mobile-sticky-submit" type="submit" disabled={loading}>
          {loading ? t.submitting : t.submit}
        </button>
      </form>
      <MobileBottomTabs active="checkout" />
    </main>
  );
}
