"use client";

import { formatMoney } from "@/lib/money";
import type { CartStoredItem, PublicProduct } from "@/lib/types";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const CART_KEY = "beauty_boat_cart";

function readCart(): CartStoredItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeCart(items: CartStoredItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export default function ProductsPage() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(setProducts);
    setCartCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
  }, []);

  function addToCart(product: PublicProduct) {
    const cart = readCart();
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ productId: product.id, quantity: 1 });
    }
    writeCart(cart);
    setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
  }

  return (
    <main className="shop-page">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Hermes Order</p>
          <h1>产品订购</h1>
          <p>固定价格商品可预估金额；客制粉料会由店家通过 WhatsApp text/电话确认报价。</p>
        </div>
        <Link className="cart-link" href="/cart">
          <ShoppingCart size={18} />
          购物车 {cartCount}
        </Link>
      </header>

      <section className="shop-grid">
        {products.map((product) => (
          <article className="shop-card" key={product.id}>
            {product.image && <img src={product.image} alt={product.nameZh} />}
            <div>
              <span>{product.nameEn}</span>
              <h2>{product.nameZh}</h2>
              <p>{product.description}</p>
              <dl>
                <div>
                  <dt>单位</dt>
                  <dd>{product.unit}</dd>
                </div>
                <div>
                  <dt>库存</dt>
                  <dd>{product.quoteOnly ? "需确认" : product.stock}</dd>
                </div>
                <div>
                  <dt>价格</dt>
                  <dd>{product.quoteOnly ? "询价" : formatMoney(product.priceCents)}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => addToCart(product)}
                disabled={!product.quoteOnly && product.stock <= 0}
              >
                加入购物车
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
