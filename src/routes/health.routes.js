import { Router } from "express";
import mongoose from "mongoose";

export const healthRouter = Router();

// Utile pour les hébergeurs (contrôle de santé) : 503 si la base ne répond plus.
healthRouter.get("/", (_req, res) => {
  const databaseUp = mongoose.connection.readyState === 1;
  res.status(databaseUp ? 200 : 503).json({
    status: databaseUp ? "ok" : "degraded",
    database: databaseUp ? "up" : "down",
    uptimeSeconds: Math.round(process.uptime()),
  });
});
