"use client";

import { formatMoney } from "@/lib/money";
import type { PublicProduct } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

type ProductForm = {
  nameZh: string;
  nameEn: string;
  category: string;
  description: string;
  unit: string;
  image: string;
  price: string;
  quoteOnly: boolean;
  stock: number;
  active: boolean;
};

const emptyForm: ProductForm = {
  nameZh: "",
  nameEn: "",
  category: "spice-powder",
  description: "",
  unit: "500g",
  image: "",
  price: "",
  quoteOnly: false,
  stock: 0,
  active: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  async function load() {
    const response = await fetch("/api/admin/products");
    if (response.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    setProducts(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function createProduct() {
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameZh: form.nameZh,
        nameEn: form.nameEn,
        category: form.category,
        description: form.description,
        unit: form.unit,
        image: form.image || null,
        priceCents: form.quoteOnly || !form.price ? null : Math.round(Number(form.price) * 100),
        quoteOnly: form.quoteOnly,
        stock: Number(form.stock),
        active: form.active,
      }),
    });
    setForm(emptyForm);
    load();
  }

  async function updateProduct(product: PublicProduct, data: Partial<PublicProduct>) {
    await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  return (
    <main className="shop-page">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Hermes Admin</p>
          <h1>产品与库存</h1>
        </div>
        <Link className="cart-link" href="/admin/orders">查看订单</Link>
      </header>

      <section className="admin-layout">
        <div className="admin-list">
          {products.map((product) => (
            <article className="admin-row" key={product.id}>
              <div>
                <h2>{product.nameZh}</h2>
                <p>{product.nameEn} · {product.unit}</p>
                <p>{product.quoteOnly ? "询价" : formatMoney(product.priceCents)} · 库存 {product.stock}</p>
              </div>
              <button type="button" onClick={() => updateProduct(product, { active: !product.active })}>
                {product.active ? "下架" : "上架"}
              </button>
              <button type="button" onClick={() => updateProduct(product, { stock: product.stock + 1 })}>
                +库存
              </button>
              <button type="button" onClick={() => updateProduct(product, { stock: Math.max(0, product.stock - 1) })}>
                -库存
              </button>
            </article>
          ))}
        </div>

        <form className="checkout-form" action={createProduct}>
          <h2>新增产品</h2>
          <label>中文名<input value={form.nameZh} onChange={(e) => setForm({ ...form, nameZh: e.target.value })} required /></label>
          <label>英文名<input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} required /></label>
          <label>分类<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /></label>
          <label>说明<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
          <label>单位<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required /></label>
          <label>图片路径<input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></label>
          <label>价格 SGD<input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} disabled={form.quoteOnly} /></label>
          <label className="check-line"><input type="checkbox" checked={form.quoteOnly} onChange={(e) => setForm({ ...form, quoteOnly: e.target.checked })} /> 询价商品</label>
          <label>库存<input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></label>
          <button className="checkout-button" type="submit">新增</button>
        </form>
      </section>
    </main>
  );
}
