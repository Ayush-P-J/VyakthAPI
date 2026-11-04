import pack from "./standard-pack.generated.json" with { type: "json" };
import type { Pack } from "./definition.ts";

export * from "./definition.ts";
export * from "./tree.ts";
export * from "./escape.ts";
export * from "./guards.ts";
export * from "./template.ts";
export * from "./compile.ts";
export * from "./parser.ts";
export * from "./normalise.ts";
export * from "./privacy.ts";
export * from "./discovery.ts";
export * from "./write.ts";
export * from "./bundle.ts";
export * from "./openapi.ts";

export const standardPack = pack as Pack;
