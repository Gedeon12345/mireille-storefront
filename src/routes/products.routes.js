import { Router } from "express";
import { getProduct, getRelatedProducts, listProducts } from "../controllers/products.controller.js";
import { validate } from "../middleware/validate.js";
import { listProductsQuery, productParams } from "../validators/catalog.validators.js";

export const productsRouter = Router();

productsRouter.get("/", validate({ query: listProductsQuery }), listProducts);
productsRouter.get("/:idOrSlug", validate({ params: productParams }), getProduct);
productsRouter.get("/:idOrSlug/related", validate({ params: productParams }), getRelatedProducts);
