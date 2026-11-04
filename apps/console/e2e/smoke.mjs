// Drives the running console in a real browser. Usage: node e2e/smoke.mjs [console-url] [screenshot-dir]
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3001";
const shots = process.argv[3];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
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
await step("signing out returns to sign in, and the console stays closed", async () => {
  await page.getByRole("button", { name: "Sign out" }).click();
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
});
await step("no script errors anywhere", async () => { if (problems.length) throw new Error(problems.join("; ")); });

await browser.close();
console.log(failed ? `${failed} step(s) failed` : "All steps passed");
process.exit(failed ? 1 : 0);
