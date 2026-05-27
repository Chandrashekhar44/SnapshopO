import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import { socketAuth } from "./socket/middleware/socketAuth.js";
import { messageHandler } from "./socket/handlers/messageHandler.js";
import { joinUserRoom } from "./socket/rooms/joinUserRoom.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.use(socketAuth);

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  joinUserRoom(socket);

  messageHandler(io, socket);

  socket.on("disconnect", () => {
    console.log("Disconnected");
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Messaging Service running on ${process.env.PORT}`);
});