import type { CartStoredItem, CustomQuotePublicSnapshot, CustomQuoteSnapshot, CustomRecipeSnapshot } from "./types";

export const CUSTOM_BLEND_PRODUCT_ID = "custom-blend";
export const CUSTOM_DEPOSIT_RATE = 0.7;
export const CUSTOM_BLEND_MINIMUM_JIN = 10;

export function customCartKey(productId: string, vendorCode?: string, recipeId?: string) {
  if (vendorCode) return `${productId}:${vendorCode.toUpperCase()}`;
  if (recipeId) return `${productId}:NEW:${recipeId}`;
  return productId;
}

type CustomBlendWeightSnapshot = Pick<
  CustomQuoteSnapshot | CustomQuotePublicSnapshot,
  "totalWeightJin" | "minimumQuantityJin" | "minimumQuantityKg"
>;

export function getCustomBlendWeightJin(quantity: number, quote: CustomBlendWeightSnapshot) {
  return quote.totalWeightJin ?? quote.minimumQuantityJin ?? quantity;
}

export function getCustomRecipeWeightJin(recipe: CustomRecipeSnapshot) {
  return recipe.ingredientLines.reduce((sum, line) => sum + Number(line.quantityJin || 0), 0);
}

export function hasNewCustomRecipe(items: Pick<CartStoredItem, "customRecipe">[]) {
  return items.some((item) => Boolean(item.customRecipe));
}

export function calculateGrindingCostCents(quantityJin: number, costPer600gCents: number) {
  if (quantityJin <= 0 || costPer600gCents <= 0) return 0;
  return Math.round(quantityJin * costPer600gCents);
}

export function calculateCustomLineTotalCents(quantity: number, quote: CustomQuoteSnapshot) {
  const weightJin = getCustomBlendWeightJin(quantity, quote);
  const grindingCostPerJinCents = quote.grindingCostPerJinCents ?? quote.grindingCostPer600gCents;
  const ingredientSubtotal =
    quote.ingredientLines?.reduce(
      (sum, ingredient) =>
        sum + (ingredient.lineTotalCents ?? Math.round(ingredient.quantityJin * (ingredient.unitPriceCents ?? 0))),
      0,
    ) ?? quote.unitPriceCents * weightJin;

  return ingredientSubtotal + calculateGrindingCostCents(weightJin, grindingCostPerJinCents);
}

export function calculateDepositCents(customSubtotalCents: number) {
  return Math.round(customSubtotalCents * CUSTOM_DEPOSIT_RATE);
}

export function calculateBalanceCents(customSubtotalCents: number) {
  return customSubtotalCents - calculateDepositCents(customSubtotalCents);
}
