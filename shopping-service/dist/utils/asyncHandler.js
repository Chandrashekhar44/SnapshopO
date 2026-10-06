"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const asynchandler = (requesthandler) => {
    return (req, res, next) => {
        Promise.resolve(requesthandler(req, res, next)).catch((err) => next(err));
    };
};
exports.default = asynchandler;
