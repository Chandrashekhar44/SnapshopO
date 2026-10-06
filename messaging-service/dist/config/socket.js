"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = void 0;
const socket_io_1 = require("socket.io");
const socketAuth_1 = require("../socket/middleware/socketAuth");
const message_services_1 = require("../services/message.services");
const setupSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: { origin: "http://localhost:3000", credentials: true },
    });
    io.use(socketAuth_1.socketAuth);
    io.on("connection", (socket) => {
        console.log(`User Connected: ${socket.user.id}`);
        socket.join(`user:${socket.user.id}`);
        (0, message_services_1.negotiationHandler)(io, socket);
        (0, message_services_1.directChatHandler)(io, socket);
        socket.on("disconnect", () => {
            console.log(`User Disconnected: ${socket.user?.id || "unknown"}`);
        });
    });
    return io;
};
exports.setupSocket = setupSocket;
