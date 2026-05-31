import http from "http";
import express from "express";
import cors from "cors";

import { setupSocket } from "./config/socket";
import router from "./routes/conversation.routes";


const app = express();


app.use(
  cors({
    origin: "http://localhost:3000", 
    credentials: true,
  })
);
app.use(express.json());


app.use("/api/users", router);

app.get("/", (req, res) => {
  res.send("Server is running!");
});


const server = http.createServer(app);


setupSocket(server);


const PORT = process.env.PORT || 5004;

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});