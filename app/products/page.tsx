"use client";

import { formatMoney } from "@/lib/money";
import {
  CUSTOM_BLEND_MINIMUM_JIN,
  CUSTOM_BLEND_PRODUCT_ID,
  customCartKey,
  getCustomBlendWeightJin,
  getCustomRecipeWeightJin,
  hasNewCustomRecipe,
} from "@/lib/custom-pricing";
import type { CartStoredItem, CustomQuotePublicSnapshot, CustomRecipeSnapshot, PublicProduct } from "@/lib/types";
import { useLanguagePreference } from "@/lib/language";
import { MobileBottomTabs } from "../MobileBottomTabs";
import { Check, House, Plus, ShoppingCart, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CART_KEY = "beauty_boat_cart";

type RecipeDraftLine = {
  name: string;
  quantityJin: string;
  quantityUnit: "jin" | "g" | "kg";
};

type IngredientCatalogItem = {
  nameZh: string;
  nameEn: string;
};

const copy = {
  zh: {
    eyebrow: "Hermes 订购",
    title: "產品訂購",
    body: "固定價格商品可預估金額；客製粉料會由店家通過 WhatsApp text/電話確認報價。",
    home: "主頁",
    cart: "購物車",
    inCartStatus: "已加入购物车，请到购物车调整数量",
    unit: "單位",
    stock: "庫存",
    price: "價格",
    quote: "詢價",
    confirm: "需確認",
    repeatMode: "重复客户代码",
    newMode: "新客配方",
    vendorCode: "客户代码",
    vendorPlaceholder: "请输入客户代码",
    validateVendor: "验证代码",
    validating: "验证中...",
    invalidVendor: "找不到客户代码",
    quoteReady: "已验证报价",
    repeatVerified: "重复客制粉料已验证",
    ingredients: "材料",
    ingredientName: "材料名称",
    ingredientPlaceholder: "选择或输入材料",
    quantityJin: "数量（斤）",
    quantityUnit: "单位",
    grindMode: "需要研磨",
    sampleMode: "不研磨 / 试样配方",
    sampleHelp: "只提供配方给店家评估，可用 g 或 kg 填写材料数量；暂不受 10斤最低研磨量限制。",
    addRow: "新增一行",
    removeRow: "删除此行",
    recipeNote: "配方 / 包装备注",
    recipeNotePlaceholder: "研磨、包装、口味方向、配送备注",
    newRecipeHelp: "最低 10斤 / 6kg。新客客制粉料报价确认后需付 70% 订金。",
    belowMinimum: "最低订购量为 10斤 / 6kg。",
    exclusive: "新客客制粉料必须单独下单；加入后会取代购物车其他商品。",
    recipePending: "最终金额待店家报价确认",
    heatTreatment: "热处理",
    processSpec: "烘焙 / 研磨规格",
    minimumQuantity: "最低数量",
    privacyNote: "配方资料已由福安后台保存，公开网页不会显示配方细节。",
    totalWeight: "總重量",
    grindingCost: "研磨费 / 斤",
    deposit: "70% 订金",
    balance: "取货付余额",
    addToCart: "加入購物車",
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
    repeatMode: "Repeat vendor code",
    newMode: "New customer recipe",
    vendorCode: "Vendor Code",
    vendorPlaceholder: "Enter company vendor code",
    validateVendor: "Verify Code",
    validating: "Checking...",
    invalidVendor: "Vendor code not found",
    quoteReady: "Quotation Ready",
    repeatVerified: "Repeat custom blend verified",
    ingredients: "Ingredients",
    ingredientName: "Ingredient name",
    ingredientPlaceholder: "Select or type ingredient",
    quantityJin: "Quantity jin",
    quantityUnit: "Unit",
    grindMode: "Grinding order",
    sampleMode: "Not to grind / recipe sample",
    sampleHelp: "Recipe sample only. Use g or kg for ingredient quantities. No 10 jin minimum applies until grinding is requested.",
    addRow: "Add row",
    removeRow: "Remove row",
    recipeNote: "Recipe / packing notes",
    recipeNotePlaceholder: "Grinding, packing, taste direction, delivery notes",
    newRecipeHelp: "Minimum 10 jin / 6kg. New custom blend orders require 70% deposit after quotation.",
    belowMinimum: "Minimum order is 10 jin / 6kg.",
    exclusive: "New custom blend recipe must be ordered alone. Adding it will replace other cart items.",
    recipePending: "Final amount pending shop quotation",
    heatTreatment: "Heat Treatment",
    processSpec: "Baking / Grinding Spec",
    minimumQuantity: "Minimum Quantity",
    privacyNote: "Blend formula is kept on file and visible only to FOOK ON backend.",
    totalWeight: "Total Weight",
    grindingCost: "Grinding Cost / jin",
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

function displayUnit(unit: string, language: "zh" | "en") {
  if (language === "en") {
    if (unit === "按需求" || unit === "æŒ‰éœ€æ±‚") return "By request";
    if (unit === "斤" || unit === "æ–¤") return "jin";
  }
  return unit;
}

function readCart(): CartStoredItem[] {
  if (typeof window === "undefined") return [];
  try {
    const items = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]") as CartStoredItem[];
    return items.filter((item) => item.productId !== CUSTOM_BLEND_PRODUCT_ID || item.customQuote || item.customRecipe);
  } catch {
    return [];
  }
}

function writeCart(items: CartStoredItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function toJin(quantity: number, unit: RecipeDraftLine["quantityUnit"]) {
  if (unit === "kg") return quantity / 0.6;
  if (unit === "g") return quantity / 600;
  return quantity;
}

function formatRecipeQuantity(quantity: number, unit: RecipeDraftLine["quantityUnit"]) {
  if (unit === "kg") return `${quantity}kg`;
  if (unit === "g") return `${quantity}g`;
  return `${quantity}斤`;
}

function makeRecipeSnapshot(lines: RecipeDraftLine[], notes: string, noGrinding: boolean): CustomRecipeSnapshot {
  const ingredientLines = lines
    .map((line) => {
      const quantity = Number(line.quantityJin);
      return {
        name: line.name.trim(),
        quantity,
        unit: line.quantityUnit,
        quantityJin: toJin(quantity, line.quantityUnit),
      };
    })
    .filter((line) => line.name && line.quantityJin > 0);
  const totalWeightJin = ingredientLines.reduce((sum, line) => sum + line.quantityJin, 0);
  const ingredientQuantity = noGrinding
    ? ingredientLines.map((line) => `${line.name} ${formatRecipeQuantity(line.quantity ?? line.quantityJin, line.unit ?? "jin")}`).join("; ")
    : `${totalWeightJin}斤 total, 1斤 = 600g`;
  return {
    recipeId: `recipe-${Date.now()}`,
    customerType: "new",
    vendorName: "New customer recipe",
    blendType: noGrinding ? "Recipe sample test - not to grind" : "First-time custom blend",
    ingredientLines,
    ingredients: ingredientLines.map((line) => line.name),
    ingredientQuantity,
    totalWeightJin,
    totalWeightText: noGrinding ? ingredientQuantity : undefined,
    unit: noGrinding ? "recipe" : "斤",
    heatTreatment: noGrinding ? "Not to grind" : "Shop to confirm",
    processSpec: noGrinding ? "Recipe only / sample trial; no grinding requested" : "Shop to confirm",
    minimumQuantityJin: noGrinding ? 0 : CUSTOM_BLEND_MINIMUM_JIN,
    noGrinding,
    notes: notes.trim() || undefined,
  };
}

function formatRepeatQuoteQuantity(quote: CustomQuotePublicSnapshot, language: "zh" | "en") {
  const weightJin = getCustomBlendWeightJin(quote.minimumQuantityJin ?? quote.minimumQuantityKg, quote);
  return language === "en" ? `${weightJin} jin total, 1 jin = 600g` : `${weightJin}斤（1斤 = 600g）`;
}

export default function ProductsPage() {
  const { language } = useLanguagePreference();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [selectedCartKeys, setSelectedCartKeys] = useState<string[]>([]);
  const [cartHasNewRecipe, setCartHasNewRecipe] = useState(false);
  const [vendorCodes, setVendorCodes] = useState<Record<string, string>>({});
  const [vendorQuotes, setVendorQuotes] = useState<Record<string, CustomQuotePublicSnapshot>>({});
  const [vendorErrors, setVendorErrors] = useState<Record<string, string>>({});
  const [validatingCodes, setValidatingCodes] = useState<Record<string, boolean>>({});
  const [ingredientCatalog, setIngredientCatalog] = useState<IngredientCatalogItem[]>([]);
  const [customMode, setCustomMode] = useState<"repeat" | "new">("repeat");
  const [recipeNoGrinding, setRecipeNoGrinding] = useState(false);
  const [recipeLines, setRecipeLines] = useState<RecipeDraftLine[]>([
    { name: "", quantityJin: "", quantityUnit: "jin" },
    { name: "", quantityJin: "", quantityUnit: "jin" },
    { name: "", quantityJin: "", quantityUnit: "jin" },
  ]);
  const [recipeNotes, setRecipeNotes] = useState("");
  const t = copy[language];

  const recipeWeightJin = useMemo(
    () => recipeLines.reduce((sum, line) => sum + toJin(Number(line.quantityJin) || 0, line.quantityUnit), 0),
    [recipeLines],
  );

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(setProducts);
    fetch("/api/ingredients")
      .then((res) => res.json())
      .then(setIngredientCatalog)
      .catch(() => setIngredientCatalog([]));
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
    setCartHasNewRecipe(hasNewCustomRecipe(cart));
    setSelectedCartKeys(cart.map((item) => customCartKey(item.productId, item.customQuote?.vendorCode, item.customRecipe?.recipeId)));
    for (const item of cart) {
      const quote = item.customQuote;
      if (item.productId === CUSTOM_BLEND_PRODUCT_ID && quote) {
        setVendorCodes((current) => ({ ...current, [item.productId]: quote.vendorCode }));
        setVendorQuotes((current) => ({ ...current, [item.productId]: quote }));
      }
    }
  }

  function toggleCartItem(product: PublicProduct, customQuote?: CustomQuotePublicSnapshot) {
    const cart = readCart();
    const key = customCartKey(product.id, customQuote?.vendorCode);
    const existing = cart.find((item) => customCartKey(item.productId, item.customQuote?.vendorCode, item.customRecipe?.recipeId) === key);
    let nextCart: CartStoredItem[];

    if (existing) {
      nextCart = cart.filter((item) => customCartKey(item.productId, item.customQuote?.vendorCode, item.customRecipe?.recipeId) !== key);
    } else {
      const cleanCart = cart.filter((item) => !item.customRecipe);
      nextCart = [
        ...cleanCart,
        {
          productId: product.id,
          quantity: customQuote
            ? getCustomBlendWeightJin(customQuote.minimumQuantityJin ?? customQuote.minimumQuantityKg, customQuote)
            : 1,
          customQuote,
        },
      ];
    }

    writeCart(nextCart);
    refreshCartState();
  }

  function addNewRecipe(product: PublicProduct) {
    const recipe = makeRecipeSnapshot(recipeLines, recipeNotes, recipeNoGrinding);
    if (getCustomRecipeWeightJin(recipe) <= 0) return;
    if (!recipe.noGrinding && getCustomRecipeWeightJin(recipe) < CUSTOM_BLEND_MINIMUM_JIN) return;
    writeCart([{ productId: product.id, quantity: recipe.totalWeightJin, customRecipe: recipe }]);
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

    const quote: CustomQuotePublicSnapshot = await response.json();
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
          const isBlockedByNewRecipe = cartHasNewRecipe && !isCustomBlend;
          const isAddDisabled = isUnavailable || isBlockedByNewRecipe || (isCustomBlend && customMode === "repeat" && !quote);
          const productName = language === "en" ? product.nameEn : product.nameZh;
          const supportName = language === "en" ? product.nameZh : product.nameEn;
          const description =
            language === "en" ? englishDescriptions[product.id] ?? product.description : product.description;
          return (
            <article
              className={`shop-card${product.image ? " has-product-image" : ""}${isCustomBlend ? " is-custom-blend" : ""}${isSelected ? " is-in-cart" : ""}`}
              key={product.id}
            >
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
                    <dd>{displayUnit(product.unit, language)}</dd>
                  </div>
                  <div>
                    <dt>{t.stock}</dt>
                    <dd>{product.quoteOnly ? t.confirm : product.stock}</dd>
                  </div>
                  <div>
                    <dt>{t.price}</dt>
                    <dd>{quote ? t.recipePending : product.quoteOnly ? t.quote : formatMoney(product.priceCents)}</dd>
                  </div>
                </dl>
                {isCustomBlend && (
                  <div className="vendor-quote-box">
                    <div className="segmented-control">
                      <button
                        className={customMode === "repeat" ? "is-active" : ""}
                        type="button"
                        onClick={() => setCustomMode("repeat")}
                      >
                        {t.repeatMode}
                      </button>
                      <button
                        className={customMode === "new" ? "is-active" : ""}
                        type="button"
                        onClick={() => setCustomMode("new")}
                      >
                        {t.newMode}
                      </button>
                    </div>

                    {customMode === "repeat" ? (
                      <>
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
                      </>
                    ) : (
                      <div className="recipe-builder">
                        <p>{t.newRecipeHelp}</p>
                        <label className="check-line">
                          <input
                            type="checkbox"
                            checked={recipeNoGrinding}
                            onChange={(event) => setRecipeNoGrinding(event.target.checked)}
                          />
                          {recipeNoGrinding ? t.sampleMode : t.grindMode}
                        </label>
                        {recipeNoGrinding && <p className="form-hint">{t.sampleHelp}</p>}
                        <p className="form-hint">{t.exclusive}</p>
                        {recipeLines.map((line, index) => (
                          <div className="recipe-row" key={index}>
                            <input
                              aria-label={t.ingredientName}
                              list="custom-blend-ingredients"
                              value={line.name}
                              onChange={(event) =>
                                setRecipeLines((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, name: event.target.value } : entry,
                                  ),
                                )
                              }
                              placeholder={t.ingredientPlaceholder}
                            />
                            <input
                              aria-label={t.quantityJin}
                              type="number"
                              min="0"
                              step={line.quantityUnit === "g" ? "1" : "0.01"}
                              value={line.quantityJin}
                              onChange={(event) =>
                                setRecipeLines((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, quantityJin: event.target.value } : entry,
                                  ),
                                )
                              }
                              placeholder={recipeNoGrinding ? t.quantityUnit : t.quantityJin}
                            />
                            <select
                              aria-label={t.quantityUnit}
                              value={recipeNoGrinding ? line.quantityUnit : "jin"}
                              disabled={!recipeNoGrinding}
                              onChange={(event) =>
                                setRecipeLines((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index
                                      ? { ...entry, quantityUnit: event.target.value as RecipeDraftLine["quantityUnit"] }
                                      : entry,
                                  ),
                                )
                              }
                            >
                              <option value="jin">斤</option>
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                            </select>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={t.removeRow}
                              onClick={() => setRecipeLines((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <datalist id="custom-blend-ingredients">
                          {ingredientCatalog.map((ingredient) => (
                            <option
                              key={`${ingredient.nameZh}-${ingredient.nameEn}`}
                              value={ingredient.nameZh}
                              label={ingredient.nameEn}
                            />
                          ))}
                        </datalist>
                        <button
                          className="quote-check-button"
                          type="button"
                          onClick={() =>
                            setRecipeLines((current) => [
                              ...current,
                              { name: "", quantityJin: "", quantityUnit: recipeNoGrinding ? "g" : "jin" },
                            ])
                          }
                        >
                          <Plus size={16} /> {t.addRow}
                        </button>
                        <label>
                          {t.recipeNote}
                          <textarea
                            value={recipeNotes}
                            onChange={(event) => setRecipeNotes(event.target.value)}
                            rows={3}
                            placeholder={t.recipeNotePlaceholder}
                          />
                        </label>
                        <div className="quote-panel">
                          <p><span>{t.totalWeight}</span><b>{recipeWeightJin}斤 / {(recipeWeightJin * 0.6).toFixed(1)}kg</b></p>
                          <p><span>{t.price}</span><b>{t.recipePending}</b></p>
                          {!recipeNoGrinding && <p><span>{t.deposit}</span><b>{t.recipePending}</b></p>}
                          {!recipeNoGrinding && recipeWeightJin < CUSTOM_BLEND_MINIMUM_JIN && <p className="form-error">{t.belowMinimum}</p>}
                        </div>
                        <button
                          className="checkout-button"
                          type="button"
                          onClick={() => addNewRecipe(product)}
                          disabled={recipeWeightJin <= 0 || (!recipeNoGrinding && recipeWeightJin < CUSTOM_BLEND_MINIMUM_JIN)}
                        >
                          {t.addToCart}
                        </button>
                      </div>
                    )}

                    {customMode === "repeat" && quote && (
                      <div className="quote-panel">
                        <strong>{t.quoteReady}: {quote.vendorCode}</strong>
                        <p>{t.repeatVerified}</p>
                        <p><span>{t.unit}</span><b>{formatRepeatQuoteQuantity(quote, language)}</b></p>
                        <p><span>{t.minimumQuantity}</span><b>{getCustomBlendWeightJin(quote.minimumQuantityJin ?? quote.minimumQuantityKg, quote)}斤</b></p>
                        <p><span>{t.price}</span><b>{t.recipePending}</b></p>
                        <p className="form-hint">{t.privacyNote}</p>
                      </div>
                    )}
                  </div>
                )}
                {(!isCustomBlend || customMode === "repeat") && (
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
                )}
              </div>
            </article>
          );
        })}
      </section>
      <MobileBottomTabs active="products" />
    </main>
  );
}
