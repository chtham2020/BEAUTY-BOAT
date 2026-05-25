"use client";

import { formatMoney } from "@/lib/money";
import { CUSTOM_BLEND_PRODUCT_ID, calculateBalanceCents, calculateCustomLineTotalCents, calculateDepositCents, customCartKey } from "@/lib/custom-pricing";
import type { CartStoredItem, CustomQuoteSnapshot, PublicProduct } from "@/lib/types";
import { useLanguagePreference } from "@/lib/language";
import { Check, House, ShoppingCart, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const CART_KEY = "beauty_boat_cart";

const copy = {
  zh: {
    eyebrow: "Hermes Order",
    title: "产品订购",
    body: "固定价格商品可预估金额；客制粉料会由店家通过 WhatsApp text/电话确认报价。",
    home: "主页",
    cart: "购物车",
    inCartStatus: "已加入购物车，到 Shopping Cart 调整数量",
    unit: "单位",
    stock: "库存",
    price: "价格",
    quote: "询价",
    confirm: "需确认",
    vendorCode: "Vendor code",
    vendorPlaceholder: "Enter company vendor code",
    validateVendor: "Verify code",
    validating: "Checking...",
    invalidVendor: "Vendor code not found",
    quoteReady: "Quotation ready",
    ingredients: "Ingredients",
    heatTreatment: "Heat treatment",
    processSpec: "Baking / grinding spec",
    minimumQuantity: "Minimum quantity",
    grindingCost: "Grinding cost / 600g",
    deposit: "70% deposit",
    balance: "30% upon collection",
    addToCart: "加入购物车",
  },
  en: {
    eyebrow: "Order",
    title: "Order Products",
    body: "Fixed-price products show an estimated amount. Custom blends are quoted by WhatsApp text or phone.",
    home: "Home",
    cart: "Shopping Cart",
    inCartStatus: "Added to Shopping Cart. Change quantity there.",
    unit: "Unit",
    stock: "Stock",
    price: "Price",
    quote: "Quote",
    confirm: "Confirm",
    vendorCode: "Vendor Code",
    vendorPlaceholder: "Enter company vendor code",
    validateVendor: "Verify Code",
    validating: "Checking...",
    invalidVendor: "Vendor code not found",
    quoteReady: "Quotation Ready",
    ingredients: "Ingredients",
    heatTreatment: "Heat Treatment",
    processSpec: "Baking / Grinding Spec",
    minimumQuantity: "Minimum Quantity",
    grindingCost: "Grinding Cost / 600g",
    deposit: "70% Deposit",
    balance: "30% Upon Collection",
    addToCart: "Add to Shopping Cart",
  },
};

const englishDescriptions: Record<string, string> = {
  "five-spice-powder": "Traditional five-spice powder for braising, frying, marinating, and stewing.",
  "pepper-powder": "Clean peppery lift for soups, meats, cooked foods, and everyday seasoning.",
  "custom-blend": "Custom powder blends matched to usage, taste profile, and volume needs.",
};

function readCart(): CartStoredItem[] {
  if (typeof window === "undefined") return [];
  try {
    const items = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]") as CartStoredItem[];
    return items.filter((item) => item.productId !== CUSTOM_BLEND_PRODUCT_ID || item.customQuote);
  } catch {
    return [];
  }
}

function writeCart(items: CartStoredItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export default function ProductsPage() {
  const { language } = useLanguagePreference();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [selectedCartKeys, setSelectedCartKeys] = useState<string[]>([]);
  const [vendorCodes, setVendorCodes] = useState<Record<string, string>>({});
  const [vendorQuotes, setVendorQuotes] = useState<Record<string, CustomQuoteSnapshot>>({});
  const [vendorErrors, setVendorErrors] = useState<Record<string, string>>({});
  const [validatingCodes, setValidatingCodes] = useState<Record<string, boolean>>({});
  const t = copy[language];

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(setProducts);
    refreshCartState();

    window.addEventListener("focus", refreshCartState);
    window.addEventListener("pageshow", refreshCartState);
    return () => {
      window.removeEventListener("focus", refreshCartState);
      window.removeEventListener("pageshow", refreshCartState);
    };
  }, []);

  function refreshCartState() {
    const cart = readCart();
    setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    setSelectedCartKeys(cart.map((item) => customCartKey(item.productId, item.customQuote?.vendorCode)));
    for (const item of cart) {
      if (item.productId === CUSTOM_BLEND_PRODUCT_ID && item.customQuote) {
        setVendorCodes((current) => ({ ...current, [item.productId]: item.customQuote?.vendorCode ?? "" }));
        setVendorQuotes((current) => ({ ...current, [item.productId]: item.customQuote as CustomQuoteSnapshot }));
      }
    }
  }

  function toggleCartItem(product: PublicProduct, customQuote?: CustomQuoteSnapshot) {
    const cart = readCart();
    const key = customCartKey(product.id, customQuote?.vendorCode);
    const existing = cart.find((item) => customCartKey(item.productId, item.customQuote?.vendorCode) === key);
    const nextCart = existing
      ? cart.filter((item) => customCartKey(item.productId, item.customQuote?.vendorCode) !== key)
      : [...cart, { productId: product.id, quantity: customQuote?.minimumQuantityKg ?? 1, customQuote }];

    writeCart(nextCart);
    refreshCartState();
  }

  async function validateVendorCode(productId: string) {
    const vendorCode = (vendorCodes[productId] || "").trim();
    if (!vendorCode) {
      setVendorErrors((current) => ({ ...current, [productId]: t.invalidVendor }));
      setVendorQuotes((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
      return;
    }

    setValidatingCodes((current) => ({ ...current, [productId]: true }));
    setVendorErrors((current) => ({ ...current, [productId]: "" }));

    const response = await fetch("/api/vendor-quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, vendorCode }),
    });

    setValidatingCodes((current) => ({ ...current, [productId]: false }));
    if (!response.ok) {
      setVendorErrors((current) => ({ ...current, [productId]: t.invalidVendor }));
      setVendorQuotes((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
      return;
    }

    const quote: CustomQuoteSnapshot = await response.json();
    setVendorQuotes((current) => ({ ...current, [productId]: quote }));
    setVendorCodes((current) => ({ ...current, [productId]: quote.vendorCode }));
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
          <Link className="cart-link" href="/">
            <House size={18} />
            {t.home}
          </Link>
          <Link className="cart-link" href="/cart">
            <ShoppingCart size={18} />
            {t.cart} {cartCount}
          </Link>
        </div>
      </header>

      <section className="shop-grid">
        {products.map((product) => {
          const isCustomBlend = product.id === CUSTOM_BLEND_PRODUCT_ID;
          const quote = vendorQuotes[product.id];
          const cartKey = customCartKey(product.id, quote?.vendorCode);
          const isSelected = selectedCartKeys.includes(cartKey);
          const isUnavailable = !product.quoteOnly && product.stock <= 0;
          const isAddDisabled = isUnavailable || (isCustomBlend && !quote);
          const productName = language === "en" ? product.nameEn : product.nameZh;
          const supportName = language === "en" ? product.nameZh : product.nameEn;
          const description =
            language === "en" ? englishDescriptions[product.id] ?? product.description : product.description;
          const sampleLineTotal = quote ? calculateCustomLineTotalCents(quote.minimumQuantityKg, quote) : 0;

          return (
            <article className={`shop-card${isSelected ? " is-in-cart" : ""}`} key={product.id}>
              {product.image && <img src={product.image} alt={product.nameZh} />}
              <div>
                {isSelected && (
                  <span className="cart-status">
                    <Check size={14} aria-hidden="true" />
                    {t.inCartStatus}
                  </span>
                )}
                <span>{supportName}</span>
                <h2>{productName}</h2>
                <p>{description}</p>
                <dl>
                  <div>
                    <dt>{t.unit}</dt>
                    <dd>{product.unit}</dd>
                  </div>
                  <div>
                    <dt>{t.stock}</dt>
                    <dd>{product.quoteOnly ? t.confirm : product.stock}</dd>
                  </div>
                  <div>
                    <dt>{t.price}</dt>
                    <dd>{quote ? formatMoney(quote.unitPriceCents) : product.quoteOnly ? t.quote : formatMoney(product.priceCents)}</dd>
                  </div>
                </dl>
                {isCustomBlend && (
                  <div className="vendor-quote-box">
                    <label>
                      {t.vendorCode}
                      <input
                        value={vendorCodes[product.id] || ""}
                        onChange={(event) => {
                          setVendorCodes((current) => ({ ...current, [product.id]: event.target.value }));
                          setVendorQuotes((current) => {
                            const next = { ...current };
                            delete next[product.id];
                            return next;
                          });
                        }}
                        placeholder={t.vendorPlaceholder}
                      />
                    </label>
                    <button
                      className="quote-check-button"
                      type="button"
                      onClick={() => validateVendorCode(product.id)}
                      disabled={validatingCodes[product.id]}
                    >
                      {validatingCodes[product.id] ? t.validating : t.validateVendor}
                    </button>
                    {vendorErrors[product.id] && <p className="form-error">{vendorErrors[product.id]}</p>}
                    {quote && (
                      <div className="quote-panel">
                        <strong>{t.quoteReady}: {quote.vendorCode}</strong>
                        <p>{quote.vendorName} · {quote.blendType}</p>
                        <p><span>{t.ingredients}</span><b>{quote.ingredients.join(", ")}</b></p>
                        <p><span>{t.unit}</span><b>{quote.ingredientQuantity}</b></p>
                        <p><span>{t.heatTreatment}</span><b>{quote.heatTreatment}</b></p>
                        <p><span>{t.processSpec}</span><b>{quote.processSpec}</b></p>
                        <p><span>{t.minimumQuantity}</span><b>{quote.minimumQuantityKg}kg</b></p>
                        <p><span>{t.grindingCost}</span><b>{formatMoney(quote.grindingCostPer600gCents)}</b></p>
                        <p><span>{t.deposit}</span><b>{formatMoney(calculateDepositCents(sampleLineTotal))}</b></p>
                        <p><span>{t.balance}</span><b>{formatMoney(calculateBalanceCents(sampleLineTotal))}</b></p>
                      </div>
                    )}
                  </div>
                )}
                <button
                  className={isSelected ? "is-checked" : ""}
                  type="button"
                  onClick={() => toggleCartItem(product, isCustomBlend ? quote : undefined)}
                  disabled={isAddDisabled}
                  aria-pressed={isSelected}
                >
                  {isSelected ? (
                    <span className="checkbox-icon is-checked" aria-hidden="true">
                      <Check size={14} />
                    </span>
                  ) : (
                    <Square size={17} aria-hidden="true" />
                  )}
                  {t.addToCart}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
