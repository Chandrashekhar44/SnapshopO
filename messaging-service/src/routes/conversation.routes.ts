import { Router } from "express";
import { findOrCreateConversation, getConversationMessages, getUserThreads } from "../controller/coversation.controller";
import { searchUsers } from "../controller/search.controller";

const router = Router();

router.get("/seller/:sellerId", getUserThreads);
router.get("/conversations/find", findOrCreateConversation);
router.get("/conversations/:id/messages", getConversationMessages);
router.get("/search", searchUsers);

export default router;