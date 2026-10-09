import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

// Usage : npm run make-admin -- adresse@email.com          (donne le rôle admin)
//         npm run make-admin -- adresse@email.com --revoke (le retire)
const email = process.argv[2]?.trim().toLowerCase();
const revoke = process.argv.includes("--revoke");

if (!email || email.startsWith("--")) {
  console.error("Usage : npm run make-admin -- adresse@email.com [--revoke]");
  process.exit(1);
}

try {
  await connectDatabase(env.MONGODB_URI);
  const user = await User.findOneAndUpdate({ email }, { role: revoke ? "customer" : "admin" }, { new: true });

  if (!user) {
    console.error("Aucun compte avec cet e-mail : créez-le d'abord via l'inscription (POST /api/auth/register).");
    process.exitCode = 1;
  } else {
    console.log(`${user.email} est maintenant ${revoke ? "client" : "administrateur"}.`);
  }
} catch (error) {
  console.error("Opération impossible :", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
