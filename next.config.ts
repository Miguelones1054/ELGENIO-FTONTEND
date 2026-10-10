import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: {
    rules: {
      "*.svg": {
        type: "asset",
      },
    },
  },
};

export default nextConfig;
