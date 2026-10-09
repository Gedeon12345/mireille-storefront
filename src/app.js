import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { apiRouter } from "./routes/index.js";

/** Construit l'application Express (sans la démarrer : plus simple à tester). */
export function createApp({ nodeEnv, corsOrigins, trustProxy }) {
  const isProduction = nodeEnv === "production";
  const app = express();

  if (trustProxy) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: "10kb" }));
  if (nodeEnv !== "test") app.use(morgan(isProduction ? "combined" : "dev"));

  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { message: "Trop de requêtes, réessayez dans quelques minutes" } },
    }),
    apiRouter,
  );

  app.use(notFound);
  app.use(errorHandler(isProduction));

  return app;
}
