"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const socket_1 = require("./config/socket");
const conversation_routes_1 = __importDefault(require("./routes/conversation.routes"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app = (0, express_1.default)();
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/api/messages", conversation_routes_1.default);
app.get("/", (req, res) => {
    res.send("Server is running!");
});
const server = http_1.default.createServer(app);
(0, socket_1.setupSocket)(server);
const PORT = 5004;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
