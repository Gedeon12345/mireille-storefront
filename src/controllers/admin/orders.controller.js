import { Order } from "../../models/Order.js";
import { User } from "../../models/User.js";
import { changeOrderStatus, orderLookup } from "../../services/orderService.js";
import { ApiError } from "../../utils/ApiError.js";
import { escapeRegExp } from "../../utils/text.js";

const CUSTOMER_FIELDS = "email firstName lastName phone";
const SEARCH_USERS_LIMIT = 100;

/** La recherche `q` porte sur le numéro de commande ou l'e-mail du client. */
async function buildOrderFilter({ status, q }) {
  const filter = {};
  if (status) filter.status = status;

  if (q) {
    const pattern = escapeRegExp(q);
    const matchingUsers = await User.find({ email: { $regex: pattern, $options: "i" } }, "_id").limit(SEARCH_USERS_LIMIT);
    filter.$or = [
      { orderNumber: { $regex: pattern.toUpperCase() } },
      { user: { $in: matchingUsers.map((user) => user._id) } },
    ];
  }
  return filter;
}

export async function listOrders(req, res) {
  const { page, limit, ...criteria } = req.validated.query;
  const filter = await buildOrderFilter(criteria);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", CUSTOMER_FIELDS)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({
    data: orders,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function getOrder(req, res) {
  const order = await Order.findOne(orderLookup(req.validated.params.idOrNumber)).populate("user", CUSTOMER_FIELDS);
  if (!order) throw ApiError.notFound("Commande introuvable");

  res.json({ data: order });
}

export async function updateOrderStatus(req, res) {
  const { status, note } = req.validated.body;
  const order = await changeOrderStatus(req.validated.params.idOrNumber, status, note);

  res.json({ data: order });
}
