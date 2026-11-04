/**
 * Headless connector, for the Docker demo and for pilots on a Windows PC with Node installed.
 *   connector connect <link-token>   join a connect link and report this PC's Tally companies
 *   connector run                    sync and answer live calls until stopped
 *   connector revoke <connection-id> stop sharing a connection with a developer
 */
import { ConnectorRuntime } from "./runtime.ts";

const env = (k: string, d?: string) => {
  const v = process.env[k] ?? d;
  if (v === undefined) { console.error(`${k} is required`); process.exit(2); }
  return v;
};
const trusted = Object.fromEntries(env("TRUSTED_SIGNING_KEYS").split(";").filter(Boolean).map((p) => {
  const at = p.indexOf("=");
  return [p.slice(0, at), Buffer.from(p.slice(at + 1), "base64").toString("utf8")];
}));
const rt = new ConnectorRuntime({
  cloudUrl: env("CLOUD_URL"),
  tallyHost: env("TALLY_HOST", "127.0.0.1"),
  tallyPort: Number(env("TALLY_PORT", "9000")),
  dataPath: env("CONNECTOR_DB", "./.connector-data/connector.sqlite"),
  trustedKeys: trusted,
  syncIntervalMs: Number(env("SYNC_INTERVAL_MS", "60000")),
  allowInsecureCloud: process.env.ALLOW_INSECURE_CLOUD === "true",
  log: (m) => console.log(`[connector] ${m}`),
});
const [cmd, arg] = process.argv.slice(2);
if (cmd === "connect" && arg) {
  await rt.enroll(arg);
  console.log("Connected. Open the connect link in your browser to pick a company and approve access.");
} else if (cmd === "revoke" && arg) {
  await rt.revoke(arg);
  console.log("Access revoked.");
} else if (cmd === "run") {
  if (process.env.CONNECT_LINK_TOKEN && !rt.store.get("device_secret")) await rt.enroll(process.env.CONNECT_LINK_TOKEN);
  rt.start();
  const stop = () => void rt.stop().finally(() => process.exit(0));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
} else {
  console.error("Usage: connector connect <link-token> | run | revoke <connection-id>");
  process.exit(2);
}
