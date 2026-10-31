import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  experimental: {
    // /api/* is forwarded to FastAPI; Next cuts that off at 30 s by default, but a new
    // game plan can take up to ~2 min while the Gemini API is overloaded.
    proxyTimeout: 180_000,
  },

  allowedDevOrigins: [
    "172.20.10.*",
    "172.20.10.4",
    "172.20.10.10",
    "172.16.13.84",
  ],

  turbopack: {
    rules: {
      // Apply Tailwind processing only to the global stylesheet.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;