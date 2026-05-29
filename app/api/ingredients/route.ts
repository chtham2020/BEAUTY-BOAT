import { getIngredientCatalog } from "@/lib/ingredient-catalog";
import { NextResponse } from "next/server";

export async function GET() {
  const ingredients = await getIngredientCatalog();
  return NextResponse.json(ingredients);
}
