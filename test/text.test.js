import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeRegExp, normalizeText, slugify } from "../src/utils/text.js";

test("normalizeText retire accents et majuscules", () => {
  assert.equal(normalizeText("  Électricité "), "electricite");
});

test("slugify produit des slugs propres", () => {
  assert.equal(slugify("Bougies d'allumage (jeu de 4)"), "bougies-d-allumage-jeu-de-4");
  assert.equal(slugify("Pneu 205/55 R16"), "pneu-205-55-r16");
});

test("escapeRegExp neutralise les caractères spéciaux", () => {
  const pattern = new RegExp(escapeRegExp("a.b(c)*"));
  assert.ok(pattern.test("a.b(c)*"));
  assert.ok(!pattern.test("aXb(c)"));
});
