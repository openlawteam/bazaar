const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const serverOutputDir = join(__dirname, "..", ".next", "server");

mkdirSync(serverOutputDir, { recursive: true });
writeFileSync(join(serverOutputDir, "package.json"), JSON.stringify({ type: "commonjs" }, null, 2) + "\n");
