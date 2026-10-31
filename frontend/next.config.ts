import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  allowedDevOrigins: [
    "172.20.10.*",
    "172.20.10.4",
    "172.20.10.10",
    "172.16.13.84",
  ],

  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // API forwarding happens at request time in src/app/api/[...path]/route.ts.
  // Service bindings are unavailable while this configuration is evaluated.
};

export default nextConfig;
