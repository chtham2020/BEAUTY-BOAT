"use client";

import { useLanguagePreference } from "@/lib/language";
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

const copy = {
  zh: {
    eyebrow: "Hermes 后台",
    title: "客户资料",
    body: "Bill To 客户名单，用于重复订单和沽单 / Cash Sale invoice。客户下单后会自动保存姓名、电话 / WhatsApp 和地址备注。",
    orders: "订单",
    products: "产品库存",
    noEnglishName: "没有英文名",
    noPhone: "没有电话",
    orderCount: "笔订单",
    edit: "编辑",
    disable: "停用",
    enable: "启用",
    editCustomer: "编辑客户",
    newCustomer: "新增客户",
    nameZh: "中文 / 公司名称",
    nameEn: "英文名",
    address1: "地址 1",
    address2: "地址 2",
    postalCode: "Postal code",
    phone: "电话 / WhatsApp",
    email: "Email",
    notes: "备注",
    saveCustomer: "保存客户",
    addCustomer: "新增客户",
    cancelEdit: "取消编辑",
    switchLabel: "Switch to English",
  },
  en: {
    eyebrow: "Hermes Admin",
    title: "Customer Records",
    body: "Bill To customer list for repeat orders and Cash Sale invoices. New orders automatically save customer name, phone / WhatsApp, and address notes.",
    orders: "Orders",
    products: "Products",
    noEnglishName: "No English name",
    noPhone: "No phone",
    orderCount: "orders",
    edit: "Edit",
    disable: "Disable",
    enable: "Enable",
    editCustomer: "Edit Customer",
    newCustomer: "New Customer",
    nameZh: "Chinese / Company Name",
    nameEn: "English Name",
    address1: "Address 1",
    address2: "Address 2",
    postalCode: "Postal code",
    phone: "Phone / WhatsApp",
    email: "Email",
    notes: "Notes",
    saveCustomer: "Save Customer",
    addCustomer: "Add Customer",
    cancelEdit: "Cancel Edit",
    switchLabel: "切换到中文",
  },
};

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function AdminCustomersPage() {
  const { language, setLanguage } = useLanguagePreference();
  const otherLanguage = language === "zh" ? "en" : "zh";
  const t = copy[language];
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
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
        </div>
        <div className="shop-actions">
          <button
            className="language-toggle admin-language-toggle"
            type="button"
            onClick={() => setLanguage(otherLanguage)}
            aria-label={t.switchLabel}
          >
            <span className={language === "zh" ? "is-active" : ""}>中文</span>
            <span className={language === "en" ? "is-active" : ""}>EN</span>
          </button>
          <Link className="cart-link" href="/admin/orders">{t.orders}</Link>
          <Link className="cart-link" href="/admin/products">{t.products}</Link>
        </div>
      </header>

      <section className="admin-layout">
        <div className="admin-list">
          {customers.map((customer) => (
            <article className="admin-row customer-row" key={customer.id}>
              <div>
                <h2>{language === "en" ? customer.nameEn || customer.nameZh : customer.nameZh}</h2>
                <p>{customer.nameEn || t.noEnglishName}</p>
                <p>{[customer.addressLine1, customer.addressLine2, customer.postalCode].filter(Boolean).join(", ")}</p>
                <p>{customer.phone || t.noPhone} · {customer._count?.orders ?? 0} {t.orderCount}</p>
              </div>
              <button type="button" onClick={() => startEdit(customer)}>{t.edit}</button>
              <button type="button" onClick={() => toggleActive(customer)}>
                {customer.active ? t.disable : t.enable}
              </button>
            </article>
          ))}
        </div>

        <form className="checkout-form" action={saveCustomer}>
          <h2>{editingId ? t.editCustomer : t.newCustomer}</h2>
          <label>{t.nameZh}<input value={form.nameZh} onChange={(event) => setForm({ ...form, nameZh: event.target.value })} required /></label>
          <label>{t.nameEn}<input value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} /></label>
          <label>{t.address1}<input value={form.addressLine1} onChange={(event) => setForm({ ...form, addressLine1: event.target.value })} /></label>
          <label>{t.address2}<input value={form.addressLine2} onChange={(event) => setForm({ ...form, addressLine2: event.target.value })} /></label>
          <label>{t.postalCode}<input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} /></label>
          <label>{t.phone}<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>{t.email}<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>{t.notes}<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          <button className="checkout-button" type="submit">{editingId ? t.saveCustomer : t.addCustomer}</button>
          {editingId && (
            <button
              className="cart-link"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              {t.cancelEdit}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
