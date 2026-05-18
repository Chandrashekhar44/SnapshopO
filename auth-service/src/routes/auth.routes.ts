import { Router } from "express";
import { loginUser, signup } from "../controllers/auth.controller";

const router = Router();

router.post("/login", loginUser);
router.post("/register", signup);

export default router;