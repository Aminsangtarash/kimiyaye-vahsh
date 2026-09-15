import { createHmac, timingSafeEqual } from "node:crypto";
import type { GameTicketClaims } from "@kv/contracts";

export function signGameTicket(claims: GameTicketClaims, secret: string): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyGameTicket(token: string, secret: string): GameTicketClaims | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GameTicketClaims;
  if (claims.exp * 1000 < Date.now()) return null;
  return claims;
}
