import { CUSTOM_BLEND_PRODUCT_ID, calculateBalanceCents, calculateCustomLineTotalCents, calculateDepositCents } from "@/lib/custom-pricing";
import { makeFollowUpText, makeOrderNumber } from "@/lib/hermes";
import { prisma } from "@/lib/prisma";
import { getVendorQuote } from "@/lib/vendor-quotes";
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
        customQuote: z
          .object({
            vendorCode: z.string().min(1),
          })
          .optional(),
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
  const productMap = new Map<string, (typeof products)[number]>();
  for (const product of products) {
    productMap.set(product.id, product);
  }

  try {
  const lines = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }
    const customQuote =
      product.id === CUSTOM_BLEND_PRODUCT_ID && item.customQuote?.vendorCode
        ? getVendorQuote(item.customQuote.vendorCode)
        : null;
    if (product.id === CUSTOM_BLEND_PRODUCT_ID && !customQuote) {
      throw new Error("VENDOR_CODE_REQUIRED");
    }
    if (customQuote && item.quantity < customQuote.minimumQuantityKg) {
      throw new Error("MINIMUM_QUANTITY");
    }
    if (!product.quoteOnly && product.stock < item.quantity) {
      throw new Error("INSUFFICIENT_STOCK");
    }
    return { ...item, product, customQuote };
  });

  const subtotalCents = lines.reduce((sum, line) => {
    if (line.customQuote) return sum + calculateCustomLineTotalCents(line.quantity, line.customQuote);
    if (line.product.quoteOnly || line.product.priceCents == null) return sum;
    return sum + line.product.priceCents * line.quantity;
  }, 0);
  const hasQuoteItems = lines.some(
    (line) => !line.customQuote && (line.product.quoteOnly || line.product.priceCents == null),
  );
  const gstCents = Math.round(subtotalCents * 0.09);
  const totals = { subtotalCents, gstCents, hasQuoteItems };
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
            unit: line.customQuote?.unit ?? line.product.unit,
            quantity: line.quantity,
            unitPriceCents: line.customQuote?.unitPriceCents ?? line.product.priceCents,
            lineTotalCents: line.customQuote
              ? calculateCustomLineTotalCents(line.quantity, line.customQuote)
              : line.product.quoteOnly || line.product.priceCents == null
                ? null
                : line.product.priceCents * line.quantity,
            quoteOnly: line.customQuote ? false : line.product.quoteOnly,
            vendorCode: line.customQuote?.vendorCode,
            vendorName: line.customQuote?.vendorName,
            blendType: line.customQuote?.blendType,
            ingredients: line.customQuote?.ingredients.join(", "),
            ingredientQuantity: line.customQuote?.ingredientQuantity,
            heatTreatment: line.customQuote?.heatTreatment,
            processSpec: line.customQuote?.processSpec,
            grindingCostPer600gCents: line.customQuote?.grindingCostPer600gCents,
            minimumQuantityKg: line.customQuote?.minimumQuantityKg,
            depositCents: line.customQuote
              ? calculateDepositCents(calculateCustomLineTotalCents(line.quantity, line.customQuote))
              : undefined,
            balanceCents: line.customQuote
              ? calculateBalanceCents(calculateCustomLineTotalCents(line.quantity, line.customQuote))
              : undefined,
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
    if (error instanceof Error && error.message === "VENDOR_CODE_REQUIRED") {
      return NextResponse.json({ error: "Vendor code required for Custom Blend" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "MINIMUM_QUANTITY") {
      return NextResponse.json({ error: "Custom Blend minimum quantity not met" }, { status: 400 });
    }
    throw error;
  }
}
