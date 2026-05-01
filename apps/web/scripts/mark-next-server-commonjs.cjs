/**
 * Workaround for https://github.com/vercel/next.js/issues/91661
 *
 * When `apps/web/package.json` declares `"type": "module"`, Node.js will treat
 * every emitted `.next/server/**\/*.js` file as ESM and the CommonJS Vercel
 * launcher (`___next_launcher.cjs`) will throw `ERR_REQUIRE_ESM` at runtime.
 *
 * Next.js generates `.next/package.json` with `{"type": "commonjs"}` to scope
 * its build output back to CJS, but on Vercel deployments using Next.js 16.2.x
 * + Turbopack that boundary file is dropped from the serverless function
 * bundle, so the launcher can fall through to the app's `"type": "module"`.
 *
 * To make the fix resilient to whichever subset of files Vercel's NFT decides
 * to include, drop a `{"type": "commonjs"}` package.json into `.next/` and
 * every directory underneath `.next/server/`. Then no matter which folder ends
 * up in the lambda, Node's nearest-parent-package.json lookup will land on a
 * CJS marker before it can escape to the app package.
 */

const { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const COMMONJS_PACKAGE_JSON = JSON.stringify({ type: "commonjs" }, null, 2) + "\n";

const nextDir = join(__dirname, "..", ".next");
const serverDir = join(nextDir, "server");

function writeMarker(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), COMMONJS_PACKAGE_JSON);
}

function markRecursively(dir) {
  if (!existsSync(dir)) return;
  writeMarker(dir);
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      markRecursively(full);
    }
  }
}

writeMarker(nextDir);
markRecursively(serverDir);
