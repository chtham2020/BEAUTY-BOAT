"use client";

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
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  useEffect(() => {
    fetch("/api/admin/orders").then(async (response) => {
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      setOrders(await response.json());
    });
  }, []);

  return (
    <main className="shop-page">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Hermes Admin</p>
          <h1>订单管理</h1>
        </div>
        <Link className="cart-link" href="/admin/products">产品库存</Link>
      </header>

      <section className="admin-list">
        {orders.map((order) => (
          <Link className="admin-row" href={`/admin/orders/${order.id}`} key={order.id}>
            <div>
              <h2>{order.orderNumber}</h2>
              <p>{order.customerName} · {order.customerPhone}</p>
              <p>{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <strong>{order.status}</strong>
            <span>{order.hasQuoteItems ? "待确认" : formatMoney(order.finalTotalCents ?? order.subtotalCents + order.gstCents)}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
