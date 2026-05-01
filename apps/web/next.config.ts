import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
  transpilePackages: ["@bazaar/api", "@bazaar/core", "@bazaar/shopping", "@bazaar/agents", "@bazaar/spacebase"],
};

export default nextConfig;
