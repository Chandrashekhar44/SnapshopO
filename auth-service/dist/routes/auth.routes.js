"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const password_controller_1 = require("../controllers/password.controller");
const router = (0, express_1.Router)();
router.post("/login", auth_controller_1.loginUser);
router.post("/register", auth_controller_1.signup);
router.post("/logout", auth_middleware_1.authMiddleware, auth_controller_1.logoutUser);
router.post("/refresh-token", auth_controller_1.refreshTokenHandler);
router.get("/me", auth_middleware_1.authMiddleware, auth_controller_1.getMe);
router.patch("/update-info", auth_middleware_1.authMiddleware, auth_controller_1.updateHandler);
router.patch("/change-password", auth_middleware_1.authMiddleware, password_controller_1.passwordChange);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map