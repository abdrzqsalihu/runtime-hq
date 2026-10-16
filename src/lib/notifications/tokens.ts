import { createHash, randomBytes } from "node:crypto";

/** 256 bits of randomness, URL/Telegram-deep-link safe (A-Z a-z 0-9 _ -), 43 characters. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
