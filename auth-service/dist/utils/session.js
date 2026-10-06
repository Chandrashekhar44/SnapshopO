"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRefreshSession = exports.getRefreshSession = exports.saveRefreshSession = void 0;
const redis_config_1 = require("../config/redis.config");
const REFRESH_EXPIRY = 7 * 24 * 60 * 60;
const saveRefreshSession = async (userId, sessionId, hashedToken) => {
    const key = `refresh:${userId}:${sessionId}`;
    await redis_config_1.client.set(key, hashedToken, "EX", REFRESH_EXPIRY);
};
exports.saveRefreshSession = saveRefreshSession;
const getRefreshSession = async (userId, sessionId) => {
    return await redis_config_1.client.get(`refresh:${userId}:${sessionId}`);
};
exports.getRefreshSession = getRefreshSession;
const deleteRefreshSession = async (userId, sessionId) => {
    return await redis_config_1.client.del(`refresh:${userId}:${sessionId}`);
};
exports.deleteRefreshSession = deleteRefreshSession;
//# sourceMappingURL=session.js.map