import { rateLimit } from "express-rate-limit";

/** Freine le brute-force : 20 tentatives ÉCHOUÉES par IP et par 15 minutes (les succès ne comptent pas). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Trop de tentatives, réessayez dans quelques minutes" } },
});
