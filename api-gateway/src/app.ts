import express from "express";
import gatewayRoutes from "./routes/gateway.route";
import { limiter } from "./middleware/ratelimit.middleware";
import { verifyToken } from "./middleware/logger.middleware";

const app = express();

app.use(express.json());

app.use(verifyToken); 
app.use(limiter);

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/", gatewayRoutes);

export default app;
