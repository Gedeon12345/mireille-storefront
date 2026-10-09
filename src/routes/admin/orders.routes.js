import { Router } from "express";
import { getOrder, listOrders, updateOrderStatus } from "../../controllers/admin/orders.controller.js";
import { validate } from "../../middleware/validate.js";
import { adminOrdersQuery, updateOrderStatusBody } from "../../validators/admin.validators.js";
import { orderParams } from "../../validators/order.validators.js";

export const adminOrdersRouter = Router();

adminOrdersRouter.get("/", validate({ query: adminOrdersQuery }), listOrders);
adminOrdersRouter.get("/:idOrNumber", validate({ params: orderParams }), getOrder);
adminOrdersRouter.patch(
  "/:idOrNumber/status",
  validate({ params: orderParams, body: updateOrderStatusBody }),
  updateOrderStatus,
);
