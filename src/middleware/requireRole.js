import { ApiError } from "../utils/ApiError.js";

/** À placer APRÈS requireAuth. Usage : requireRole("admin") */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user.role)) throw ApiError.forbidden("Accès réservé aux administrateurs");
    next();
  };
