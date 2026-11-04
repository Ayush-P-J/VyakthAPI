/** Runs the simulated Tally on its own, for the demo stack. */
import { FakeTally, seedDemoCompany } from "./index.ts";
const t = new FakeTally();
seedDemoCompany(t);
const port = await t.start(Number(process.env.PORT ?? 9000), process.env.HOST ?? "0.0.0.0");
console.log(`Simulated Tally (NOT real TallyPrime) on port ${port}`);
