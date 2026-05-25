"use client";

import { calculateGst, formatMoney } from "@/lib/money";
import type { CartItem, CartStoredItem, PublicProduct } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CART_KEY = "beauty_boat_cart";

function readCart(): CartStoredItem[] {
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCart(items: CartStoredItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    async function load() {
      const stored = readCart();
      const products: PublicProduct[] = await fetch("/api/products").then((res) => res.json());
      setItems(
        stored
          .map((item) => {
            const product = products.find((entry) => entry.id === item.productId);
            return product ? { ...item, product } : null;
          })
          .filter(Boolean) as CartItem[],
      );
    }
    load();
  }, []);

  function updateQuantity(productId: string, quantity: number) {
    const next = items
      .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item))
      .filter((item) => item.quantity > 0);
    setItems(next);
    saveCart(next.map(({ productId, quantity }) => ({ productId, quantity })));
  }

  function remove(productId: string) {
    const next = items.filter((item) => item.productId !== productId);
    setItems(next);
    saveCart(next.map(({ productId, quantity }) => ({ productId, quantity })));
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      if (item.product.quoteOnly || item.product.priceCents == null) return sum;
      return sum + item.product.priceCents * item.quantity;
    }, 0);
    return {
      subtotal,
      gst: calculateGst(subtotal),
      hasQuote: items.some((item) => item.product.quoteOnly || item.product.priceCents == null),
    };
  }, [items]);

  return (
    <main className="shop-page">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Cart</p>
          <h1>购物车</h1>
          <p>运输费另计；Lalamove/Grab 费用或自费领取安排会由店家确认。</p>
        </div>
        <Link className="cart-link" href="/products">
          继续选购
        </Link>
      </header>

      <section className="cart-layout">
        <div className="cart-lines">
          {items.length === 0 && <p>购物车目前是空的。</p>}
          {items.map((item) => (
            <article className="cart-line" key={item.productId}>
              <div>
                <h2>{item.product.nameZh}</h2>
                <p>{item.product.nameEn} · {item.product.unit}</p>
                <strong>{item.product.quoteOnly ? "询价" : formatMoney(item.product.priceCents)}</strong>
              </div>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) => updateQuantity(item.productId, Number(event.target.value))}
              />
              <button type="button" onClick={() => remove(item.productId)}>
                删除
              </button>
            </article>
          ))}
        </div>
        <aside className="summary-box">
          <h2>金额摘要</h2>
          <p><span>商品小计</span><strong>{formatMoney(totals.subtotal)}</strong></p>
          <p><span>GST 9%</span><strong>{formatMoney(totals.gst)}</strong></p>
          <p><span>运输费</span><strong>另计</strong></p>
          <p><span>预计合计</span><strong>{totals.hasQuote ? "最终金额待确认" : formatMoney(totals.subtotal + totals.gst)}</strong></p>
          <Link className="checkout-button" href="/checkout" aria-disabled={items.length === 0}>
            前往结账
          </Link>
        </aside>
      </section>
    </main>
  );
}
