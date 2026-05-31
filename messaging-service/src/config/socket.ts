import { Server, Socket } from "socket.io";
import { socketAuth } from "../socket/middleware/socketAuth";
import { negotiationHandler, directChatHandler } from "../services/message.services";



export const setupSocket = (server: any) => {
  const io = new Server(server, {
    cors: { origin: "http://localhost:3000", credentials: true },
  });

  io.use(socketAuth);

  io.on("connection", (socket: Socket) => {
    console.log(`User Connected: ${socket.user.id}`);

    socket.join(`user:${socket.user.id}`);

    negotiationHandler(io, socket);
    directChatHandler(io, socket);

    socket.on("disconnect", () => {
      console.log(`User Disconnected: ${socket.user?.id || "unknown"}`);
    });
  });

  return io;
};