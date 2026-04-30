import { serve } from "@hono/node-server";

import app from "./app.js";
import { config, describeReadiness } from "./config.js";
import { logger } from "./logger.js";

const port = config.PORT;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info("api.listening", {
      url: `http://localhost:${info.port}`,
      readiness: describeReadiness(),
    });
  },
);
