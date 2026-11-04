import path from "node:path";
import type { NextConfig } from "next";

// Fixed when the image is built, because Next.js bakes rewrites into its build output.
const api = process.env.API_INTERNAL_URL ?? "http://localhost:3000";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  poweredByHeader: false,
  images: { unoptimized: true },
  // The browser only ever talks to this origin, and only the console's own API is reachable through it.
  async rewrites() {
    return [{ source: "/console-api/:path*", destination: `${api}/console/v1/:path*` }];
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
    }];
  },
};
export default config;
