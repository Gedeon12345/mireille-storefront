import { z } from "zod";
import { ORDER_STATUSES } from "../services/orderRules.js";
import { objectId, pagination } from "./common.validators.js";

const text = (min, max) => z.string().trim().min(min, "champ trop court").max(max, "champ trop long");
const slug = z.string().trim().toLowerCase().min(2).max(80).regex(/^[a-z0-9-]+$/, "slug invalide");
const emptyToUndefined = (schema) => z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
const atLeastOneField = { message: "aucun champ à modifier" };

export const idParams = z.object({ id: objectId });

// ---------- produits ----------
const productShape = {
  reference: text(3, 40),
  name: text(2, 120),
  brand: text(1, 60),
  category: slug,
  description: z.string().trim().max(2000),
  // Chemin du site ("/products/x.jpg") ou adresse https. Les adresses "//hote" sont refusées.
  imageUrl: z.string().trim().max(300).regex(/^(\/(?!\/)|https:\/\/)/, "doit commencer par / ou https://"),
  imageAlt: text(2, 200),
  priceCents: z.number().int().min(1).max(100_000_000),
  oldPriceCents: z.number().int().min(1).max(100_000_000).nullable(),
  stockQuantity: z.number().int().min(0).max(1_000_000),
  badge: z.enum(["Nouveau", "Promo"]).nullable(),
  compatibility: z.array(text(1, 60)).max(20),
  compatibleBrands: z.array(text(1, 40)).max(30),
  isActive: z.boolean(),
};

const { description, oldPriceCents, badge, compatibility, compatibleBrands, isActive, ...requiredShape } = productShape;

export const createProductBody = z.object({
  ...requiredShape,
  description: description.optional(),
  oldPriceCents: oldPriceCents.optional(),
  badge: badge.optional(),
  compatibility: compatibility.optional(),
  compatibleBrands: compatibleBrands.optional(),
  isActive: isActive.optional(),
});

// Pour modifier : tous les champs sont facultatifs. null efface oldPriceCents ou badge.
export const updateProductBody = z
  .object(Object.fromEntries(Object.entries(productShape).map(([key, schema]) => [key, schema.optional()])))
  .refine((body) => Object.keys(body).length > 0, atLeastOneField);

export const adminProductsQuery = z.object({
  q: emptyToUndefined(z.string().trim().max(100)),
  category: emptyToUndefined(slug),
  status: z.enum(["all", "active", "archived"]).default("all"),
  stock: emptyToUndefined(z.enum(["low"])),
  ...pagination,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------- catégories ----------
const categoryShape = {
  name: text(2, 60),
  description: z.string().trim().max(200),
  icon: z.string().trim().max(40),
  order: z.number().int().min(0).max(1000),
};

export const createCategoryBody = z.object({
  slug,
  name: categoryShape.name,
  description: categoryShape.description.optional(),
  icon: categoryShape.icon.optional(),
  order: categoryShape.order.optional(),
});

export const updateCategoryBody = z
  .object(Object.fromEntries(Object.entries(categoryShape).map(([key, schema]) => [key, schema.optional()])))
  .refine((body) => Object.keys(body).length > 0, atLeastOneField);

// ---------- commandes ----------
export const adminOrdersQuery = z.object({
  status: emptyToUndefined(z.enum(ORDER_STATUSES)),
  q: emptyToUndefined(z.string().trim().max(100)),
  ...pagination,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateOrderStatusBody = z.object({
  status: z.enum(ORDER_STATUSES),
  note: text(1, 200).optional(),
});

// ---------- utilisateurs ----------
export const adminUsersQuery = z.object({
  q: emptyToUndefined(z.string().trim().max(100)),
  role: emptyToUndefined(z.enum(["customer", "admin"])),
  ...pagination,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateUserStatusBody = z.object({ isActive: z.boolean() });
