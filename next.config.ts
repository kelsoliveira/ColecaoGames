import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  // Os guias ficam em arquivos JSON no repositório; inclui a pasta no pacote publicado das páginas de guia.
  outputFileTracingIncludes: {
    "/guias": ["./guides/**/*.json"],
    "/guias/*": ["./guides/**/*.json"],
  },
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
