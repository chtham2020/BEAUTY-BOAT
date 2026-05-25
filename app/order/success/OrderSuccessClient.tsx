"use client";

import { useLanguagePreference } from "@/lib/language";
import Link from "next/link";

const copy = {
  zh: {
    eyebrow: "Order Received",
    title: "订单已提交",
    orderNumber: "订单编号",
    pending: "待生成",
    body: "店家会通过 WhatsApp text 或电话跟进最终报价、运输费、取货/配送安排和 PayNow 付款。",
    home: "主页",
    products: "返回产品",
  },
  en: {
    eyebrow: "Order Received",
    title: "Order Submitted",
    orderNumber: "Order Number",
    pending: "Pending",
    body: "The shop will follow up by WhatsApp text or phone to confirm the final quote, delivery fee, pickup/delivery arrangement, and PayNow payment.",
    home: "Home",
    products: "Back to Products",
  },
};

export function OrderSuccessClient({ order }: { order?: string }) {
  const { language } = useLanguagePreference();
  const t = copy[language];

  return (
    <section className="success-panel">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1>{t.title}</h1>
      <p>
        {t.orderNumber}: <strong>{order || t.pending}</strong>
      </p>
      <p>{t.body}</p>
      <div className="shop-actions">
        <Link className="cart-link" href="/">
          {t.home}
        </Link>
        <Link className="checkout-button" href="/products">
          {t.products}
        </Link>
      </div>
    </section>
  );
}
