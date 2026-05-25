import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { pbkdf2Sync, timingSafeEqual } from "crypto";

export const AUTH_COOKIE = "hermes_admin";

function secret() {
  return new TextEncoder().encode(
    process.env.HERMES_AUTH_SECRET || "change-this-local-dev-secret-before-production",
  );
}

export function verifyPassword(password: string, salt: string, hash: string) {
  const candidate = pbkdf2Sync(password, salt, 120000, 32, "sha256");
  const stored = Buffer.from(hash, "hex");
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

export async function createAdminToken(adminId: string) {
  return new SignJWT({ adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function getAdminSession() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.adminId === "string" ? { adminId: payload.adminId } : null;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}
