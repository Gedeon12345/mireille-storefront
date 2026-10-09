import { Router } from "express";
import {
  archiveProduct,
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../../controllers/admin/products.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  adminProductsQuery,
  createProductBody,
  idParams,
  updateProductBody,
} from "../../validators/admin.validators.js";

export const adminProductsRouter = Router();

adminProductsRouter.get("/", validate({ query: adminProductsQuery }), listProducts);
adminProductsRouter.post("/", validate({ body: createProductBody }), createProduct);
adminProductsRouter.get("/:id", validate({ params: idParams }), getProduct);
adminProductsRouter.patch("/:id", validate({ params: idParams, body: updateProductBody }), updateProduct);
adminProductsRouter.delete("/:id", validate({ params: idParams }), archiveProduct);
