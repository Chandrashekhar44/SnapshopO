import { Router } from "express";
import { getCurrentUser, getMe, loginUser, logoutUser, refreshTokenHandler, signup, updateHandler } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", loginUser);
router.post("/register", signup);
router.post("/logout",authMiddleware,logoutUser);
router.post("/refresh-token", refreshTokenHandler);
router.get("/me", authMiddleware, getMe);
router.patch("/update-info",authMiddleware,updateHandler);

export default router;