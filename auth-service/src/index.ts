import http from "http";
import app from "./app";
import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient();

const server = http.createServer(app);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Shopping service running on port ${PORT}`);
});

export { prisma, User };