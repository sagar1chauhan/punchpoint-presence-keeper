import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./services/socketService.js";
import { initCronJobs } from "./services/cronService.js";
import logger from "./logger/logger.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  const server = http.createServer(app);

  // Initialize Socket.IO
  initSocket(server);

  // Initialize background cron jobs (e.g. missed punch alerts)
  initCronJobs();

  server.listen(PORT, () => {
    logger.info(`PunchPoint Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  });
}

startServer().catch((err) => {
  logger.error(`Fatal error during server startup: ${err.message}`);
  process.exit(1);
});
