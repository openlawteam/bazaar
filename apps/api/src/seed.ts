import "./env.js";

import { seedDemoMarketplace } from "./db.js";

const result = await seedDemoMarketplace();

if (!result.seeded) {
  console.log("DATABASE_URL is not set. Skipped Neon seed; in-code demo data remains available.");
  console.log(result.counts);
  process.exit(0);
}

console.log("Seeded Bazaar demo marketplace data into Neon.");
console.log(result.counts);
