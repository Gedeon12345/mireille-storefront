import { z } from "zod";
import { MAX_QUANTITY_PER_LINE } from "../services/orderRules.js";
import { objectId, pagination, phone } from "./common.validators.js";

const orderItem = z.object({
  productId: objectId,
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
});

const text = (min, max) => z.string().trim().min(min, "champ trop court").max(max, "champ trop long");

const shippingAddress = z.object({
  fullName: text(2, 100),
  phone,
  line1: text(5, 150),
  line2: text(1, 150).optional(),
  city: text(2, 80),
  postalCode: text(1, 20).optional(),
  country: text(2, 60),
});

export const createOrderBody = z.object({
  items: z.array(orderItem).min(1, "le panier est vide").max(50, "50 lignes maximum"),
  shippingAddress,
  note: text(1, 500).optional(),
});

export const orderParams = z.object({
  idOrNumber: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-zA-Z0-9-]+$/, "identifiant invalide"),
});

export const listOrdersQuery = z.object({
  ...pagination,
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
