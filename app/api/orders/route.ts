import { makeFollowUpText, makeOrderNumber, summarizeFixedTotals } from "@/lib/hermes";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const orderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(6),
  customerNote: z.string().optional(),
  deliveryMethod: z.enum(["third-party", "self-pickup"]),
  deliveryNote: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  const productIds = parsed.data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  const lines = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }
    if (!product.quoteOnly && product.stock < item.quantity) {
      throw new Error("INSUFFICIENT_STOCK");
    }
    return { ...item, product };
  });

  const totals = summarizeFixedTotals(
    lines.map((line) => ({
      quoteOnly: line.product.quoteOnly,
      priceCents: line.product.priceCents,
      quantity: line.quantity,
    })),
  );
  const finalTotalCents = totals.hasQuoteItems ? null : totals.subtotalCents + totals.gstCents;
  const orderNumber = makeOrderNumber();
  const deliveryLabel =
    parsed.data.deliveryMethod === "self-pickup" ? "自费领取 / Self pickup" : "Lalamove / Grab 配送";
  const followUpText = makeFollowUpText({
    orderNumber,
    customerName: parsed.data.customerName,
    subtotalCents: totals.subtotalCents,
    gstCents: totals.gstCents,
    hasQuoteItems: totals.hasQuoteItems,
    deliveryMethod: deliveryLabel,
    finalTotalCents,
  });

  try {
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        customerNote: parsed.data.customerNote,
        deliveryMethod: parsed.data.deliveryMethod,
        deliveryNote: parsed.data.deliveryNote,
        subtotalCents: totals.subtotalCents,
        gstCents: totals.gstCents,
        finalTotalCents,
        deliveryFeeCents: parsed.data.deliveryMethod === "self-pickup" ? 0 : null,
        hasQuoteItems: totals.hasQuoteItems,
        followUpText,
        items: {
          create: lines.map((line) => ({
            productId: line.product.id,
            productNameZh: line.product.nameZh,
            productNameEn: line.product.nameEn,
            unit: line.product.unit,
            quantity: line.quantity,
            unitPriceCents: line.product.priceCents,
            lineTotalCents:
              line.product.quoteOnly || line.product.priceCents == null
                ? null
                : line.product.priceCents * line.quantity,
            quoteOnly: line.product.quoteOnly,
          })),
        },
      },
    });

    return NextResponse.json({ orderNumber: order.orderNumber });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 409 });
    }
    throw error;
  }
}
