import express from "express";
import http from "http";
import { initSocket } from "./socket/socket.js";
import "./socket/emitter.js";
import "./config/firebase.js"


const app = express();

app.use(express.json());


const server = http.createServer(app);


initSocket(server);


server.listen(5005,()=>{
    console.log(
      "Notification service running on 5005"
    );
});