import express, { Express } from "express";
import authRoutes from "./routes/auth.routes";
import cors from "cors";
import cookieParser from "cookie-parser";

const app: Express = express();

app.use(cookieParser())

app.use(
  cors({
    origin: "https://snapshop-frontend-phi.vercel.app",
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("server is running");
});

export default app;