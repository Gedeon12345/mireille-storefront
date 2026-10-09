import { Router } from "express";
import { listUsers, updateUserStatus } from "../../controllers/admin/users.controller.js";
import { validate } from "../../middleware/validate.js";
import { adminUsersQuery, idParams, updateUserStatusBody } from "../../validators/admin.validators.js";

export const adminUsersRouter = Router();

adminUsersRouter.get("/", validate({ query: adminUsersQuery }), listUsers);
adminUsersRouter.patch("/:id/status", validate({ params: idParams, body: updateUserStatusBody }), updateUserStatus);
