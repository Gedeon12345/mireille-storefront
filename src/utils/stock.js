export const LOW_STOCK_THRESHOLD = 5;

export function getStockStatus(quantity) {
  if (quantity <= 0) return "out-of-stock";
  return quantity <= LOW_STOCK_THRESHOLD ? "low-stock" : "in-stock";
}
