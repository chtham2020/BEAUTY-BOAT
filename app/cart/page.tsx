"use client";

import { calculateGst, formatMoney } from "@/lib/money";
import type { CartItem, CartStoredItem, CustomQuotePublicSnapshot, PublicProduct } from "@/lib/types";
import { useLanguagePreference } from "@/lib/language";
import {
  CUSTOM_BLEND_PRODUCT_ID,
  calculateBalanceCents,
  calculateDepositCents,
  customCartKey,
  getCustomBlendWeightJin,
} from "@/lib/custom-pricing";
import { House, Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MobileBottomTabs } from "../MobileBottomTabs";

const CART_KEY = "beauty_boat_cart";

const copy = {
  zh: {
    title: "購物車",
    body: "運輸費另計；Lalamove/Grab 費用或自費領取安排會由店家確認。",
    home: "主頁",
    continueShopping: "繼續選購",
    empty: "購物車目前是空的。",
    quote: "詢價",
    remove: "刪除",
    summary: "金額摘要",
    subtotal: "商品小計",
    deliveryFee: "運輸費",
    separate: "另計",
    estimatedTotal: "預計合計",
    finalPending: "最終金額待確認",
    vendorCode: "客户代码",
    price: "價格",
    ingredients: "材料",
    heatTreatment: "热处理",
    processSpec: "烘焙 / 研磨规格",
    minimumQuantity: "最低数量",
    privacyNote: "配方资料已由福安后台保存，公开网页不会显示配方细节。",
    totalWeight: "總重量",
    grindingCost: "研磨费",
    deposit: "70% 订金",
    balance: "取货付余额",
    customSubtotal: "客制粉料小计",
    recipePending: "最终金额待店家报价确认",
    checkout: "前往結帳",
  },
  en: {
    title: "Shopping Cart",
    body: "Delivery fee is quoted separately. Lalamove/Grab delivery or self-pickup arrangements will be confirmed by the shop.",
    home: "Home",
    continueShopping: "Continue Shopping",
    empty: "Your shopping cart is empty.",
    quote: "Quote",
    remove: "Remove",
    summary: "Amount Summary",
    subtotal: "Subtotal",
    deliveryFee: "Delivery Fee",
    separate: "Separate quote",
    estimatedTotal: "Estimated Total",
    finalPending: "Final amount pending",
    vendorCode: "Vendor Code",
    price: "Price",
    ingredients: "Ingredients",
    heatTreatment: "Heat Treatment",
    processSpec: "Baking / Grinding Spec",
    minimumQuantity: "Minimum Quantity",
    privacyNote: "Blend formula is kept on file and visible only to FOOK ON backend.",
    totalWeight: "Total Weight",
    grindingCost: "Grinding Cost",
    deposit: "70% Deposit",
    balance: "30% Upon Collection",
    customSubtotal: "Custom Blend Subtotal",
    recipePending: "Final amount pending shop quotation",
    checkout: "Checkout",
  },
};

function readCart(): CartStoredItem[] {
  try {
    const items = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]") as CartStoredItem[];
    return items.filter((item) => item.productId !== CUSTOM_BLEND_PRODUCT_ID || item.customQuote || item.customRecipe);
  } catch {
    return [];
  }
}

function saveCart(items: CartStoredItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function storedItems(items: CartItem[]): CartStoredItem[] {
  return items.map(({ productId, quantity, customQuote, customRecipe }) => ({
    productId,
    quantity,
    customQuote,
    customRecipe,
  }));
}

function displayUnit(unit: string, language: "zh" | "en") {
  if (language === "en") {
    if (unit === "按需求" || unit === "æŒ‰éœ€æ±‚") return "By request";
    if (unit === "斤" || unit === "æ–¤") return "jin";
  }
  return unit;
}

function formatRepeatQuoteQuantity(quote: CustomQuotePublicSnapshot, quantity: number, language: "zh" | "en") {
  const weightJin = getCustomBlendWeightJin(quantity, quote);
  return language === "en" ? `${weightJin} jin total, 1 jin = 600g` : `${weightJin}斤（1斤 = 600g）`;
}

export default function CartPage() {
  const { language } = useLanguagePreference();
  const [items, setItems] = useState<CartItem[]>([]);
  const t = copy[language];

  useEffect(() => {
    async function load() {
      const stored = readCart();
      const products: PublicProduct[] = await fetch("/api/products").then((res) => res.json());
      const nextItems =
        stored
          .map((item) => {
            const product = products.find((entry) => entry.id === item.productId);
            return product ? { ...item, product } : null;
          })
          .filter(Boolean) as CartItem[];
      setItems(nextItems);
      saveCart(storedItems(nextItems));
    }
    load();
  }, []);

  function updateQuantity(itemKey: string, quantity: number) {
    const current = items.find((item) => customCartKey(item.productId, item.customQuote?.vendorCode, item.customRecipe?.recipeId) === itemKey);
    const minimum = current?.customQuote
      ? getCustomBlendWeightJin(current.customQuote.minimumQuantityJin ?? current.customQuote.minimumQuantityKg, current.customQuote)
      : current?.customRecipe
        ? current.customRecipe.totalWeightJin
        : 1;
    const next = items
      .map((item) =>
        customCartKey(item.productId, item.customQuote?.vendorCode, item.customRecipe?.recipeId) === itemKey
          ? { ...item, quantity: Math.max(minimum, quantity) }
          : item,
      )
      .filter((item) => item.quantity > 0);
    setItems(next);
    saveCart(storedItems(next));
  }

  function remove(itemKey: string) {
    const next = items.filter((item) => customCartKey(item.productId, item.customQuote?.vendorCode, item.customRecipe?.recipeId) !== itemKey);
    setItems(next);
    saveCart(storedItems(next));
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      if (item.customQuote) return sum;
      if (item.customRecipe || item.product.quoteOnly || item.product.priceCents == null) return sum;
      return sum + item.product.priceCents * item.quantity;
    }, 0);
    const customSubtotal = 0;
    return {
      subtotal,
      gst: calculateGst(subtotal),
      customSubtotal,
      deposit: calculateDepositCents(customSubtotal),
      balance: calculateBalanceCents(customSubtotal),
      hasQuote: items.some((item) => item.customQuote || item.customRecipe || (item.product.quoteOnly || item.product.priceCents == null)),
    };
  }, [items]);

  return (
    <main className="shop-page">
      <header className="shop-header">
        <div>
          <p className="eyebrow">Cart</p>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
        </div>
        <div className="shop-actions">
          <Link className="cart-link" href="/">
            <House size={18} />
            {t.home}
          </Link>
          <Link className="cart-link" href="/products">
            {t.continueShopping}
          </Link>
        </div>
      </header>

      <section className="cart-layout">
        <div className="cart-lines">
          {items.length === 0 && <p>{t.empty}</p>}
          {items.map((item) => {
            const itemKey = customCartKey(item.productId, item.customQuote?.vendorCode, item.customRecipe?.recipeId);
            const minimum = item.customQuote
              ? getCustomBlendWeightJin(item.customQuote.minimumQuantityJin ?? item.customQuote.minimumQuantityKg, item.customQuote)
              : item.customRecipe
                ? item.customRecipe.totalWeightJin
                : 1;
            const step = item.customQuote || item.customRecipe ? 0.5 : 1;
            return (
              <article className="cart-line" key={itemKey}>
                <div>
                  <h2>{language === "en" ? item.product.nameEn : item.product.nameZh}</h2>
                  <p>{language === "en" ? item.product.nameZh : item.product.nameEn} · {displayUnit(item.product.unit, language)}</p>
                  <strong>
                    {item.customQuote
                      ? t.recipePending
                      : item.customRecipe
                        ? t.recipePending
                        : item.product.quoteOnly
                          ? t.quote
                          : formatMoney(item.product.priceCents)}
                  </strong>
                  {item.customQuote && (
                    <div className="custom-cart-details">
                      <p><span>{t.vendorCode}</span><b>{item.customQuote.vendorCode}</b></p>
                      <p><span>{t.minimumQuantity}</span><b>{formatRepeatQuoteQuantity(item.customQuote, item.quantity, language)}</b></p>
                      <p><span>{t.price}</span><b>{t.recipePending}</b></p>
                      <p className="form-hint">{t.privacyNote}</p>
                    </div>
                  )}
                  {item.customRecipe && (
                    <div className="custom-cart-details">
                      <p><span>{t.vendorCode}</span><b>New customer recipe</b></p>
                      <p><span>{t.ingredients}</span><b>{item.customRecipe.ingredients.join(", ")}</b></p>
                      <div className="ingredient-line-table">
                        {item.customRecipe.ingredientLines.map((ingredient, index) => (
                          <p key={`${ingredient.name}-${index}`}>
                            <span>{ingredient.name}</span>
                            <b>{ingredient.quantityJin}斤</b>
                          </p>
                        ))}
                        <p className="ingredient-total-row">
                          <span>{t.totalWeight}</span>
                          <b>{item.customRecipe.totalWeightJin}斤 / {(item.customRecipe.totalWeightJin * 0.6).toFixed(1)}kg</b>
                        </p>
                      </div>
                      <p><span>{t.price}</span><b>{t.recipePending}</b></p>
                      <p><span>{t.deposit}</span><b>{t.recipePending}</b></p>
                    </div>
                  )}
                </div>
                <div className="quantity-stepper" aria-label="Quantity controls">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={Boolean(item.customRecipe) || item.quantity <= minimum}
                    onClick={() => updateQuantity(itemKey, item.quantity - step)}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={minimum}
                    step={step}
                    value={item.quantity}
                    disabled={Boolean(item.customRecipe)}
                    onChange={(event) => updateQuantity(itemKey, Number(event.target.value))}
                  />
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={Boolean(item.customRecipe)}
                    onClick={() => updateQuantity(itemKey, item.quantity + step)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button className="remove-line-button" type="button" onClick={() => remove(itemKey)}>
                  <Trash2 size={16} aria-hidden="true" />
                  {t.remove}
                </button>
              </article>
            );
          })}
        </div>
        <aside className="summary-box">
          <h2>{t.summary}</h2>
          <p><span>{t.subtotal}</span><strong>{formatMoney(totals.subtotal)}</strong></p>
          <p><span>GST 9%</span><strong>{formatMoney(totals.gst)}</strong></p>
          {totals.customSubtotal > 0 && (
            <>
              <p><span>{t.customSubtotal}</span><strong>{formatMoney(totals.customSubtotal)}</strong></p>
              <p><span>{t.deposit}</span><strong>{formatMoney(totals.deposit)}</strong></p>
              <p><span>{t.balance}</span><strong>{formatMoney(totals.balance)}</strong></p>
            </>
          )}
          <p><span>{t.deliveryFee}</span><strong>{t.separate}</strong></p>
          <p><span>{t.estimatedTotal}</span><strong>{totals.hasQuote ? t.finalPending : formatMoney(totals.subtotal + totals.gst)}</strong></p>
          <Link className="checkout-button" href="/checkout" aria-disabled={items.length === 0}>
            {t.checkout}
          </Link>
        </aside>
      </section>
      <MobileBottomTabs active="cart" />
    </main>
  );
}
