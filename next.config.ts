import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

if (
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_BUILD_MODE === "ssr"
) {
  initOpenNextCloudflareForDev();
}

const isSsrBuild = process.env.NEXT_BUILD_MODE === "ssr";

const nextConfig: NextConfig = {
  ...(isSsrBuild ? {} : { output: "export" }),
  turbopack: {
    root: process.cwd(),
    rules: {
      "globals.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  webpack(config) {
    config.module.rules.push({ test: /[\/]src[\/]app[\/]globals\.css$/, enforce: 'pre', use: [{loader: `${process.cwd()}/scripts/tailwind-webpack-loader.cjs`}] });
    return config;
  },
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
