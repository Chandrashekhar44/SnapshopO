import { client } from "../config/redis.config";


const REFRESH_EXPIRY =7 * 24 * 60 * 60;


export const saveRefreshSession = async (
    userId: number,
    sessionId: string,
    hashedToken: string
) => {

    const key =
        `refresh:${userId}:${sessionId}`;


    await client.set(
        key,
        hashedToken,
        "EX",
        REFRESH_EXPIRY
    );
};


export const getRefreshSession = async (
    userId: number,
    sessionId: string
) => {

    return await client.get(
        `refresh:${userId}:${sessionId}`
    );
};


export const deleteRefreshSession = async (
    userId: number,
    sessionId: string
) => {

    return await client.del(
        `refresh:${userId}:${sessionId}`
    );
};