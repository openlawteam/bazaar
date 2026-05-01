import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const workspaceRoot = dirname(fileURLToPath(new URL("../../package.json", import.meta.url)));

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
  transpilePackages: ["@bazaar/api", "@bazaar/core", "@bazaar/shopping", "@bazaar/agents", "@bazaar/spacebase"],
};

export default nextConfig;
