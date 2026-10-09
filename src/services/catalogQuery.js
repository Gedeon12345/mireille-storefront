import { LOW_STOCK_THRESHOLD } from "../utils/stock.js";
import { escapeRegExp, normalizeText } from "../utils/text.js";

/** Texte normalisé dans lequel la recherche cherche chaque mot saisi. */
export function buildSearchText({ name, brand, category, reference, compatibility = [] }) {
  return normalizeText([name, brand, category, reference, ...compatibility].join(" "));
}

export const SORTS = {
  relevance: { _id: 1 },
  "price-asc": { priceCents: 1, _id: 1 },
  "price-desc": { priceCents: -1, _id: 1 },
  rating: { rating: -1, reviewCount: -1, _id: 1 },
};

export function buildSort(sortKey) {
  return SORTS[sortKey] ?? SORTS.relevance;
}

/** Un critère par mot saisi : tous doivent se retrouver dans le texte normalisé de la fiche. */
function searchClauses(q) {
  const words = q ? normalizeText(q).split(/\s+/).filter(Boolean) : [];
  return words.map((word) => ({ searchText: { $regex: escapeRegExp(word) } }));
}

/**
 * Filtre MongoDB du catalogue PUBLIC :
 * - q : tous les mots saisis doivent apparaître dans la fiche (sans accents ni casse) ;
 * - category : slug de catégorie ;
 * - brand : marque de véhicule (ou marque de la pièce) — les pièces universelles ("*") sont incluses.
 */
export function buildProductFilter({ q, category, brand } = {}) {
  const filter = { isActive: true };

  if (category) filter.category = category;
  if (brand) filter.$or = [{ brand }, { compatibleBrands: { $in: [brand, "*"] } }];

  const clauses = searchClauses(q);
  if (clauses.length > 0) filter.$and = clauses;

  return filter;
}

/** Filtre de l'administration : voit aussi les produits archivés ; stock="low" = stock limité ou épuisé. */
export function buildAdminProductFilter({ q, category, status = "all", stock } = {}) {
  const filter = {};

  if (category) filter.category = category;
  if (status === "active") filter.isActive = true;
  if (status === "archived") filter.isActive = false;
  if (stock === "low") filter.stockQuantity = { $lte: LOW_STOCK_THRESHOLD };

  const clauses = searchClauses(q);
  if (clauses.length > 0) filter.$and = clauses;

  return filter;
}
