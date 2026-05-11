import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  transpilePackages: ["@millionaire/ui"]
};

export default nextConfig;
