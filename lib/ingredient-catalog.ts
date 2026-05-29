import { prisma } from "./prisma";

export type IngredientCatalogItem = {
  nameZh: string;
  nameEn: string;
};

export const defaultIngredientCatalog: IngredientCatalogItem[] = [
  { nameZh: "八角", nameEn: "Star anise" },
  { nameZh: "桂皮", nameEn: "Cinnamon bark" },
  { nameZh: "芫荽子", nameEn: "Coriander seed" },
  { nameZh: "花椒", nameEn: "Sichuan pepper" },
  { nameZh: "丁香", nameEn: "Clove" },
  { nameZh: "甘草", nameEn: "Licorice" },
  { nameZh: "沙姜", nameEn: "Sand ginger" },
  { nameZh: "小茴", nameEn: "Fennel seed" },
  { nameZh: "归头", nameEn: "Angelica root head" },
  { nameZh: "川芎", nameEn: "Chuanxiong" },
  { nameZh: "胡椒子", nameEn: "Peppercorn" },
  { nameZh: "甘皮", nameEn: "Dried citrus peel" },
  { nameZh: "Coriander", nameEn: "Coriander" },
  { nameZh: "Cumin", nameEn: "Cumin" },
  { nameZh: "Fennel", nameEn: "Fennel" },
  { nameZh: "White pepper", nameEn: "White pepper" },
  { nameZh: "Black pepper", nameEn: "Black pepper" },
  { nameZh: "Garlic powder", nameEn: "Garlic powder" },
];

function uniqueCatalog(items: IngredientCatalogItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.nameZh.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getIngredientCatalog() {
  const templateIngredients = await prisma.customBlendTemplateIngredient.findMany({
    select: { name: true },
    orderBy: [{ name: "asc" }],
  });

  return uniqueCatalog([
    ...defaultIngredientCatalog,
    ...templateIngredients.map((ingredient) => ({
      nameZh: ingredient.name,
      nameEn: ingredient.name,
    })),
  ]);
}
