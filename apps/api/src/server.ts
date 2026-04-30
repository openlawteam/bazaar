import "./env.js";

import { serve } from "@hono/node-server";
import type { Server } from "node:http";

import app from "./app.js";
import { config, describeReadiness } from "./config.js";
import { logger } from "./logger.js";

const port = config.PORT;

const server = serve(
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
) as Server;

const sockets = new Set<import("node:net").Socket>();
server.on("connection", (socket) => {
  sockets.add(socket);
  socket.once("close", () => sockets.delete(socket));
});

let shuttingDown = false;
const shutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("api.shutdown", { signal });

  // Force-close any open sockets so tsx watch can restart promptly.
  for (const socket of sockets) socket.destroy();
  sockets.clear();

  const forceExit = setTimeout(() => {
    logger.warn("api.shutdown.force_exit");
    process.exit(0);
  }, 1500);
  forceExit.unref();

  server.close(() => {
    clearTimeout(forceExit);
    process.exit(0);
  });
};

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGUSR2"] as const) {
  process.on(signal, () => shutdown(signal));
}
