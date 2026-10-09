import { randomInt } from "node:crypto";

export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
export const MAX_QUANTITY_PER_LINE = 99;

// Statuts qu'une commande peut prendre depuis chaque statut. « delivered » et « cancelled » sont définitifs.
export const ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const canTransition = (from, to) => ORDER_TRANSITIONS[from]?.includes(to) ?? false;

// Alphabet sans caractères ambigus (pas de 0/O ni 1/I/L) : facile à dicter au téléphone.
const ORDER_NUMBER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Fusionne les lignes qui concernent le même produit (le client a pu l'ajouter deux fois). */
export function mergeOrderItems(items) {
  const quantities = new Map();
  for (const { productId, quantity } of items) {
    const key = productId.toLowerCase();
    quantities.set(key, (quantities.get(key) ?? 0) + quantity);
  }
  return [...quantities].map(([productId, quantity]) => ({
    productId,
    quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE),
  }));
}

/** lines : [{ unitPriceCents, quantity }] → totaux entiers en centimes. */
export function computeTotals(lines, shippingCents = 0) {
  const subtotalCents = lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0);
  return { subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}

/** "TQ-20260921-K7M2X" : date + 5 caractères aléatoires (l'unicité finale est garantie par l'index). */
export function generateOrderNumber(date = new Date()) {
  const day = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Array.from({ length: 5 }, () => ORDER_NUMBER_ALPHABET[randomInt(ORDER_NUMBER_ALPHABET.length)]).join("");
  return `TQ-${day}-${suffix}`;
}
