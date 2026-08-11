import { authMiddleware } from "../middleware/shopping.middleware";
import { Router } from "express";
import { cancelOrder, confirmOrder, getProduct, listOrders, placeOrder, searchOrder } from "../controller/order.controller";
import { createProduct, uploadImage } from "../controller/seller.controller";
import { upload } from "../configure/multer.configure";

const router = Router();
router.use(authMiddleware)

router.post("/buy/product-search",searchOrder);
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


export default router;