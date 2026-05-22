
import express,{ Express}from "express"
import { searchOrder } from "./controller/order.controller";

const app:Express = express();

app.use(express.json());
app.post("/search",searchOrder);
export default app;