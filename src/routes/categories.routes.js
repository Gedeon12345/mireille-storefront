import { Router } from "express";
import { getCategory, listCategories } from "../controllers/categories.controller.js";
import { validate } from "../middleware/validate.js";
import { categoryParams } from "../validators/catalog.validators.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", listCategories);
categoriesRouter.get("/:slug", validate({ params: categoryParams }), getCategory);
