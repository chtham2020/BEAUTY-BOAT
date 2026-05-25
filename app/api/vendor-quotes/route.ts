import { CUSTOM_BLEND_PRODUCT_ID } from "@/lib/custom-pricing";
import { getVendorQuote } from "@/lib/vendor-quotes";
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

  const quote = getVendorQuote(parsed.data.vendorCode);
  if (!quote) {
    return NextResponse.json({ error: "Vendor code not found" }, { status: 404 });
  }

  return NextResponse.json(quote);
}
