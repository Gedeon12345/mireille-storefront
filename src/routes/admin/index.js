import { Router } from "express";
import { getStats } from "../../controllers/admin/stats.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { adminCategoriesRouter } from "./categories.routes.js";
import { adminOrdersRouter } from "./orders.routes.js";
import { adminProductsRouter } from "./products.routes.js";
import { adminUsersRouter } from "./users.routes.js";

export const adminRouter = Router();

// Tout ce qui est sous /api/admin exige un compte connecté ET le rôle « admin ».
adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/stats", getStats);
adminRouter.use("/products", adminProductsRouter);
adminRouter.use("/categories", adminCategoriesRouter);
adminRouter.use("/orders", adminOrdersRouter);
adminRouter.use("/users", adminUsersRouter);
