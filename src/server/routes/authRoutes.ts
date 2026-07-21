import { Router } from "express";
import { register, login, getProfile } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth as any, getProfile as any);

export default router;
