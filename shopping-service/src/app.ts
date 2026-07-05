
import express,{ Express}from "express"
import shoppingRoutes from "../src/routes/shopping.routes"
import cookieParser from "cookie-parser";

const app:Express = express();

app.use(express.json());
app.use(cookieParser());   
app.use("/api/products",shoppingRoutes);
export default app;