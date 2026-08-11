
import express,{ Express}from "express"
import shoppingRoutes from "../src/routes/shopping.routes"
import cookieParser from "cookie-parser";
import cors from "cors";

const app:Express = express();

app.use(
    cors({
        origin:"http://localhost:3000",
        credentials:true
    })
)

app.use(express.json());
app.use(cookieParser());   
app.use("/api/products",shoppingRoutes);
export default app;