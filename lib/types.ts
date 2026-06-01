export type PublicProduct = {
  id: string;
  nameZh: string;
  nameEn: string;
  category: string;
  description: string;
  unit: string;
  image: string | null;
  priceCents: number | null;
  quoteOnly: boolean;
  stock: number;
  active: boolean;
};

export type CustomQuoteSnapshot = {
  vendorCode: string;
  vendorName: string;
  blendType: string;
  ingredients: string[];
  ingredientLines?: {
    name: string;
    quantityJin: number;
    unitPriceCents?: number;
    lineTotalCents?: number;
  }[];
  ingredientQuantity: string;
  unit: string;
  heatTreatment: string;
  processSpec: string;
  grindingCostPer600gCents: number;
  totalWeightJin?: number;
  grindingCostPerJinCents?: number;
  minimumQuantityJin?: number;
  minimumQuantityKg: number;
  unitPriceCents: number;
};

export type CustomQuotePublicSnapshot = {
  vendorCode: string;
  blendType: string;
  ingredientQuantity: string;
  unit: string;
  totalWeightJin?: number;
  minimumQuantityJin?: number;
  minimumQuantityKg: number;
  quoteOnly: true;
  privacyNote: string;
};

export type CustomRecipeSnapshot = {
  recipeId: string;
  customerType: "new";
  vendorName: string;
  blendType: string;
  ingredientLines: {
    name: string;
    quantityJin: number;
  }[];
  ingredients: string[];
  ingredientQuantity: string;
  totalWeightJin: number;
  unit: string;
  heatTreatment: string;
  processSpec: string;
  minimumQuantityJin: number;
  notes?: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
  customQuote?: CustomQuotePublicSnapshot;
  customRecipe?: CustomRecipeSnapshot;
  product: PublicProduct;
};

export type CartStoredItem = {
  productId: string;
  quantity: number;
  customQuote?: CustomQuotePublicSnapshot;
  customRecipe?: CustomRecipeSnapshot;
};

export const DELIVERY_METHODS = [
  {
    value: "third-party",
    zh: "Lalamove / Grab 配送",
    en: "Lalamove / Grab delivery",
  },
  {
    value: "self-pickup",
    zh: "自费领取",
    en: "Self pickup",
  },
] as const;
