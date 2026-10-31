import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  // Laptops that serve the app to phones. 172.20.10.* covers any laptop on an iPhone
  // hotspot (Miras's demo Mac is 172.20.10.4); 172.16.13.84 is the venue Wi-Fi.
  // Check a laptop's address with: ipconfig getifaddr en0
  allowedDevOrigins: ["172.20.10.*", "172.20.10.4", "172.20.10.10", "172.16.13.84"],

  turbopack: {
    rules: {
      "*.css": {
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