import { CUSTOM_BLEND_PRODUCT_ID } from "@/lib/custom-pricing";
import { getVendorQuoteFromDb } from "@/lib/vendor-quotes";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  vendorCode: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vendor code request" }, { status: 400 });
  }

  if (parsed.data.productId !== CUSTOM_BLEND_PRODUCT_ID) {
    return NextResponse.json({ error: "Vendor code applies only to Custom Blend" }, { status: 400 });
  }

  const quote = await getVendorQuoteFromDb(parsed.data.vendorCode);
  if (!quote) {
    return NextResponse.json({ error: "Vendor code not found" }, { status: 404 });
  }

  const weightJin = quote.totalWeightJin ?? quote.minimumQuantityJin ?? quote.minimumQuantityKg;

  return NextResponse.json({
    vendorCode: quote.vendorCode,
    blendType: "Repeat custom blend verified",
    ingredientQuantity: `${weightJin}斤 total, 1斤 = 600g`,
    unit: quote.unit,
    totalWeightJin: weightJin,
    minimumQuantityJin: quote.minimumQuantityJin ?? weightJin,
    minimumQuantityKg: quote.minimumQuantityKg,
    quoteOnly: true,
    privacyNote: "Blend formula is kept on file and visible only to FOOK ON backend.",
  });
}
