"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Customer = {
  id: string;
  nameZh: string;
  nameEn: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  _count?: { orders: number };
};

type CustomerForm = {
  nameZh: string;
  nameEn: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  phone: string;
  email: string;
  notes: string;
};

const emptyForm: CustomerForm = {
  nameZh: "",
  nameEn: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  phone: "",
  email: "",
  notes: "",
};

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/customers");
    if (response.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    setCustomers(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      nameZh: customer.nameZh,
      nameEn: customer.nameEn ?? "",
      addressLine1: customer.addressLine1 ?? "",
      addressLine2: customer.addressLine2 ?? "",
      postalCode: customer.postalCode ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      notes: customer.notes ?? "",
    });
  }

  async function saveCustomer() {
    const payload = {
      nameZh: form.nameZh.trim(),
      nameEn: clean(form.nameEn),
      addressLine1: clean(form.addressLine1),
      addressLine2: clean(form.addressLine2),
      postalCode: clean(form.postalCode),
      phone: clean(form.phone),
      email: clean(form.email),
      notes: clean(form.notes),
      active: true,
    };
    const url = editingId ? `/api/admin/customers/${editingId}` : "/api/admin/customers";
    await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setForm(emptyForm);
    setEditingId(null);
    load();
  }

  async function toggleActive(customer: Customer) {
    await fetch(`/api/admin/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !customer.active }),
    });
    load();
  }

  return (
    <main className="shop-page">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Hermes Admin</p>
          <h1>客户资料</h1>
          <p>Bill To 客户名单，用于重复订单和沽单 / Cash Sale invoice。</p>
        </div>
        <div className="shop-actions">
          <Link className="cart-link" href="/admin/orders">订单</Link>
          <Link className="cart-link" href="/admin/products">产品库存</Link>
        </div>
      </header>

      <section className="admin-layout">
        <div className="admin-list">
          {customers.map((customer) => (
            <article className="admin-row customer-row" key={customer.id}>
              <div>
                <h2>{customer.nameZh}</h2>
                <p>{customer.nameEn || "No English name"}</p>
                <p>{[customer.addressLine1, customer.addressLine2, customer.postalCode].filter(Boolean).join(", ")}</p>
                <p>{customer.phone || "No phone"} · {customer._count?.orders ?? 0} orders</p>
              </div>
              <button type="button" onClick={() => startEdit(customer)}>编辑</button>
              <button type="button" onClick={() => toggleActive(customer)}>
                {customer.active ? "停用" : "启用"}
              </button>
            </article>
          ))}
        </div>

        <form className="checkout-form" action={saveCustomer}>
          <h2>{editingId ? "编辑客户" : "新增客户"}</h2>
          <label>中文 / 公司名<input value={form.nameZh} onChange={(e) => setForm({ ...form, nameZh: e.target.value })} required /></label>
          <label>英文名<input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></label>
          <label>地址 1<input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} /></label>
          <label>地址 2<input value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} /></label>
          <label>Postal code<input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></label>
          <label>电话<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>备注<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <button className="checkout-button" type="submit">{editingId ? "保存客户" : "新增客户"}</button>
          {editingId && (
            <button
              className="cart-link"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              取消编辑
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
