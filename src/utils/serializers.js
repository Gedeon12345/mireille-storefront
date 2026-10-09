/** Fiche produit vue par l'administration : la vue publique + la quantité exacte en stock. */
export function toAdminProduct(product) {
  return { ...product.toJSON(), stockQuantity: product.stockQuantity };
}
