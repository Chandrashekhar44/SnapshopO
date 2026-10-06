"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashToken = exports.generateSessionId = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const generateAccessToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        role: user.role
    }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15m"
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (user, sessionId) => {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        sessionId
    }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "7d"
    });
};
exports.generateRefreshToken = generateRefreshToken;
const generateSessionId = () => {
    return crypto_1.default.randomUUID();
};
exports.generateSessionId = generateSessionId;
const hashToken = (token) => {
    return crypto_1.default
        .createHash("sha256")
        .update(token)
        .digest("hex");
};
exports.hashToken = hashToken;
//# sourceMappingURL=userFunction.js.map