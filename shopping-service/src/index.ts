import http from "http";
import app from "./app.js";
import { initSocket } from "./socket/socket.js";
import { User,PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const server = http.createServer(app);
initSocket(server);

export { prisma,User };
