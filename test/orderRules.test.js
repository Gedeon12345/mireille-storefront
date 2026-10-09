import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canTransition,
  computeTotals,
  generateOrderNumber,
  mergeOrderItems,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
} from "../src/services/orderRules.js";

const ID_A = "a".repeat(24);
const ID_B = "b".repeat(24);

test("mergeOrderItems additionne les lignes du même produit", () => {
  const merged = mergeOrderItems([
    { productId: ID_A, quantity: 2 },
    { productId: ID_B, quantity: 1 },
    { productId: ID_A.toUpperCase(), quantity: 3 },
  ]);
  assert.deepEqual(merged, [
    { productId: ID_A, quantity: 5 },
    { productId: ID_B, quantity: 1 },
  ]);
});

test("mergeOrderItems plafonne la quantité d'une ligne à 99", () => {
  const merged = mergeOrderItems([
    { productId: ID_A, quantity: 90 },
    { productId: ID_A, quantity: 90 },
  ]);
  assert.equal(merged[0].quantity, 99);
});

test("computeTotals calcule en centimes entiers", () => {
  const totals = computeTotals(
    [
      { unitPriceCents: 5490, quantity: 3 },
      { unitPriceCents: 1890, quantity: 1 },
    ],
    500,
  );
  assert.deepEqual(totals, { subtotalCents: 18360, shippingCents: 500, totalCents: 18860 });
});

test("computeTotals : livraison offerte par défaut", () => {
  assert.equal(computeTotals([{ unitPriceCents: 1000, quantity: 2 }]).totalCents, 2000);
});

test("generateOrderNumber : format lisible et sans caractères ambigus", () => {
  const number = generateOrderNumber(new Date("2026-09-21T10:00:00Z"));
  assert.match(number, /^TQ-20260921-[A-HJKMNP-Z2-9]{5}$/);
  const many = new Set(Array.from({ length: 200 }, () => generateOrderNumber()));
  assert.ok(many.size > 190, "les numéros varient");
});

test("transitions de statut autorisées", () => {
  assert.equal(canTransition("pending", "confirmed"), true);
  assert.equal(canTransition("pending", "cancelled"), true);
  assert.equal(canTransition("confirmed", "shipped"), true);
  assert.equal(canTransition("shipped", "delivered"), true);
});

test("transitions interdites : sauts, retours en arrière, statuts définitifs", () => {
  assert.equal(canTransition("pending", "shipped"), false);
  assert.equal(canTransition("shipped", "cancelled"), false, "une commande expédiée ne s'annule plus");
  assert.equal(canTransition("delivered", "pending"), false);
  assert.equal(canTransition("cancelled", "confirmed"), false);
  assert.equal(canTransition("pending", "pending"), false);
  assert.equal(canTransition("inconnu", "confirmed"), false);
});

test("chaque statut a une entrée dans la table de transitions", () => {
  assert.deepEqual(Object.keys(ORDER_TRANSITIONS).sort(), [...ORDER_STATUSES].sort());
});
