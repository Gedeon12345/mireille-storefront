import { Order } from "../../models/Order.js";
import { Product } from "../../models/Product.js";
import { User } from "../../models/User.js";
import { ORDER_STATUSES } from "../../services/orderRules.js";
import { LOW_STOCK_THRESHOLD } from "../../utils/stock.js";

// Le chiffre d'affaires ne compte que les commandes confirmées, expédiées ou livrées.
const REVENUE_STATUSES = ["confirmed", "shipped", "delivered"];

export async function getStats(_req, res) {
  const [statusCounts, revenue, customers, activeProducts, lowStock, outOfStock] = await Promise.all([
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $in: REVENUE_STATUSES } } },
      { $group: { _id: null, totalCents: { $sum: "$totalCents" }, orderCount: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: "customer" }),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, stockQuantity: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } }),
    Product.countDocuments({ isActive: true, stockQuantity: 0 }),
  ]);

  const byStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]));
  for (const { _id, count } of statusCounts) byStatus[_id] = count;

  res.json({
    data: {
      orders: { total: Object.values(byStatus).reduce((sum, count) => sum + count, 0), byStatus },
      revenueCents: revenue[0]?.totalCents ?? 0,
      customers,
      products: { active: activeProducts, lowStock, outOfStock },
    },
  });
}
