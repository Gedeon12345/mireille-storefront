import { User } from "../models/User.js";
import { tokenIssuedBeforePasswordChange } from "../services/authRules.js";
import { verifyToken } from "../services/token.js";
import { ApiError } from "../utils/ApiError.js";

/** Exige l'en-tête `Authorization: Bearer <jeton>` et place l'utilisateur dans req.user. */
export async function requireAuth(req, _res, next) {
  const [scheme, token] = (req.get("authorization") ?? "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw ApiError.unauthorized("Authentification requise");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized("Session invalide ou expirée");
  }

  // L'utilisateur est relu en base à chaque requête : un compte désactivé ou supprimé perd l'accès aussitôt.
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || tokenIssuedBeforePasswordChange(payload.iat, user.passwordChangedAt)) {
    throw ApiError.unauthorized("Session invalide ou expirée");
  }

  req.user = user;
  next();
}
