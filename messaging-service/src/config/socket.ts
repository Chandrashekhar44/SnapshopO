import { Server, Socket } from "socket.io";
import http from "http";

import { socketAuth } from "../socket/middleware/socketAuth";
import { negotiationHandler } from "../services/message.services";
import { directChatHandler } from "../services/message.services";

export const setupSocket = (
  server: http.Server
) => {

  const io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  
  io.use(socketAuth);

  io.on("connection", (socket: Socket) => {

    console.log(
      `User Connected: ${socket.user.id}`
    );

    
    socket.join(
      `user:${socket.user.id}`
    );

    
    negotiationHandler(io, socket);

    
    directChatHandler(io, socket);

   
    socket.on("disconnect", () => {

      console.log(
        `Disconnected: ${socket.user.id}`
      );

    });
  });

  return io;
};