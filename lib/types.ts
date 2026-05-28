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

export type CartItem = {
  productId: string;
  quantity: number;
  customQuote?: CustomQuoteSnapshot;
  product: PublicProduct;
};

export type CartStoredItem = {
  productId: string;
  quantity: number;
  customQuote?: CustomQuoteSnapshot;
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
