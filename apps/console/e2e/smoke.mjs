// Drives the running console in a real browser. Usage: node e2e/smoke.mjs [console-url] [screenshot-dir]
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3001";
const apiUrl = process.env.API_URL ?? "http://localhost:3000";
const shots = process.argv[3];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
const page = await context.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error" && !/status of 4\d\d/.test(m.text())) problems.push(`console: ${m.text()}`); });

let failed = 0;
async function step(name, fn) {
  try { await fn(); console.log(`ok   ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}: ${e.message.split("\n")[0]}`); }
}
const see = (text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 });
const shot = async (name) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true }); };
const email = `smoke-${Date.now()}@example.com`;
const password = "correct horse battery";

await step("a signed-out visitor is sent to sign in", async () => {
  await page.goto(`${base}/`);
  await page.waitForURL("**/login");
  await see("Manage your customers");
  await shot("login");
});
await step("the form explains what's wrong before sending anything", async () => {
  await page.getByRole("button", { name: "Sign in" }).click();
  await see("Enter a valid email address.");
  await see("Enter your password.");
});
await step("a wrong password gets a clear message, and stays on the page", async () => {
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("not the password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await see("That email and password don't match.");
  await shot("login-error");
});
await step("signup refuses a short password", async () => {
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.waitForURL("**/signup");
  await page.getByLabel("Your name").fill("Asha Rao");
  await page.getByLabel("Company").fill("Shanoor Realtors");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await see("Use at least 10 characters.");
});
await step("signup creates the account and opens the console", async () => {
  await page.getByLabel("Password").fill(password);
  await shot("signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Shanoor Realtors" }).waitFor({ timeout: 10000 });
  await see("Asha Rao");
});
await step("the overview shows live counts from the API", async () => {
  await see("No customers connected yet");
  await page.getByText("Connected companies").waitFor();
  await shot("overview");
});
await step("the session cookie is hidden from page scripts", async () => {
  if ((await page.evaluate(() => document.cookie)).includes("hx_session")) throw new Error("hx_session is readable from JavaScript");
  const cookie = (await context.cookies()).find((c) => c.name === "hx_session");
  if (!cookie?.httpOnly || cookie.sameSite !== "Lax") throw new Error(`cookie flags: ${JSON.stringify(cookie)}`);
});
await step("a reload keeps you signed in", async () => {
  await page.reload();
  await page.getByRole("heading", { name: "Shanoor Realtors" }).waitFor();
});
await step("a signed-in visitor skips the sign-in page", async () => {
  await page.goto(`${base}/login`);
  await page.getByRole("heading", { name: "Shanoor Realtors" }).waitFor();
});
let apiKey = "";
let connectUrl = "";
const secretOnScreen = () => page.locator("code.select-all").innerText();
await step("the overview links to connecting a customer", async () => {
  await page.getByRole("link", { name: "Connect a customer" }).click();
  await page.getByRole("heading", { name: "Connections", level: 1 }).waitFor();
  await page.waitForURL("**/connections");
  await see("No companies yet");
});
await step("the nav marks the page you are on", async () => {
  const current = await page.locator('nav[aria-label="Main"] [aria-current="page"]').innerText();
  if (current !== "Connections") throw new Error(`marked ${current}`);
});
await step("a key needs a name", async () => {
  await page.getByRole("link", { name: "API keys" }).click();
  await page.getByRole("heading", { name: "API keys", level: 1 }).waitFor();
  await see("No keys yet");
  await page.getByRole("button", { name: "Create API key" }).click();
  await page.getByRole("button", { name: "Create key" }).click();
  await see("Enter a name for this key.");
});
await step("a new key is shown once, copies, and works against the real API", async () => {
  await page.getByLabel("Key name").fill("Billing app");
  await page.getByLabel(/^Full access/).check();
  await page.getByRole("button", { name: "Create key" }).click();
  await see("Your new key: Billing app");
  apiKey = await secretOnScreen();
  if (!apiKey.startsWith("hx_live_")) throw new Error("no key on screen");
  await page.getByRole("button", { name: "Copy" }).click();
  await see("Copied.");
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== apiKey) throw new Error("clipboard differs");
  await shot("key-created");
  const res = await fetch(`${apiUrl}/v1/connections`, { headers: { authorization: `Bearer ${apiKey}` } });
  if (res.status !== 200) throw new Error(`API answered ${res.status}`);
});
await step("after Done or a reload, the key is gone for good", async () => {
  await page.getByRole("button", { name: "Done" }).click();
  await see("Billing app");
  await page.reload();
  await see("Last used:");
  if ((await page.content()).includes(apiKey)) throw new Error("the full key is still in the page");
  await page.locator("code", { hasText: apiKey.slice(0, 12) }).waitFor();
  await shot("keys");
});
await step("revoking asks first, can be called off, then kills the key", async () => {
  await page.getByRole("button", { name: "Revoke Billing app" }).click();
  await page.getByRole("button", { name: "Keep it" }).click();
  let res = await fetch(`${apiUrl}/v1/connections`, { headers: { authorization: `Bearer ${apiKey}` } });
  if (res.status !== 200) throw new Error("calling it off still revoked");
  await page.getByRole("button", { name: "Revoke Billing app" }).click();
  await see("Apps using this key stop working at once.");
  await page.getByRole("button", { name: "Yes, revoke" }).click();
  await see("Revoked");
  res = await fetch(`${apiUrl}/v1/connections`, { headers: { authorization: `Bearer ${apiKey}` } });
  if (res.status !== 401) throw new Error(`revoked key answered ${res.status}`);
});
await step("a connect link is created and opens for the customer", async () => {
  await page.getByRole("link", { name: "Connections" }).click();
  await page.getByRole("button", { name: "Connect a customer" }).click();
  await page.getByLabel("Customer name").fill("Acme Industries");
  await page.getByLabel("Return address").fill("not an address");
  await page.getByRole("button", { name: "Create link" }).click();
  await see("Enter a full address");
  await page.getByLabel("Return address").fill("");
  await page.getByLabel(/post entries into Tally/).check();
  await page.getByRole("button", { name: "Create link" }).click();
  await see("Your connect link");
  connectUrl = await secretOnScreen();
  await shot("link-created");
  const state = await (await fetch(`${connectUrl}/state`)).json();
  if (state.status !== "awaiting_connector" || state.label !== "Acme Industries" || !state.requestedScopes.includes("write")) throw new Error(JSON.stringify(state));
  await see("Waiting for the customer to start the connector");
});
await step("the customer's link opens in the console and doesn't leak through the referrer", async () => {
  if (!connectUrl.startsWith(`${base}/connect/`)) throw new Error(`link is ${connectUrl}`);
  const customer = await context.newPage();
  const res = await customer.goto(connectUrl);
  if (res.headers()["referrer-policy"] !== "no-referrer") throw new Error(`referrer-policy: ${res.headers()["referrer-policy"]}`);
  if (!/no-store/.test(res.headers()["cache-control"] ?? "")) throw new Error(`cache-control: ${res.headers()["cache-control"]}`);
  await customer.getByRole("heading", { name: /wants to connect to your Tally/ }).waitFor();
  await customer.getByText("post entries into your books").waitFor();
  await customer.getByText("Waiting for the connector").waitFor();
  await customer.close();
});
await step("cancelling the link stops it working", async () => {
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Cancel Acme Industries" }).click();
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await see("Expired or cancelled");
  await page.waitForTimeout(50);
  const state = await (await fetch(`${connectUrl}/state`)).json();
  if (state.status !== "expired") throw new Error(state.status);
  await shot("connections");
});
await step("a second project has its own keys, and the switcher keeps your place", async () => {
  await page.getByRole("button", { name: /^Project:/ }).click();
  await page.getByRole("menuitem", { name: "New project" }).click();
  await page.getByRole("button", { name: "Create project" }).click();
  await see("Enter a project name.");
  await page.getByLabel("Project name").fill("Second app");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByRole("heading", { name: "Second app", level: 1 }).waitFor({ timeout: 10000 });
  await page.getByRole("link", { name: "API keys" }).click();
  await see("No keys yet");
  await page.getByRole("button", { name: /^Project:/ }).click();
  await page.getByRole("menuitem", { name: "Shanoor Realtors" }).click();
  await page.getByText("Billing app").waitFor({ timeout: 10000 });
  await page.waitForURL("**/keys");
});
await step("a project that isn't yours shows not found", async () => {
  const res = await page.goto(`${base}/projects/00000000-0000-4000-8000-000000000000`);
  if (res.status() !== 404) throw new Error(`answered ${res.status()}`);
  await see("We can't find that page");
  await page.goto(`${base}/`);
  await page.getByRole("heading", { name: "Shanoor Realtors" }).waitFor();
});
await step("write jobs and usage start empty", async () => {
  await page.goto(`${base}/`);
  await page.getByRole("link", { name: "Write jobs" }).click();
  await see("No write jobs yet");
  await page.getByRole("link", { name: "Usage" }).click();
  await see("No API calls in this month");
});
await step("a webhook needs an address and at least one event", async () => {
  await page.getByRole("link", { name: "Webhooks" }).click();
  await see("No webhooks yet");
  await page.getByRole("button", { name: "Add webhook" }).click();
  await page.getByRole("button", { name: "Create webhook" }).click();
  await see("Enter a full address");
  await see("Choose at least one event.");
});
await step("plain http is refused with a clear message", async () => {
  await page.getByLabel("Address on your server").fill("http://example.invalid/hook");
  await page.getByLabel("A company connected or was revoked").check();
  await page.getByRole("button", { name: "Create webhook" }).click();
  await see("Webhook URLs must use HTTPS.");
});
await step("a new webhook shows its secret once", async () => {
  await page.getByLabel("Address on your server").fill("https://example.invalid/hook");
  await page.getByRole("button", { name: "Create webhook" }).click();
  await see("Your webhook signing secret");
  const secret = await secretOnScreen();
  if (!secret.startsWith("whsec_")) throw new Error("no secret on screen");
  await shot("webhook-created");
  await page.getByRole("button", { name: "Done" }).click();
  await page.reload();
  await see("https://example.invalid/hook");
  if ((await page.content()).includes(secret)) throw new Error("the secret is still in the page");
});
await step("pausing and resuming works", async () => {
  await page.getByRole("button", { name: "Pause https://example.invalid/hook" }).click();
  await see("Paused.");
  await page.getByRole("button", { name: "Resume https://example.invalid/hook" }).click();
  await page.getByRole("button", { name: "Pause https://example.invalid/hook" }).waitFor();
  await page.getByText("Latest deliveries").click();
  await see("Nothing sent yet");
  await shot("webhooks");
});
await step("deleting a webhook asks first", async () => {
  await page.getByRole("button", { name: "Delete https://example.invalid/hook" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await see("No webhooks yet");
  await page.goto(`${base}/`);
  await page.getByRole("heading", { name: "Shanoor Realtors" }).waitFor();
});
await step("the sidebar collapses to icons and stays that way after a reload", async () => {
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.locator('[data-slot="sidebar"][data-state="collapsed"]').waitFor();
  await page.waitForTimeout(300);
  await shot("sidebar-collapsed");
  await page.reload();
  await page.locator('[data-slot="sidebar"][data-state="collapsed"]').waitFor();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.locator('[data-slot="sidebar"][data-state="expanded"]').waitFor();
});
await step("signing out returns to sign in, and the console stays closed", async () => {
  await page.getByRole("button", { name: /^Account:/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
  await page.goto(`${base}/`);
  await page.waitForURL("**/login");
});
await step("signing up again with that email points to the email field", async () => {
  await page.goto(`${base}/signup`);
  await page.getByLabel("Your name").fill("Asha Rao");
  await page.getByLabel("Company").fill("Other");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await see("already exists");
});
await step("signing back in works", async () => {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Shanoor Realtors" }).waitFor({ timeout: 10000 });
});
await step("the layout holds on a phone, with no sideways scrolling", async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.reload();
  await see("Connected companies");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) throw new Error("page scrolls sideways");
  await shot("overview-mobile");
  for (const section of ["API keys", "Connections", "Write jobs", "Webhooks", "Usage"]) {
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await page.getByRole("link", { name: section }).click();
    await page.getByRole("heading", { name: section, level: 1 }).waitFor();
    await page.waitForLoadState("networkidle");
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error(`${section} scrolls sideways`);
    await shot(`${section.replace(" ", "-").toLowerCase()}-mobile`);
  }
});
await step("docs and pricing open without signing in", async () => {
  const visitor = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const p = await visitor.newPage();
  p.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  await p.goto(`${base}/docs/quickstart`);
  await p.getByRole("heading", { name: "Post a receipt" }).waitFor();
  if (await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error("docs scroll sideways");
  await p.goto(`${base}/pricing`);
  await p.getByRole("heading", { name: "Pricing", level: 1 }).waitFor();
  await p.getByText("Amounts aren't set yet").waitFor();
  if (await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error("pricing scrolls sideways");
  await p.goto(`${base}/connect/not-a-real-token`);
  await p.getByRole("heading", { name: "This link is not valid" }).waitFor();
  await visitor.close();
  const results = await (await fetch(`${base}/api/search?query=idempotency`)).json();
  if (!results.length) throw new Error("docs search found nothing");
});
await step("no script errors anywhere", async () => { if (problems.length) throw new Error(problems.join("; ")); });

await browser.close();
console.log(failed ? `${failed} step(s) failed` : "All steps passed");
process.exit(failed ? 1 : 0);
