// src/socket/socket.ts

import { Server } from "socket.io";
import { socketAuth, AuthenticatedSocket } from "./socketAuth.js";

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  io.use(socketAuth);

  io.on("connection", async (rawSocket) => {
    const socket =
      rawSocket as AuthenticatedSocket;

    const userId = socket.user.id;

    const room = `user_${userId}`;

    socket.join(room);

    console.log(
      `User ${userId} connected: ${socket.id}`
    );

    console.log(
      `User ${userId} joined room ${room}`
    );

    console.log(
      "Rooms:",
      Array.from(socket.rooms)
    );

    socket.on("disconnect", () => {
      console.log(
        `User ${userId} disconnected: ${socket.id}`
      );
    });
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket is not initialized"
    );
  }

  return io;
};