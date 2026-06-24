import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import gatewayRoutes from "./routes/gateway.route";
import { env } from "./config/service.config";
import { limiter } from "./middleware/ratelimit.middleware";
import { errorHandler } from "./utils/errorHandler.utils";

const app = express();


app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
  })
);

app.use(morgan("combined"));

app.use(limiter);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Gateway healthy",
  });
});

app.use("/", gatewayRoutes);

app.use(errorHandler);

export default app;
