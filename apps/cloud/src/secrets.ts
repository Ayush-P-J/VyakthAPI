import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Long random tokens need a fast hash, not a password hash: there is nothing to brute-force. */
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const randomToken = (prefix: string, bytes = 32) => `${prefix}${randomBytes(bytes).toString("base64url")}`;

/** Webhook secrets must be readable to sign with, so they are encrypted rather than hashed. */
export function seal(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const out = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${out.toString("base64url")}`;
}
export function unseal(sealed: string, key: Buffer): string {
  const [v, iv, tag, data] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Unknown secret format");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}
