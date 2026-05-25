import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const productSchema = z.object({
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().min(1),
  image: z.string().optional().nullable(),
  priceCents: z.number().int().min(0).optional().nullable(),
  quoteOnly: z.boolean(),
  stock: z.number().int().min(0),
  active: z.boolean(),
});

export async function GET() {
  await requireAdmin();
  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  await requireAdmin();
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

  const product = await prisma.product.create({ data: parsed.data });
  return NextResponse.json(product);
}
