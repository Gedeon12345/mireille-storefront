import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildAdminProductFilter, buildProductFilter, buildSearchText, buildSort } from "../src/services/catalogQuery.js";
import { slugify } from "../src/utils/text.js";

const readJson = (name) => JSON.parse(readFileSync(new URL(`../src/seed/data/${name}.json`, import.meta.url), "utf8"));
const categories = readJson("categories");
const products = readJson("products").map((product) => ({
  ...product,
  isActive: true,
  searchText: buildSearchText(product),
}));

// Mini-évaluateur du sous-ensemble de la syntaxe MongoDB utilisé par buildProductFilter / buildAdminProductFilter.
function matchesCondition(doc, key, condition) {
  if (key === "$and") return condition.every((sub) => matches(doc, sub));
  if (key === "$or") return condition.some((sub) => matches(doc, sub));
  const value = doc[key];
  if (condition && typeof condition === "object" && !Array.isArray(condition)) {
    if ("$in" in condition) {
      return Array.isArray(value) ? value.some((v) => condition.$in.includes(v)) : condition.$in.includes(value);
    }
    if ("$regex" in condition) return new RegExp(condition.$regex).test(value);
    if ("$lte" in condition) return value <= condition.$lte;
  }
  return value === condition;
}
const matches = (doc, filter) => Object.entries(filter).every(([key, cond]) => matchesCondition(doc, key, cond));
const search = (params) => products.filter((p) => matches(p, buildProductFilter(params))).map((p) => p.reference);

test("sans paramètre : tout le catalogue actif", () => {
  assert.equal(search({}).length, 13);
});

test("recherche par mot, sans accents ni casse", () => {
  assert.deepEqual(search({ q: "plaquettes" }), ["TQ-FRN-001", "TQ-FRN-010"]);
  assert.deepEqual(search({ q: "ELECTRICITE" }), ["TQ-ELE-006", "TQ-ELE-012"]);
});

test("tous les mots doivent correspondre", () => {
  assert.deepEqual(search({ q: "corolla frein" }), ["TQ-FRN-001"]);
  assert.deepEqual(search({ q: "zzz" }), []);
});

test("recherche par référence", () => {
  assert.deepEqual(search({ q: "TQ-CLI-009" }), ["TQ-CLI-009"]);
});

test("les caractères spéciaux de la recherche ne cassent pas la requête", () => {
  assert.doesNotThrow(() => search({ q: "(((" }));
  assert.deepEqual(search({ q: ".*" }), []);
});

test("filtre par catégorie", () => {
  assert.deepEqual(search({ category: "freinage" }), ["TQ-FRN-001", "TQ-FRN-004", "TQ-FRN-010"]);
});

test("filtre par marque de véhicule : inclut les pièces universelles", () => {
  assert.deepEqual(search({ brand: "Peugeot" }), [
    "TQ-ECL-003", "TQ-FRN-004", "TQ-ELE-006", "TQ-CLI-009", "TQ-FRN-010", "TQ-ELE-012",
  ]);
});

test("un produit inactif n'est jamais renvoyé", () => {
  const hidden = { ...products[0], isActive: false };
  assert.equal(matches(hidden, buildProductFilter({})), false);
});

test("tri : clé inconnue = pertinence", () => {
  assert.deepEqual(buildSort("nimporte-quoi"), { _id: 1 });
  assert.deepEqual(buildSort("price-asc"), { priceCents: 1, _id: 1 });
});

test("filtre admin : sans critère, tout est visible (archivés compris)", () => {
  assert.deepEqual(buildAdminProductFilter({}), {});
  const archived = { ...products[0], isActive: false };
  assert.equal(matches(archived, buildAdminProductFilter({})), true);
});

test("filtre admin : statut, stock bas et recherche", () => {
  assert.deepEqual(buildAdminProductFilter({ status: "active" }), { isActive: true });
  assert.deepEqual(buildAdminProductFilter({ status: "archived" }), { isActive: false });
  assert.deepEqual(buildAdminProductFilter({ stock: "low" }), { stockQuantity: { $lte: 5 } });
  assert.ok(buildAdminProductFilter({ q: "frein disque" }).$and.length === 2);
});

test("données de seed cohérentes", () => {
  const categorySlugs = categories.map((c) => c.slug);
  assert.equal(new Set(categorySlugs).size, categorySlugs.length, "slugs de catégories uniques");
  assert.equal(new Set(products.map((p) => p.reference)).size, products.length, "références uniques");
  assert.equal(new Set(products.map((p) => slugify(p.name))).size, products.length, "slugs produits uniques");

  for (const p of products) {
    assert.ok(categorySlugs.includes(p.category), `${p.reference} : catégorie inconnue`);
    assert.ok(Number.isInteger(p.priceCents) && p.priceCents > 0, `${p.reference} : prix en centimes entiers`);
    if (p.oldPriceCents) assert.ok(p.oldPriceCents > p.priceCents, `${p.reference} : ancien prix > prix`);
    assert.ok(p.stockQuantity >= 0 && p.rating >= 0 && p.rating <= 5, `${p.reference} : stock et note valides`);
    assert.ok(!p.badge || ["Nouveau", "Promo"].includes(p.badge), `${p.reference} : badge valide`);
  }
});
