"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPasswordIfNeeded = hashPasswordIfNeeded;
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function hashPasswordIfNeeded(password, currentHash) {
    if (!password)
        return currentHash || '';
    if (currentHash && await bcryptjs_1.default.compare(password, currentHash)) {
        return currentHash;
    }
    return await bcryptjs_1.default.hash(password, 10);
}
async function generateAccessToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user.id,
    }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
}
async function generateRefreshToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user.id,
    }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
}
