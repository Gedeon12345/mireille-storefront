import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start() {
  await connectDatabase(env.MONGODB_URI);

  const app = createApp({
    nodeEnv: env.NODE_ENV,
    corsOrigins: env.CORS_ORIGINS,
    trustProxy: env.TRUST_PROXY,
  });
  const server = app.listen(env.PORT, () => {
    console.log(`API Torque prête sur http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} reçu : arrêt en cours…`);
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Démarrage impossible :", error.message);
  process.exit(1);
});
