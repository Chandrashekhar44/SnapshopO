"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshCookieOptions = exports.accessCookieOptions = void 0;
const isProduction = process.env.NODE_ENV === "production";
exports.accessCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
    path: "/"
};
exports.refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
};
//# sourceMappingURL=cookies.js.map