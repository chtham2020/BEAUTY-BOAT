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

export type CartItem = {
  productId: string;
  quantity: number;
  product: PublicProduct;
};

export type CartStoredItem = {
  productId: string;
  quantity: number;
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
