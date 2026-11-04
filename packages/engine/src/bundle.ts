/** Signed, immutable bundles and envelopes. A connection pins a bundle by content hash. */
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import type { DatasetDef } from "./definition.ts";

export const ENGINE_VERSION = "1.0.0";

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export interface Bundle {
  format: 1;
  connectionId: string;
  schemaVersion: number;
  minEngineVersion: string;
  company: string;
  datasets: DatasetDef[];
  openapi: unknown;
}

export const bundleHash = (bundle: Bundle) => sha256(canonicalJson(bundle));

/** `kind` is part of what gets signed, so a signed probe can never be replayed as a write job. */
export type EnvelopeKind = "bundle" | "job" | "probe";
export interface Envelope<T> { kind: EnvelopeKind; payload: T; kid: string; sig: string }

const message = (kind: string, payload: unknown) => Buffer.from(`hexspare-tally/v1\n${kind}\n${canonicalJson(payload)}`);

export function signEnvelope<T>(kind: EnvelopeKind, payload: T, key: { kid: string; privateKeyPem: string }): Envelope<T> {
  return { kind, payload, kid: key.kid, sig: sign(null, message(kind, payload), createPrivateKey(key.privateKeyPem)).toString("base64url") };
}

export class SignatureError extends Error { override name = "SignatureError"; }

/** `trusted` maps key ID to public key. Two entries overlap during a rotation (ADR-1). */
export function verifyEnvelope<T>(env: Envelope<T>, kind: EnvelopeKind, trusted: Record<string, string>): T {
  if (!env || env.kind !== kind) throw new SignatureError(`Expected a signed ${kind}`);
  const pem = trusted[env.kid];
  if (!pem) throw new SignatureError(`Unknown signing key ${env.kid}`);
  if (!verify(null, message(kind, env.payload), createPublicKey(pem), Buffer.from(env.sig, "base64url"))) throw new SignatureError(`Invalid signature on ${kind}`);
  return env.payload;
}

export function generateSigningKey(): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return { privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(), publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString() };
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}
