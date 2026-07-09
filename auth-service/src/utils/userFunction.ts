import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "@prisma/client";


export const generateAccessToken = (user: User) => {
    return jwt.sign(
        {
            id: user.id,
            role: user.role
        },
        process.env.ACCESS_TOKEN_SECRET!,
        {
            expiresIn: "15m"
        }
    );
};


export const generateRefreshToken = (
    user: User,
    sessionId: string
) => {

    return jwt.sign(
        {
            id: user.id,
            sessionId
        },
        process.env.REFRESH_TOKEN_SECRET!,
        {
            expiresIn: "7d"
        }
    );
};


export const generateSessionId = () => {
    return crypto.randomUUID();
};


export const hashToken = (token: string) => {

    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};