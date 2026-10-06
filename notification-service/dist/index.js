import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initSocket } from "./socket/socket.js";
import "./socket/emitter.js";
import "./config/firebase.js";
import "./workers/notification.worker.js";
import notificationRouter from "./router/router.js";
const app = express();
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: [
        "GET",
        "POST",
        "PATCH",
        "PUT",
        "DELETE",
        "OPTIONS",
    ],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
    ],
}));
app.use(express.json());
app.use(cookieParser());
app.use("/api/notifications", notificationRouter);
const server = http.createServer(app);
initSocket(server);
server.listen(5005, () => {
    console.log("Notification service running on 5005");
});
