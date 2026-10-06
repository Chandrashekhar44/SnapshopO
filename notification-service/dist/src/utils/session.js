import { client } from "../../../auth-service/src/config/redis.config.js";
const REFRESH_EXPIRY = 7 * 24 * 60 * 60;
export const saveRefreshSession = async (userId, sessionId, hashedToken) => {
    const key = `refresh:${userId}:${sessionId}`;
    await client.set(key, hashedToken, "EX", REFRESH_EXPIRY);
};
export const getRefreshSession = async (userId, sessionId) => {
    return await client.get(`refresh:${userId}:${sessionId}`);
};
export const deleteRefreshSession = async (userId, sessionId) => {
    return await client.del(`refresh:${userId}:${sessionId}`);
};
