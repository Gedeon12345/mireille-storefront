import { Router } from "express";
import { changePassword, getMe, login, register, updateMe } from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  changePasswordBody,
  loginBody,
  registerBody,
  updateProfileBody,
} from "../validators/auth.validators.js";

export const authRouter = Router();

authRouter.post("/register", authLimiter, validate({ body: registerBody }), register);
authRouter.post("/login", authLimiter, validate({ body: loginBody }), login);
authRouter.get("/me", requireAuth, getMe);
authRouter.patch("/me", requireAuth, validate({ body: updateProfileBody }), updateMe);
authRouter.patch("/password", requireAuth, validate({ body: changePasswordBody }), changePassword);
