"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const client_1 = require("@prisma/client");
require("./queue/order.worker");
require("./queue/demand.worker");
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
const server = http_1.default.createServer(app_1.default);
const PORT = 5002;
server.listen(PORT, () => {
    console.log(`Shopping service running on port ${PORT}`);
});
