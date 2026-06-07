"use client";

import { AdminLogoutButton } from "@/app/admin/AdminLogoutButton";
import { useLanguagePreference } from "@/lib/language";
import { formatMoney } from "@/lib/money";
import Link from "next/link";
import { useEffect, useState } from "react";

type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod: string;
  status: string;
  subtotalCents: number;
  gstCents: number;
  deliveryFeeCents: number | null;
  finalTotalCents: number | null;
  hasQuoteItems: boolean;
  createdAt: string;
};

export default function AdminOrdersPage() {
  const { language } = useLanguagePreference();
  const navCopy = language === "zh"
    ? { customers: "客户资料", products: "产品库存" }
    : { customers: "Customers", products: "Products & Stock" };
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  async function load() {
    const response = await fetch("/api/admin/orders");
    if (response.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    setOrders(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteCancelledOrder(order: AdminOrder) {
    const ok = window.confirm(`Delete cancelled order ${order.orderNumber} permanently?`);
    if (!ok) return;
    const response = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      window.alert(data?.error || "Order delete failed");
      return;
    }
    load();
  }

  return (
    <main className="shop-page">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Hermes Admin</p>
          <h1>订单管理</h1>
        </div>
        <div className="shop-actions">
          <AdminLogoutButton />
          <Link className="cart-link" href="/admin/customers">{navCopy.customers}</Link>
          <Link className="cart-link" href="/admin/products">{navCopy.products}</Link>
        </div>
      </header>

      <section className="admin-list">
        {orders.map((order) => (
          <article className="admin-row" key={order.id}>
          <Link className="admin-row-main" href={`/admin/orders/${order.id}`}>
            <div>
              <h2>{order.orderNumber}</h2>
              <p>{order.customerName} · {order.customerPhone}</p>
              <p>{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <strong>{order.status}</strong>
            <span>{order.hasQuoteItems ? "待确认" : formatMoney(order.finalTotalCents ?? order.subtotalCents + order.gstCents)}</span>
          </Link>
          {order.status === "cancelled" && (
            <button className="danger-button" type="button" onClick={() => deleteCancelledOrder(order)}>
              删除
            </button>
          )}
          </article>
        ))}
      </section>
    </main>
  );
}
