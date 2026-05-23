import express, { Express } from "express";
import authRoutes from "./routes/auth.routes";
import cors from "cors";

const app: Express = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("server is running");
});

export default app;