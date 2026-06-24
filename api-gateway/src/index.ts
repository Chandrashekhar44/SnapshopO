import http from "http";
import app from "./app";
import { env } from "./config/service.config";

const server = http.createServer(app);

server.listen(env.PORT, () => {
  console.log(`API Gateway running on port ${env.PORT}`);
});

process.on("SIGINT", () => {
  console.log("Shutting down API Gateway...");

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});