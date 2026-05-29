"use client";

import { formatMoney } from "@/lib/money";
import {
  CUSTOM_BLEND_MINIMUM_JIN,
  CUSTOM_BLEND_PRODUCT_ID,
  calculateBalanceCents,
  calculateCustomLineTotalCents,
  calculateDepositCents,
  customCartKey,
  getCustomBlendWeightJin,
  getCustomRecipeWeightJin,
  hasNewCustomRecipe,
} from "@/lib/custom-pricing";
import type { CartStoredItem, CustomQuoteSnapshot, CustomRecipeSnapshot, PublicProduct } from "@/lib/types";
import { useLanguagePreference } from "@/lib/language";
import { Check, House, Plus, ShoppingCart, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CART_KEY = "beauty_boat_cart";

type RecipeDraftLine = {
  name: string;
  quantityJin: string;
};

type IngredientCatalogItem = {
  nameZh: string;
  nameEn: string;
};

const copy = {
  zh: {
    eyebrow: "Hermes Order",
    title: "產品訂購",
    body: "固定價格商品可預估金額；客製粉料會由店家通過 WhatsApp text/電話確認報價。",
    home: "主頁",
    cart: "購物車",
    inCartStatus: "已加入購物車，到 Shopping Cart 調整數量",
    unit: "單位",
    stock: "庫存",
    price: "價格",
    quote: "詢價",
    confirm: "需確認",
    repeatMode: "Repeat vendor code",
    newMode: "New customer recipe",
    vendorCode: "Vendor code",
    vendorPlaceholder: "Enter company vendor code",
    validateVendor: "Verify code",
    validating: "Checking...",
    invalidVendor: "Vendor code not found",
    quoteReady: "Quotation ready",
    ingredients: "Ingredients",
    ingredientName: "Ingredient name",
    ingredientPlaceholder: "Select or type ingredient",
    quantityJin: "Quantity 斤",
    addRow: "Add row",
    removeRow: "Remove row",
    recipeNote: "Recipe / packing notes",
    recipeNotePlaceholder: "Grinding, packing, taste direction, delivery notes",
    newRecipeHelp: "Minimum 10斤 / 6kg. New custom blend orders require 70% deposit after quotation.",
    belowMinimum: "Minimum order is 10斤 / 6kg.",
    exclusive: "New custom blend recipe must be ordered alone. Adding it will replace other cart items.",
    recipePending: "Final amount pending shop quotation",
    heatTreatment: "Heat treatment",
    processSpec: "Baking / grinding spec",
    minimumQuantity: "Minimum quantity",
    totalWeight: "總重量",
    grindingCost: "Grinding cost / 斤",
    deposit: "70% deposit",
    balance: "30% upon collection",
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
    ingredients: "Ingredients",
    ingredientName: "Ingredient name",
    ingredientPlaceholder: "Select or type ingredient",
    quantityJin: "Quantity jin",
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

function makeRecipeSnapshot(lines: RecipeDraftLine[], notes: string): CustomRecipeSnapshot {
  const ingredientLines = lines
    .map((line) => ({ name: line.name.trim(), quantityJin: Number(line.quantityJin) }))
    .filter((line) => line.name && line.quantityJin > 0);
  const totalWeightJin = ingredientLines.reduce((sum, line) => sum + line.quantityJin, 0);
  return {
    recipeId: `recipe-${Date.now()}`,
    customerType: "new",
    vendorName: "New customer recipe",
    blendType: "First-time custom blend",
    ingredientLines,
    ingredients: ingredientLines.map((line) => line.name),
    ingredientQuantity: `${totalWeightJin}斤 total, 1斤 = 600g`,
    totalWeightJin,
    unit: "斤",
    heatTreatment: "Shop to confirm",
    processSpec: "Shop to confirm",
    minimumQuantityJin: CUSTOM_BLEND_MINIMUM_JIN,
    notes: notes.trim() || undefined,
  };
}

export default function ProductsPage() {
  const { language } = useLanguagePreference();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [selectedCartKeys, setSelectedCartKeys] = useState<string[]>([]);
  const [cartHasNewRecipe, setCartHasNewRecipe] = useState(false);
  const [vendorCodes, setVendorCodes] = useState<Record<string, string>>({});
  const [vendorQuotes, setVendorQuotes] = useState<Record<string, CustomQuoteSnapshot>>({});
  const [vendorErrors, setVendorErrors] = useState<Record<string, string>>({});
  const [validatingCodes, setValidatingCodes] = useState<Record<string, boolean>>({});
  const [ingredientCatalog, setIngredientCatalog] = useState<IngredientCatalogItem[]>([]);
  const [customMode, setCustomMode] = useState<"repeat" | "new">("repeat");
  const [recipeLines, setRecipeLines] = useState<RecipeDraftLine[]>([
    { name: "", quantityJin: "" },
    { name: "", quantityJin: "" },
    { name: "", quantityJin: "" },
  ]);
  const [recipeNotes, setRecipeNotes] = useState("");
  const t = copy[language];

  const recipeWeightJin = useMemo(
    () => recipeLines.reduce((sum, line) => sum + (Number(line.quantityJin) || 0), 0),
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
      if (item.productId === CUSTOM_BLEND_PRODUCT_ID && item.customQuote) {
        setVendorCodes((current) => ({ ...current, [item.productId]: item.customQuote?.vendorCode ?? "" }));
        setVendorQuotes((current) => ({ ...current, [item.productId]: item.customQuote as CustomQuoteSnapshot }));
      }
    }
  }

  function toggleCartItem(product: PublicProduct, customQuote?: CustomQuoteSnapshot) {
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
    const recipe = makeRecipeSnapshot(recipeLines, recipeNotes);
    if (getCustomRecipeWeightJin(recipe) < CUSTOM_BLEND_MINIMUM_JIN) return;
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
          const isBlockedByNewRecipe = cartHasNewRecipe && !isCustomBlend;
          const isAddDisabled = isUnavailable || isBlockedByNewRecipe || (isCustomBlend && customMode === "repeat" && !quote);
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
                              step="0.5"
                              value={line.quantityJin}
                              onChange={(event) =>
                                setRecipeLines((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, quantityJin: event.target.value } : entry,
                                  ),
                                )
                              }
                              placeholder={t.quantityJin}
                            />
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
                          onClick={() => setRecipeLines((current) => [...current, { name: "", quantityJin: "" }])}
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
                          <p><span>{t.deposit}</span><b>{t.recipePending}</b></p>
                          {recipeWeightJin < CUSTOM_BLEND_MINIMUM_JIN && <p className="form-error">{t.belowMinimum}</p>}
                        </div>
                        <button
                          className="checkout-button"
                          type="button"
                          onClick={() => addNewRecipe(product)}
                          disabled={recipeWeightJin < CUSTOM_BLEND_MINIMUM_JIN}
                        >
                          {t.addToCart}
                        </button>
                      </div>
                    )}

                    {customMode === "repeat" && quote && (
                      <div className="quote-panel">
                        <strong>{t.quoteReady}: {quote.vendorCode}</strong>
                        <p>{quote.vendorName} · {quote.blendType}</p>
                        <p><span>{t.ingredients}</span><b>{quote.ingredients.join(", ")}</b></p>
                        {quote.ingredientLines && (
                          <div className="ingredient-line-table">
                            {quote.ingredientLines.map((ingredient) => (
                              <p key={ingredient.name}>
                                <span>{ingredient.name}</span>
                                <b>
                                  {ingredient.quantityJin}斤
                                  {ingredient.unitPriceCents != null && ` × ${formatMoney(ingredient.unitPriceCents)}`}
                                  {ingredient.lineTotalCents != null && ` = ${formatMoney(ingredient.lineTotalCents)}`}
                                </b>
                              </p>
                            ))}
                            <p className="ingredient-total-row">
                              <span>{t.totalWeight}</span>
                              <b>{getCustomBlendWeightJin(quote.minimumQuantityJin ?? quote.minimumQuantityKg, quote)}斤</b>
                            </p>
                          </div>
                        )}
                        <p><span>{t.unit}</span><b>{quote.ingredientQuantity}</b></p>
                        <p><span>{t.heatTreatment}</span><b>{quote.heatTreatment}</b></p>
                        <p><span>{t.processSpec}</span><b>{quote.processSpec}</b></p>
                        <p><span>{t.minimumQuantity}</span><b>{getCustomBlendWeightJin(quote.minimumQuantityJin ?? quote.minimumQuantityKg, quote)}斤</b></p>
                        <p><span>{t.grindingCost}</span><b>{formatMoney(quote.grindingCostPerJinCents ?? quote.grindingCostPer600gCents)} / 斤</b></p>
                        <p><span>{t.deposit}</span><b>{formatMoney(calculateDepositCents(sampleLineTotal))}</b></p>
                        <p><span>{t.balance}</span><b>{formatMoney(calculateBalanceCents(sampleLineTotal))}</b></p>
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
    </main>
  );
}
