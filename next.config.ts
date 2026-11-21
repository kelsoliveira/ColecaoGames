import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "*.playstation.net" },
      { protocol: "https", hostname: "*.playstation.com" },
      { protocol: "https", hostname: "*.xboxlive.com" },
      { protocol: "https", hostname: "store-images.s-microsoft.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
