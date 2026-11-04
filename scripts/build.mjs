// Bundles each role into one file, so the runtime image needs Node and nothing else.
import { build } from "esbuild";

const shared = {
  bundle: true, platform: "node", format: "esm", target: "node24", minify: true, sourcemap: false, legalComments: "none",
  tsconfig: "tsconfig.base.json",
  // Optional dependencies these libraries probe for and work fine without.
  external: ["@nestjs/microservices", "@nestjs/microservices/*", "@nestjs/websockets", "@nestjs/websockets/*", "class-transformer", "class-transformer/*", "class-validator", "cache-manager", "pg-native", "bufferutil", "utf-8-validate"],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url); import { fileURLToPath as __f } from 'node:url'; const __filename = __f(import.meta.url); const __dirname = __f(new URL('.', import.meta.url));" },
};
await Promise.all([
  build({ ...shared, entryPoints: ["apps/cloud/src/main.ts"], outfile: "dist/cloud.mjs" }),
  build({ ...shared, entryPoints: ["apps/connector/src/cli.ts"], outfile: "dist/connector.mjs" }),
  build({ ...shared, entryPoints: ["packages/fake-tally/src/main.ts"], outfile: "dist/fake-tally.mjs" }),
]);
console.log("Built dist/cloud.mjs, dist/connector.mjs, dist/fake-tally.mjs");
