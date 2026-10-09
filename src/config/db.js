import mongoose from "mongoose";

function explainConnectionError(error) {
  if (error.code === 8000 || /auth/i.test(error.message)) {
    return "Authentification MongoDB refusée : vérifiez l'utilisateur et le mot de passe dans MONGODB_URI (caractères spéciaux à encoder, pas de < > autour du mot de passe).";
  }
  if (error.name === "MongooseServerSelectionError") {
    return "Serveur MongoDB injoignable : vérifiez l'URI, votre connexion internet et l'adresse IP autorisée dans Atlas (Network Access).";
  }
  return error.message;
}

export async function connectDatabase(uri) {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch (error) {
    throw new Error(explainConnectionError(error), { cause: error });
  }
  console.log("MongoDB connecté");
}
