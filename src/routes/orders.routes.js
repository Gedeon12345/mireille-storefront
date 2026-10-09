import { Router } from "express";
import { cancelOrder, createOrder, getOrder, listOrders } from "../controllers/orders.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { createOrderBody, listOrdersQuery, orderParams } from "../validators/order.validators.js";

export const ordersRouter = Router();

// Toutes les routes de commande exigent un compte connecté.
ordersRouter.use(requireAuth);

ordersRouter.post("/", validate({ body: createOrderBody }), createOrder);
ordersRouter.get("/", validate({ query: listOrdersQuery }), listOrders);
ordersRouter.get("/:idOrNumber", validate({ params: orderParams }), getOrder);
ordersRouter.post("/:idOrNumber/cancel", validate({ params: orderParams }), cancelOrder);
