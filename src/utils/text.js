/** "Électricité" → "electricite" : minuscules, sans accents. */
export function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** "Bougies d'allumage (jeu de 4)" → "bougies-d-allumage-jeu-de-4" */
export function slugify(text) {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Neutralise les caractères spéciaux avant de fabriquer une expression régulière. */
export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
