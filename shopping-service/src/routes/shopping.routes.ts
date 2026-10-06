import { authMiddleware } from "../middleware/shopping.middleware";
import { Router } from "express";
import { cancelOrder, confirmOrder, getProduct, listOrders, placeOrder, search, searchProduct } from "../controller/order.controller";
import { createProduct, seedListings, uploadImage } from "../controller/seller.controller";
import { upload } from "../configure/multer.configure";
import { saveDeviceToken } from "../controller/deviceToken.controller";
import { completedOrders, fulfillOrders, getSellerDashboardStats } from "../controller/dashboard.controller";

const router = Router();
router.use(authMiddleware)

router.get("/buy/product-search",search);
router.post("/place-order",placeOrder);
router.patch("/confirm-order/:id",confirmOrder);
router.get("/my-orders",listOrders);
router.post("cancel-order",cancelOrder);
router.post("/sell/adding-product",createProduct)
router.post(
  "/uploadImage",
  upload.array("images", 5),
  uploadImage
);
router.get("/product/:id",getProduct)
router.get("/request-order",searchProduct)
router.post("/device-token",saveDeviceToken)
router.get("/stats",getSellerDashboardStats);
router.get("/pendingOrder-stats",fulfillOrders)
router.get("/completedOrders",completedOrders)
router.get("/seedListings",seedListings);


export default router;