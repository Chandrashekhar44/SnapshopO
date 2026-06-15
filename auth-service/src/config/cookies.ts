import { CookieOptions } from "express";


const isProduction =
    process.env.NODE_ENV === "production";


export const accessCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
    path: "/"
};


export const refreshCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
};