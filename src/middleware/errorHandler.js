import { ApiError } from "../utils/ApiError.js";

/** Format unique des erreurs : { error: { message, details? } } */
export function errorHandler(isProduction) {
  // eslint-disable-next-line no-unused-vars
  return (err, _req, res, _next) => {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        error: { message: err.message, ...(err.details && { details: err.details }) },
      });
    }

    // Violation d'un index unique (ex. e-mail déjà utilisé).
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0];
      const message =
        field === "email"
          ? "Un compte existe déjà avec cet e-mail"
          : `Cette valeur existe déjà${field ? ` (${field})` : ""}`;
      return res.status(409).json({ error: { message } });
    }

    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: { message: "Corps de requête JSON invalide" } });
    }
    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: { message: "Corps de requête trop volumineux" } });
    }

    console.error(err);
    return res.status(500).json({
      error: { message: isProduction ? "Erreur interne du serveur" : err.message },
    });
  };
}
