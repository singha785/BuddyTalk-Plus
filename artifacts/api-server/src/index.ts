import { createServer } from "http";
import app from "./app";
import { initSocket } from "./socket";
import { seedMentors } from "./lib/seed";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
  seedMentors().catch((err: unknown) => logger.error({ err }, "Seed failed"));
});
