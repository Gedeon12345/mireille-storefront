import { Order } from "../models/Order.js";
import { cancelOwnOrder, createOrder as placeOrder, orderLookup } from "../services/orderService.js";
import { ApiError } from "../utils/ApiError.js";

export async function createOrder(req, res) {
  const order = await placeOrder({ userId: req.user._id, ...req.validated.body });
  res.status(201).json({ data: order });
}

export async function listOrders(req, res) {
  const { page, limit } = req.validated.query;
  const filter = { user: req.user._id };

  const [orders, total] = await Promise.all([
    Order.find(filter)
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
  // La commande d'un autre client répond "introuvable" (404) et non "interdit" : on ne révèle pas son existence.
  const order = await Order.findOne({ ...orderLookup(req.validated.params.idOrNumber), user: req.user._id });
  if (!order) throw ApiError.notFound("Commande introuvable");

  res.json({ data: order });
}

export async function cancelOrder(req, res) {
  const order = await cancelOwnOrder(req.user._id, req.validated.params.idOrNumber);
  res.json({ data: order });
}
