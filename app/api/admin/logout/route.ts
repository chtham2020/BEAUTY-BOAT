import { AUTH_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  (await cookies()).delete(AUTH_COOKIE);
  return NextResponse.json({ ok: true });
}
