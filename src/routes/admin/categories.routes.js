import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "../../controllers/admin/categories.controller.js";
import { validate } from "../../middleware/validate.js";
import { createCategoryBody, updateCategoryBody } from "../../validators/admin.validators.js";
import { categoryParams } from "../../validators/catalog.validators.js";

export const adminCategoriesRouter = Router();

adminCategoriesRouter.post("/", validate({ body: createCategoryBody }), createCategory);
adminCategoriesRouter.patch("/:slug", validate({ params: categoryParams, body: updateCategoryBody }), updateCategory);
adminCategoriesRouter.delete("/:slug", validate({ params: categoryParams }), deleteCategory);
