export interface Config {
  databaseUrl: string;
  publicUrl: string;
  /** Where the developer console is served. Decides cookie security and the allowed Origin. */
  consoleUrl: string;
  allowSignup: boolean;
  port: number;
  signing: { kid: string; privateKeyPem: string };
  /** Earlier public keys still trusted during a rotation are held by connectors, not here. */
  secretsKey: Buffer;
  allowPrivateWebhooks: boolean;
  migrationsDir: string;
  liveTimeoutMs: number;
}

const need = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is required. See .env.example.`);
  return v;
};

export function loadConfig(): Config {
  const secretsKey = Buffer.from(need("SECRETS_KEY"), "base64");
  if (secretsKey.length !== 32) throw new Error("SECRETS_KEY must be 32 bytes, base64-encoded");
  return {
    databaseUrl: need("DATABASE_URL"),
    publicUrl: need("PUBLIC_URL").replace(/\/$/, ""),
    consoleUrl: (process.env.CONSOLE_URL ?? "http://localhost:3001").replace(/\/$/, ""),
    allowSignup: process.env.ALLOW_SIGNUP !== "false",
    port: Number(process.env.PORT ?? 3000),
    signing: { kid: need("SIGNING_KID"), privateKeyPem: Buffer.from(need("SIGNING_PRIVATE_KEY"), "base64").toString("utf8") },
    secretsKey,
    allowPrivateWebhooks: process.env.ALLOW_PRIVATE_WEBHOOKS === "true",
    migrationsDir: process.env.MIGRATIONS_DIR ?? new URL("../../../db/migrations", `file://${process.cwd()}/apps/cloud/src/`).pathname,
    liveTimeoutMs: Number(process.env.LIVE_TIMEOUT_MS ?? 25_000),
  };
}
export const CONFIG = Symbol("CONFIG");
