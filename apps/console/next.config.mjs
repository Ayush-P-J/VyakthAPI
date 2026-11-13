import path from "node:path";
import { createMDX } from "fumadocs-mdx/next";

// Fixed when the image is built, because Next.js bakes rewrites into its build output.
const api = process.env.API_INTERNAL_URL ?? "http://localhost:3000";

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  poweredByHeader: false,
  images: { unoptimized: true },
  // The browser only ever talks to this origin, and only the console's own API is reachable through it.
  async rewrites() {
    return [
      { source: "/console-api/:path*", destination: `${api}/console/v1/:path*` },
      // The customer's connect page reads and approves its link through the API.
      { source: "/connect/:token/:action(state|approve)", destination: `${api}/connect/:token/:action` },
    ];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    }, {
      // The address holds the customer's link token, so it must not leak to other sites.
      source: "/connect/:path*",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
    }];
  },
};
export default createMDX()(config);
