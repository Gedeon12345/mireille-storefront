import { z } from "zod";

// "?q=" (chaîne vide) est traité comme "paramètre absent".
const optionalText = (schema) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(80)
  .regex(/^[a-z0-9-]+$/, "slug invalide");

export const listProductsQuery = z.object({
  q: optionalText(z.string().trim().max(100)),
  category: optionalText(slug),
  brand: optionalText(z.string().trim().max(60)),
  sort: z.enum(["relevance", "price-asc", "price-desc", "rating"]).default("relevance"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const productParams = z.object({
  idOrSlug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9-]+$/, "identifiant invalide"),
});

export const categoryParams = z.object({ slug });
