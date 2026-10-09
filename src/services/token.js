import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const ALGORITHM = "HS256";

/** Le jeton ne contient que l'identifiant de l'utilisateur (claim "sub") : rôle et statut sont relus en base. */
export function signToken(user) {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: ALGORITHM,
  });
}

/** Lève une erreur si le jeton est invalide, expiré ou signé avec un autre algorithme. */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
}
