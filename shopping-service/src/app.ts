
import express,{ Express}from "express"
import shoppingRoutes from "./routes/shopping.routes"
import cookieParser from "cookie-parser";
import cors from "cors";

const app:Express = express();

app.use(
    cors({
        origin:"https://snapshop-frontend-phi.vercel.app/",
        credentials:true
    })
)

app.use(express.json());
app.use(cookieParser());   
app.use("/api/products",shoppingRoutes);
export default app;