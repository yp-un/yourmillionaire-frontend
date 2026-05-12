import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true
  },
  output: "export",
  trailingSlash: true,
  transpilePackages: ["@millionaire/ui"]
};

export default nextConfig;
