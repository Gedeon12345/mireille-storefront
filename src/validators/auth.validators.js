import { z } from "zod";
import { phone } from "./common.validators.js";

const email = z.string().trim().toLowerCase().email("e-mail invalide").max(254);
const newPassword = z.string().min(8, "8 caractères minimum").max(128, "128 caractères maximum");
const existingPassword = z.string().min(1, "mot de passe requis").max(128);
const name = z.string().trim().min(1, "champ requis").max(50);

export const registerBody = z.object({
  email,
  password: newPassword,
  firstName: name,
  lastName: name,
  phone: phone.optional(),
});

export const loginBody = z.object({ email, password: existingPassword });

export const updateProfileBody = z
  .object({ firstName: name.optional(), lastName: name.optional(), phone: phone.optional() })
  .refine((body) => Object.keys(body).length > 0, { message: "aucun champ à modifier" });

export const changePasswordBody = z
  .object({ currentPassword: existingPassword, newPassword })
  .refine((body) => body.currentPassword !== body.newPassword, {
    message: "le nouveau mot de passe doit être différent de l'actuel",
    path: ["newPassword"],
  });
