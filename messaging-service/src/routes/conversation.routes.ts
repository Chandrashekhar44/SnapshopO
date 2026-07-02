import { Router } from "express";
import { findOrCreateConversation, getConversationMessages, getUserThreads } from "../controller/coversation.controller";
import { searchUsers } from "../controller/search.controller";
import { authMiddleware } from "../socket/middleware/auth.middleware";

const router = Router();
router.use(authMiddleware)

router.get("/seller/:sellerId",getUserThreads);
router.get("/conversations/find", findOrCreateConversation);
router.get("/conversation/:id/messages", getConversationMessages);
router.get("/search", searchUsers);

export default router;