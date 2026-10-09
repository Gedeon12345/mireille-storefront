/** Erreur "attendue" : son message et son code HTTP peuvent être renvoyés au client. */
export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message = "Requête invalide", details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Authentification requise") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Accès refusé") {
    return new ApiError(403, message);
  }

  static conflict(message = "Conflit avec l'état actuel de la ressource", details) {
    return new ApiError(409, message, details);
  }

  static notFound(message = "Ressource introuvable") {
    return new ApiError(404, message);
  }
}
