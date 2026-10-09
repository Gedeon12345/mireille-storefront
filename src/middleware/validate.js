import { ApiError } from "../utils/ApiError.js";

/**
 * Valide req.params / req.query / req.body avec des schémas zod.
 * Résultat dans req.validated (Express 5 : req.query est en lecture seule, on ne le réécrit pas).
 * Usage : validate({ query: monSchema, params: autreSchema })
 */
export const validate = (schemas) => (req, _res, next) => {
  const validated = {};
  const issues = [];

  for (const [part, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[part]);
    if (result.success) {
      validated[part] = result.data;
    } else {
      issues.push(
        ...result.error.issues.map((issue) => ({
          field: [part, ...issue.path].join("."),
          message: issue.message,
        })),
      );
    }
  }

  if (issues.length > 0) return next(ApiError.badRequest("Paramètres invalides", issues));

  req.validated = validated;
  return next();
};
