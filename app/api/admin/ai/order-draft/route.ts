import { generateOrderAiDraft } from "@/lib/ai";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orderId: z.string().min(1),
  kind: z.enum(["whatsapp", "summary", "quote"]),
});

export async function POST(request: Request) {
  await requireAdmin();

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid AI draft request" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const text = await generateOrderAiDraft(parsed.data.kind, order);
    return NextResponse.json({
      kind: parsed.data.kind,
      text,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate AI draft";
    const status =
      message.includes("not configured") ||
      message.includes("Unsupported AI_PROVIDER") ||
      message.includes("Ollama request failed")
        ? 503
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
