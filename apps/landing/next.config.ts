import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		unoptimized: true,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cdn.yourmillionaire.kro.kr",
				pathname: "/**",
			},
		],
	},
	output: "export",
	trailingSlash: true,
	transpilePackages: ["@millionaire/ui"],
};

export default nextConfig;
