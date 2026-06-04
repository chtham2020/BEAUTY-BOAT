import { requireAdmin } from "@/lib/auth";
import { sendTelegramManufacturingTestMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST() {
  await requireAdmin();

  try {
    await sendTelegramManufacturingTestMessage();
    return NextResponse.json({
      ok: true,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Manufacturing Telegram test message failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
