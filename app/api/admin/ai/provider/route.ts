import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  provider: z.enum(["ollama", "deepseek"]),
});

function currentProvider() {
  const provider = (process.env.AI_PROVIDER || "ollama").toLowerCase();
  return provider === "deepseek" ? "deepseek" : "ollama";
}

function maskKey(value: string | undefined) {
  if (!value) return null;
  return {
    length: value.length,
    ending: value.slice(-6),
  };
}

export async function GET() {
  await requireAdmin();

  return NextResponse.json({
    provider: currentProvider(),
    ollamaModel: process.env.OLLAMA_MODEL || process.env.AI_MODEL || "qwen2.5:14b",
    deepseekModel: process.env.DEEPSEEK_MODEL || process.env.AI_MODEL || "deepseek-chat",
    effectiveDeepSeekKey: maskKey(process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY),
    aiApiKey: maskKey(process.env.AI_API_KEY),
    deepSeekApiKey: maskKey(process.env.DEEPSEEK_API_KEY),
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 20000),
  });
}

export async function POST(request: Request) {
  await requireAdmin();

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid AI provider" }, { status: 400 });
  }

  process.env.AI_PROVIDER = parsed.data.provider;

  return NextResponse.json({
    provider: parsed.data.provider,
    note: "AI provider switched for the current running server session. Update .env for restart persistence.",
  });
}
