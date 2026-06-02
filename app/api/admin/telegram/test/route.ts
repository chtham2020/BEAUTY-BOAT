import { requireAdmin } from "@/lib/auth";
import { sendTelegramTestMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST() {
  await requireAdmin();

  try {
    await sendTelegramTestMessage();
    return NextResponse.json({
      ok: true,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram test message failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
