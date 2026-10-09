import { z } from "zod";

export const phone = z.string().trim().regex(/^[+0-9 ()-]{6,30}$/, "numéro de téléphone invalide");

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "identifiant invalide");

export const pagination = {
  page: z.coerce.number().int().min(1).max(1000).default(1),
};
